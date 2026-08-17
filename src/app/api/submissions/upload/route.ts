import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractTextFromImage } from "@/lib/ai/ocr";
import { evaluateSubmission } from "@/lib/ai/evaluate-submission";
import { refreshLearningProfile } from "@/lib/adaptive-dictations";

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
    const studentText = typed ?? (await extractTextFromImage(photoDataUrl!));
    const text = typeof studentText === "string" ? studentText : studentText.text;
    const ocrMocked = typeof studentText === "string" ? false : studentText.mocked;

    const evaluation = await evaluateSubmission(dictation.rawText, text);

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        ocrText: text,
        correctedData: { errors: evaluation.errors, feedback: evaluation.feedback },
        score: evaluation.score,
        status: "EVALUATED",
      },
    });

    // Actualitza el perfil d'aprenentatge i prepara el següent dictat adaptat.
    // Si falla, l'entrega ja esta desada: no ha de trencar la resposta a l'alumne.
    const profile = await refreshLearningProfile(session.user.id).catch(() => null);

    return NextResponse.json({
      submission: updated,
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
