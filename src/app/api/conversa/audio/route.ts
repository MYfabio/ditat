import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { topicPerId } from "@/lib/conversa-topics";
import { generateAudioDataUrl } from "@/lib/ai/generate-audio";

/**
 * La veu de cada pregunta de conversa.
 *
 * Les preguntes són fixes i poques: la locució de cadascuna es genera el
 * primer cop que algú la demana i queda desada per sempre (mateix patró que el
 * repàs de les normes, i de fet a la mateixa taula, que és un simple
 * clau→àudio). Només s'accepten preguntes del catàleg: un endpoint que llegís
 * text arbitrari seria una màquina de gastar la clau de TTS a compte nostre.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse(null, { status: 401 });

  const url = new URL(req.url);
  const topic = topicPerId(url.searchParams.get("topic") ?? "");
  const index = Number(url.searchParams.get("q"));
  if (!topic || !Number.isInteger(index) || index < 0 || index >= topic.preguntes.length) {
    return new NextResponse(null, { status: 400 });
  }

  const clau = `conversa:${topic.id}:${index}`;
  const desat = await prisma.ruleHelpAudio.findUnique({ where: { clau } });
  if (desat) {
    return new NextResponse(new Uint8Array(desat.data), {
      headers: {
        "Content-Type": desat.mimeType,
        "Cache-Control": "private, max-age=86400",
      },
    });
  }

  const generat = await generateAudioDataUrl(topic.preguntes[index], "normal");
  if (!generat.dataUrl) return new NextResponse(null, { status: 204 });
  const m = generat.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return new NextResponse(null, { status: 204 });
  const data = Buffer.from(m[2], "base64");

  await prisma.ruleHelpAudio
    .create({ data: { clau, data: new Uint8Array(data), mimeType: m[1], source: generat.source } })
    .catch(() => {}); // dues peticions alhora: la segona xoca i tant li fa

  return new NextResponse(new Uint8Array(data), {
    headers: { "Content-Type": m[1], "Cache-Control": "private, max-age=86400" },
  });
}
