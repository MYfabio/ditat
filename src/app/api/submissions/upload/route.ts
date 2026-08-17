import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractTextFromImage } from "@/lib/ai/ocr";
import { evaluateSubmission } from "@/lib/ai/evaluate-submission";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autoritzat." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { dictationId, photoDataUrl } = body as { dictationId?: string; photoDataUrl?: string };

  if (!dictationId || !photoDataUrl) {
    return NextResponse.json(
      { error: "Falten els camps dictationId i photoDataUrl." },
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
        photoUrl: photoDataUrl,
        status: "OCR_PROCESSING",
      },
    });

    const ocr = await extractTextFromImage(photoDataUrl);
    const evaluation = await evaluateSubmission(dictation.rawText, ocr.text);

    const updated = await prisma.submission.update({
      where: { id: submission.id },
      data: {
        ocrText: ocr.text,
        correctedData: { errors: evaluation.errors, feedback: evaluation.feedback },
        score: evaluation.score,
        status: "EVALUATED",
      },
    });

    return NextResponse.json({
      submission: updated,
      mocked: ocr.mocked || evaluation.mocked,
    });
  } catch {
    return NextResponse.json(
      { error: "Base de dades no configurada (DATABASE_URL). No s'ha pogut desar l'entrega." },
      { status: 503 }
    );
  }
}
