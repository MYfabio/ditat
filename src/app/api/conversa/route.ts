import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { topicPerId } from "@/lib/conversa-topics";
import { evaluateConversa, type RespostaAudio } from "@/lib/ai/evaluate-conversa";
import { subscripcioActiva } from "@/lib/subscription";

/** Converses gratuites al mes per a qui aprèn pel seu compte. */
export const CONVERSES_GRATUITES_AL_MES = 4;
/**
 * Límit mensual per a alumnat de centre. No és un pla de pagament: és el fre
 * que evita que una classe sencera repetint converses en bucle es converteixi
 * en una factura d'IA sorpresa. Vuit al mes és més del que cap docent demana.
 */
const CONVERSES_CENTRE_AL_MES = 8;

const MIDA_MAXIMA_AUDIO = 3 * 1024 * 1024; // ~1 minut d'opus va molt per sota

/**
 * Rep les respostes gravades d'una conversa guiada, les analitza i desa el
 * resultat.
 *
 * L'àudio entra, s'analitza i es descarta: mai no toca ni el disc ni la base
 * de dades. Amb menors, la veu és una dada biomètrica; no guardar-la
 * converteix un problema legal seriós en cap. El que es desa és la
 * transcripció i la valoració, que és el que el docent repassa.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Sense sessió." }, { status: 401 });
  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      classGroupId: true,
      learningLevel: true,
      classGroup: { select: { gradeLevel: true } },
      subscriptionStatus: true,
      subscriptionEndsAt: true,
    },
  });
  if (!user) return NextResponse.json({ error: "Usuari desconegut." }, { status: 401 });

  // --- Límit mensual: es compta la realitat, no un comptador a part ---
  const iniciMes = new Date();
  iniciMes.setDate(1);
  iniciMes.setHours(0, 0, 0, 0);
  const fetes = await prisma.conversa.count({
    where: { studentId: userId, createdAt: { gte: iniciMes } },
  });
  const limit = user.classGroupId
    ? CONVERSES_CENTRE_AL_MES
    : subscripcioActiva(user)
      ? Infinity
      : CONVERSES_GRATUITES_AL_MES;
  if (fetes >= limit) {
    return NextResponse.json(
      {
        error: user.classGroupId
          ? "Ja has fet totes les converses d'aquest mes. El mes que ve en tindràs més."
          : `Ja has fet les ${CONVERSES_GRATUITES_AL_MES} converses gratuïtes d'aquest mes.`,
        limitAssolit: true,
      },
      { status: 402 }
    );
  }

  const form = await req.formData();
  const topicId = String(form.get("topicId") ?? "");
  const topic = topicPerId(topicId);
  if (!topic) return NextResponse.json({ error: "Tema desconegut." }, { status: 400 });

  const respostes: RespostaAudio[] = [];
  for (let i = 0; i < topic.preguntes.length; i++) {
    const fitxer = form.get(`resposta${i}`);
    if (!(fitxer instanceof File) || fitxer.size === 0) {
      return NextResponse.json(
        { error: `Falta la resposta a la pregunta ${i + 1}.` },
        { status: 400 }
      );
    }
    if (fitxer.size > MIDA_MAXIMA_AUDIO) {
      return NextResponse.json(
        { error: "Una gravació és massa llarga. Un minut per resposta és el màxim." },
        { status: 400 }
      );
    }
    respostes.push({
      data: Buffer.from(await fitxer.arrayBuffer()),
      mimeType: fitxer.type || "audio/webm",
    });
  }

  const nivell = user.learningLevel ?? user.classGroup?.gradeLevel ?? "B1";
  const avaluacio = await evaluateConversa(nivell, [...topic.preguntes], respostes);
  if (!avaluacio) {
    // Millor un error clar que una valoracio inventada: aqui no hi ha text de
    // reserva possible, perque la gracia es que t'escoltin a TU.
    return NextResponse.json(
      { error: "Ara mateix no s'ha pogut analitzar la conversa. Torna-ho a provar d'aquí a una estona." },
      { status: 503 }
    );
  }

  const desada = await prisma.conversa.create({
    data: {
      studentId: userId,
      topicId: topic.id,
      gradeLevel: nivell,
      questions: topic.preguntes,
      transcripcions: avaluacio.transcripcions,
      avaluacio: { resum: avaluacio.resum, millores: avaluacio.millores },
      score: avaluacio.puntuacio,
    },
    select: { id: true },
  });

  return NextResponse.json({
    id: desada.id,
    puntuacio: avaluacio.puntuacio,
    resum: avaluacio.resum,
    millores: avaluacio.millores,
    transcripcions: avaluacio.transcripcions,
    restants: limit === Infinity ? null : Math.max(0, limit - fetes - 1),
  });
}
