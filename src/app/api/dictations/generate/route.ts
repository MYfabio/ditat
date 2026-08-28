import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { generateDictationText } from "@/lib/ai/generate-dictation";
import { getOrCreateDictationAudio } from "@/lib/ai/dictation-audio";
import { parsePlaybackSettings } from "@/lib/playback-settings";
import { comprovaLimit, TOPALLS, quantFalta } from "@/lib/rate-limit";
import { isKnownSkill, skillLabel } from "@/lib/skill-taxonomy";
import { getMockDictationText } from "@/lib/ai/mock-dictations";
import { gradeLabel, ruleLabel } from "@/lib/dictation-rules";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const {
    gradeLevel,
    targetRule,
    targetSubskill,
    neeAdaptation,
    classGroupId,
    preview,
    withAudio,
    playback,
  } = body as {
    gradeLevel?: string;
    targetRule?: string;
    targetSubskill?: string | null;
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

  // Una subhabilitat que no es del catàleg no es fa servir: el text es
  // generaria demanant una cosa que no vol dir res.
  const subskill = targetSubskill && isKnownSkill(targetSubskill) ? targetSubskill : null;

  // El widget public de la landing serveix un text del banc local i no crida
  // la IA. Abans es generava primer i nomes despres es mirava el topall, aixi
  // que una peticio bloquejada ja havia costat una crida a Google: el limit
  // amagava el resultat, pero no estalviava ni un centim.
  if (preview) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "desconegut";
    // Darrere ja no hi ha res a pagar, aixi que el topall nomes ha d aturar
    // bucles. Ample a proposit: un claustre sencer surt a internet per una
    // sola adreça del centre i abans es bloquejaven entre ells.
    const limitPublic = comprovaLimit(`preview:${ip}`, 300, 60 * 60 * 1000);
    if (!limitPublic.permes) {
      return NextResponse.json(
        { error: "Has provat molts dictats seguits. Torna-ho a provar d'aquí a una estona." },
        { status: 429 }
      );
    }

    const focus = subskill ? skillLabel(subskill) : ruleLabel(targetRule);
    return NextResponse.json({
      title: `Dictat: ${focus} (${gradeLabel(gradeLevel)})`,
      text: getMockDictationText(targetRule, gradeLevel),
      mocked: true,
    });
  }

  const { text, title, mocked } = await generateDictationText({
    gradeLevel,
    targetRule,
    targetSubskill: subskill,
    neeAdaptation,
  });

  const session = await auth();
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "SUPERADMIN")) {
    return NextResponse.json({ error: "No autoritzat." }, { status: 401 });
  }

  // Generar text i veu es paga a Google. El topall no atura ningu que treballi
  // de debo, pero si un bucle o una pestanya que es queda prement el boto.
  const limit = comprovaLimit(`dictat:${session.user.id}`, TOPALLS.generarDictat);
  if (!limit.permes) {
    return NextResponse.json(
      {
        error: `Has generat molts dictats avui. Podras tornar-ne a generar d'aqui a ${quantFalta(limit.reiniciaEn)}.`,
      },
      { status: 429 }
    );
  }

  // El grup arriba del navegador, aixi que cal comprovar que es d'aquest
  // docent. Sense la comprovacio, un docent pot posar un dictat dins d'una
  // classe d'un altre centre nomes canviant l'identificador que envia.
  if (classGroupId) {
    const group = await prisma.classGroup.findUnique({
      where: { id: classGroupId },
      select: { teacherId: true, schoolId: true },
    });
    const seu =
      group &&
      (group.teacherId === session.user.id ||
        session.user.role === "SUPERADMIN" ||
        (group.schoolId !== null && group.schoolId === session.user.schoolId));
    if (!seu) {
      return NextResponse.json({ error: "Aquest grup classe no és teu." }, { status: 403 });
    }
  }

  const settings = parsePlaybackSettings(playback);

  try {
    const dictation = await prisma.dictation.create({
      data: {
        title,
        targetRule,
        targetSubskill: subskill,
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
