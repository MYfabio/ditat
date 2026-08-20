import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateDictationText } from "@/lib/ai/generate-dictation";
import { getOrCreateDictationAudio } from "@/lib/ai/dictation-audio";
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

  try {
    const dictation = await prisma.dictation.create({
      data: {
        title,
        targetRule,
        gradeLevel,
        rawText: text,
        wantsAudio: !!withAudio,
        playbackSettings: { ...settings },
        isAIGenerated: true,
        teacherId: session.user.id,
        classGroupId: classGroupId || null,
      },
    });
    // La locució es genera de seguida perquè esperi el docent i no l'alumnat,
    // però es desa en una taula a part i no s'inclou a la resposta.
    const audio = withAudio ? await getOrCreateDictationAudio(dictation.id) : null;

    return NextResponse.json({
      dictation,
      mocked,
      audioSource: audio?.source ?? (withAudio ? "browser" : null),
      audioMocked: !!withAudio && !audio,
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
