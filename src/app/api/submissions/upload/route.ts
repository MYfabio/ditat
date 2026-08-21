import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractTextFromImage, type OcrWord } from "@/lib/ai/ocr";
import { evaluateSubmission } from "@/lib/ai/evaluate-submission";
import { buildAnnotations } from "@/lib/annotations";
import { classifyErrors, CLASSIFIER_VERSION } from "@/lib/error-classification";
import { countWords } from "@/lib/dictation-rules";
import { loadLearningProfile, refreshLearningProfile } from "@/lib/adaptive-dictations";
import { progressNote } from "@/lib/learning-profile";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autoritzat." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { dictationId, photoDataUrl, typedText } = body as {
    dictationId?: string;
    photoDataUrl?: string;
    typedText?: string;
  };

  const typed = typedText?.trim();

  // Una foto de mobil ronda els 2-4 MB en base64. El limit deixa passar les
  // fotos de debo i atura que algu ompli la base de dades enviant fitxers
  // enormes, que a mes es paguen dos cops: emmagatzematge i OCR.
  const MIDA_MAXIMA_FOTO = 8 * 1024 * 1024;
  if (photoDataUrl) {
    if (!/^data:image\/(jpeg|jpg|png|webp|heic|heif);base64,/i.test(photoDataUrl)) {
      return NextResponse.json(
        { error: "El fitxer no sembla una imatge." },
        { status: 400 }
      );
    }
    if (photoDataUrl.length > MIDA_MAXIMA_FOTO) {
      return NextResponse.json(
        { error: "La imatge és massa gran. Fes-la amb menys resolució." },
        { status: 413 }
      );
    }
  }

  if (!dictationId || (!photoDataUrl && !typed)) {
    return NextResponse.json(
      { error: "Cal enviar una foto del dictat o el text escrit amb el teclat." },
      { status: 400 }
    );
  }

  try {
    const dictation = await prisma.dictation.findUnique({ where: { id: dictationId } });
    if (!dictation) {
      return NextResponse.json({ error: "Dictat no trobat." }, { status: 404 });
    }

    // Nomes es pot entregar un dictat que t'han posat a tu. Sense aixo, qui
    // tingui un compte pot entregar contra l'identificador d'un dictat de
    // qualsevol altre centre: es crearia una entrega penjada d'aquell dictat i,
    // pitjor, la correccio li tornaria les paraules del text original. Es a
    // dir, una manera de llegir els dictats d'una escola on no ets.
    const potEntregar =
      dictation.targetStudentId === session.user.id ||
      (dictation.targetStudentId === null &&
        dictation.classGroupId !== null &&
        dictation.classGroupId === session.user.classGroupId) ||
      // El docent que l'ha creat pot provar-lo abans de posar-lo a la classe.
      dictation.teacherId === session.user.id ||
      session.user.role === "SUPERADMIN";
    if (!potEntregar) {
      return NextResponse.json({ error: "Aquest dictat no és teu." }, { status: 403 });
    }

    // Com estava l'alumne abans d'aquest dictat, per poder-li dir despres en
    // que ha millorat. Es llegeix ara perque d'aqui a un moment ja no hi sera.
    const profileBefore = await loadLearningProfile(session.user.id).catch(() => null);

    const submission = await prisma.submission.create({
      data: {
        dictationId,
        studentId: session.user.id,
        photoUrl: typed ? null : photoDataUrl,
        inputMethod: typed ? "KEYBOARD" : "PHOTO",
        status: typed ? "AI_EVALUATING" : "OCR_PROCESSING",
      },
    });

    // El text escrit amb el teclat ja es definitiu: només les fotos passen per OCR.
    let text = typed ?? "";
    let ocrMocked = false;
    let words: OcrWord[] = [];
    if (!typed) {
      const ocr = await extractTextFromImage(photoDataUrl!);
      text = ocr.text;
      words = ocr.words;
      ocrMocked = ocr.mocked;
    }

    const evaluation = await evaluateSubmission(dictation.rawText, text);

    // Amb quina seguretat va llegir l'OCR cada paraula. Amb teclat sempre es 1:
    // el text es exactament el que va escriure l'alumne.
    const confidenceByWord = new Map(
      words.map((w) => [w.text.toLowerCase(), w.confidence])
    );
    const errors = classifyErrors(
      evaluation.errors,
      dictation.targetRule,
      (word) => confidenceByWord.get(word.toLowerCase()) ?? 1
    );

    // Una lectura dubtosa no pot baixar la nota: es torna a comptar deixant
    // fora els errors que no es donen per bons. Nomes hi entra quan n'hi ha,
    // perque si l'OCR ho ha llegit tot clar la correccio ja era correcta.
    const uncertain = errors.filter((e) => !e.countForLearning);
    const totalWords = Math.max(countWords(dictation.rawText), 1);
    const score = uncertain.length
      ? Math.max(
          0,
          Math.round(((totalWords - (errors.length - uncertain.length)) / totalWords) * 100)
        )
      : evaluation.score;

    // Marques per dibuixar sobre la foto. Nomes surten si l'OCR ha pogut situar
    // les paraules: amb el teclat no hi ha res on dibuixar.
    const annotations = buildAnnotations(errors, words);

    // Primer es tanca la correcció, i només després es calcula el perfil: així
    // el perfil ja compta aquest dictat i pot dir en què ha millorat l'alumne.
    await prisma.submission.update({
      where: { id: submission.id },
      data: { ocrText: text, score, status: "EVALUATED" },
    });

    // Actualitza el perfil d'aprenentatge i prepara el següent dictat adaptat.
    // Si falla, l'entrega ja esta desada: no ha de trencar la resposta a l'alumne.
    const profile = await refreshLearningProfile(session.user.id).catch(() => null);

    const progress =
      profileBefore && profile
        ? progressNote(profileBefore, profile, dictation.targetRule)
        : null;

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        correctedData: {
          errors,
          feedback: evaluation.feedback,
          annotations,
          progress,
          // Amb quines regles es va classificar, per poder reclassificar el dia
          // que canviin sense confondre correccions velles amb noves.
          classifierVersion: CLASSIFIER_VERSION,
          uncertainCount: uncertain.length,
        },
      },
    });

    // Un dictat personalitzat es d'un sol alumne i d'un sol us: un cop entregat
    // la seva locucio no la tornara a escoltar ningu, i son uns quants megues.
    if (dictation.targetStudentId) {
      await prisma.dictationAudio
        .deleteMany({ where: { dictationId: dictation.id } })
        .catch(() => null);
    }

    return NextResponse.json({
      submission: updated,
      annotations,
      progress,
      // Quantes paraules l'OCR no ha sabut llegir prou be per corregir-les.
      uncertain: uncertain.length,
      mocked: ocrMocked || evaluation.mocked,
      profile: profile && {
        averageScore: profile.averageScore,
        weakestRule: profile.weakestRule,
        curriculumProgress: profile.curriculumProgress,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Base de dades no configurada (DATABASE_URL). No s'ha pogut desar l'entrega." },
      { status: 503 }
    );
  }
}
