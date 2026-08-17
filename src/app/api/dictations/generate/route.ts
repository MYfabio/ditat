import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateDictationText } from "@/lib/ai/generate-dictation";
import { generateAudioDataUrl } from "@/lib/ai/generate-audio";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { gradeLevel, targetRule, neeAdaptation, classGroupId, preview, withAudio } = body as {
    gradeLevel?: string;
    targetRule?: string;
    neeAdaptation?: "cap" | "tdah" | "dislexia";
    classGroupId?: string;
    preview?: boolean;
    withAudio?: boolean;
  };

  if (!gradeLevel || !targetRule) {
    return NextResponse.json(
      { error: "Falten els camps gradeLevel i targetRule." },
      { status: 400 }
    );
  }

  const { text, title, mocked } = await generateDictationText({
    gradeLevel,
    targetRule,
    neeAdaptation,
  });

  // El widget public de la landing nomes vol el text, sense persistir res a la BD.
  if (preview) {
    return NextResponse.json({ title, text, mocked });
  }

  const session = await auth();
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "No autoritzat." }, { status: 401 });
  }

  const audioUrl = withAudio ? await generateAudioDataUrl(text) : null;

  try {
    const dictation = await prisma.dictation.create({
      data: {
        title,
        targetRule,
        gradeLevel,
        rawText: text,
        audioUrl,
        isAIGenerated: true,
        teacherId: session.user.id,
        classGroupId: classGroupId || null,
      },
    });
    return NextResponse.json({ dictation, mocked, audioMocked: withAudio && !audioUrl });
  } catch {
    return NextResponse.json(
      {
        error: "Base de dades no configurada (DATABASE_URL). El text s'ha generat pero no s'ha desat.",
        preview: { title, text, mocked },
      },
      { status: 503 }
    );
  }
}
