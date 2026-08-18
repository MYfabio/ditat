import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateDictationText } from "@/lib/ai/generate-dictation";
import { generateAudioDataUrl } from "@/lib/ai/generate-audio";
import { parsePlaybackSettings } from "@/lib/playback-settings";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const {
    gradeLevel,
    targetRule,
    neeAdaptation,
    classGroupId,
    preview,
    withAudio,
    playback,
  } = body as {
    gradeLevel?: string;
    targetRule?: string;
    neeAdaptation?: "cap" | "tdah" | "dislexia";
    classGroupId?: string;
    preview?: boolean;
    withAudio?: boolean;
    playback?: unknown;
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

  // El widget públic de la landing només vol el text, sense persistir res a la BD.
  if (preview) {
    return NextResponse.json({ title, text, mocked });
  }

  const session = await auth();
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "No autoritzat." }, { status: 401 });
  }

  const settings = parsePlaybackSettings(playback);

  // Amb ritme lent la locució es demana més pausada al servei de veu; la
  // velocitat fina l'ajusta després el reproductor del navegador.
  const audio = withAudio
    ? await generateAudioDataUrl(text, settings.defaultSpeed < 1 ? "slow" : "normal")
    : { dataUrl: null, source: "browser" as const };

  try {
    const dictation = await prisma.dictation.create({
      data: {
        title,
        targetRule,
        gradeLevel,
        rawText: text,
        audioUrl: audio.dataUrl,
        audioSource: withAudio ? audio.source : null,
        playbackSettings: { ...settings },
        isAIGenerated: true,
        teacherId: session.user.id,
        classGroupId: classGroupId || null,
      },
    });
    return NextResponse.json({
      dictation,
      mocked,
      audioSource: withAudio ? audio.source : null,
      audioMocked: withAudio && !audio.dataUrl,
    });
  } catch {
    return NextResponse.json(
      {
        error: "Base de dades no configurada (DATABASE_URL). El text s'ha generat però no s'ha desat.",
        preview: { title, text, mocked },
      },
      { status: 503 }
    );
  }
}
