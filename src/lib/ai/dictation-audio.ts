import { prisma } from "@/lib/prisma";
import { generateAudioDataUrl } from "@/lib/ai/generate-audio";

export type StoredAudio = { data: Buffer; mimeType: string; source: string };

/** Converteix el data URL que retornen els serveis de veu a bytes crus. */
function decodeDataUrl(dataUrl: string): { data: Buffer; mimeType: string } | null {
  const match = /^data:([^;]+);base64,([\s\S]+)$/.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1], data: Buffer.from(match[2], "base64") };
}

/**
 * La locució d'un dictat, generant-la si encara no existeix.
 *
 * Es genera un sol cop i la reaprofita tota la classe: trenta alumnes escoltant
 * el mateix dictat costen el mateix que un. Si s'ha esborrat per fer espai, es
 * torna a generar a partir del text, que és l'única cosa que guardem sempre.
 *
 * Retorna null quan el docent no ha demanat locució o quan cap servei de veu
 * està disponible; llavors el navegador llegeix el text amb la seva veu.
 */
export async function getOrCreateDictationAudio(dictationId: string): Promise<StoredAudio | null> {
  const cached = await prisma.dictationAudio.findUnique({ where: { dictationId } });
  if (cached) {
    // No esperem el resultat: refrescar la data d'ús no ha de fer esperar
    // l'alumne que acaba de prémer "Escoltar".
    prisma.dictationAudio
      .update({ where: { dictationId }, data: { lastUsedAt: new Date() } })
      .catch(() => {});
    return { data: Buffer.from(cached.data), mimeType: cached.mimeType, source: cached.source };
  }

  const dictation = await prisma.dictation.findUnique({
    where: { id: dictationId },
    select: { rawText: true, wantsAudio: true, playbackSettings: true },
  });
  if (!dictation?.wantsAudio) return null;

  const speed = (dictation.playbackSettings as { defaultSpeed?: number } | null)?.defaultSpeed ?? 1;
  const generated = await generateAudioDataUrl(dictation.rawText, speed < 1 ? "slow" : "normal");
  if (!generated.dataUrl) {
    // Cap servei ha respost. Es deixa constància perquè el docent ho vegi al
    // seu panell, però no es desa res: el proper cop es tornarà a intentar.
    await prisma.dictation
      .update({ where: { id: dictationId }, data: { audioSource: "browser" } })
      .catch(() => {});
    return null;
  }

  const decoded = decodeDataUrl(generated.dataUrl);
  if (!decoded) return null;

  await prisma.$transaction([
    prisma.dictationAudio.create({
      data: {
        dictationId,
        data: new Uint8Array(decoded.data),
        mimeType: decoded.mimeType,
        source: generated.source,
      },
    }),
    prisma.dictation.update({
      where: { id: dictationId },
      data: { audioSource: generated.source },
    }),
  ]);

  return { data: decoded.data, mimeType: decoded.mimeType, source: generated.source };
}
