import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractTextFromImage, type OcrWord } from "@/lib/ai/ocr";
import { evaluateSubmission } from "@/lib/ai/evaluate-submission";
import { buildAnnotations } from "@/lib/annotations";
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

    // Marques per dibuixar sobre la foto. Nomes surten si l'OCR ha pogut situar
    // les paraules: amb el teclat no hi ha res on dibuixar.
    const annotations = buildAnnotations(evaluation.errors, words);

    // Primer es tanca la correcció, i només després es calcula el perfil: així
    // el perfil ja compta aquest dictat i pot dir en què ha millorat l'alumne.
    await prisma.submission.update({
      where: { id: submission.id },
      data: { ocrText: text, score: evaluation.score, status: "EVALUATED" },
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
          errors: evaluation.errors,
          feedback: evaluation.feedback,
          annotations,
          progress,
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
