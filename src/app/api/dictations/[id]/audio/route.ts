import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateDictationAudio } from "@/lib/ai/dictation-audio";

/**
 * Serveix la locució d'un dictat.
 *
 * L'àudio s'envia per aquí i no incrustat a la pàgina perquè carregar el
 * llistat de dictats no hagi d'arrossegar megues de veu que potser l'alumne no
 * escoltarà. Es genera al primer "Escoltar" i queda desat per a la resta.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return new NextResponse(null, { status: 401 });

  const dictation = await prisma.dictation.findUnique({
    where: { id },
    select: { id: true, teacherId: true, classGroupId: true, targetStudentId: true },
  });
  if (!dictation) return new NextResponse(null, { status: 404 });

  // Un dictat només el pot escoltar qui l'ha rebut: l'alumne del grup o
  // l'alumne concret a qui va dirigit, i el docent que l'ha creat.
  const user = session.user;
  const allowed =
    user.role === "SUPERADMIN" ||
    dictation.teacherId === user.id ||
    dictation.targetStudentId === user.id ||
    (dictation.targetStudentId === null &&
      dictation.classGroupId !== null &&
      dictation.classGroupId === user.classGroupId);
  if (!allowed) return new NextResponse(null, { status: 403 });

  const audio = await getOrCreateDictationAudio(id);
  // 204: no hi ha locució generada i el client ha de fer servir la veu del
  // navegador. No és un error, és l'altra manera de sentir el dictat.
  if (!audio) return new NextResponse(null, { status: 204 });

  return new NextResponse(new Uint8Array(audio.data), {
    headers: {
      "Content-Type": audio.mimeType,
      "Content-Length": String(audio.data.length),
      "Cache-Control": "private, max-age=86400",
      "X-Audio-Source": audio.source,
    },
  });
}
