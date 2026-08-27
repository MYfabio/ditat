import { prisma } from "@/lib/prisma";
import { generateAudioDataUrl } from "@/lib/ai/generate-audio";
import { ajudaPerRegla, textAjuda } from "@/lib/rule-help";
import { ruleLabel } from "@/lib/dictation-rules";

export type StoredAudio = { data: Buffer; mimeType: string; source: string };

export type VersioAjuda = "primaria" | "completa";

function decodeDataUrl(dataUrl: string): { data: Buffer; mimeType: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], data: Buffer.from(match[2], "base64") };
}

/**
 * El text que es llegeix en veu alta.
 *
 * No es el mateix que es veu a la pantalla: escoltat, un llistat d'exemples
 * separats per comes no s'enten. Es diu la norma, despres els exemples
 * anunciats com a tals, i el parany al final si n'hi ha.
 */
function guioParaLlegir(regla: string, versio: VersioAjuda): string | null {
  const ajuda = ajudaPerRegla(regla);
  if (!ajuda) return null;
  const text = textAjuda(ajuda, { primaria: versio === "primaria", curta: false });

  const parts = [`${ruleLabel(regla)}.`, text.norma, `Per exemple: ${text.exemples.join("; ")}.`];
  if (text.parany) parts.push(`Compte: ${text.parany}`);
  return parts.join(" ");
}

/**
 * La locucio del repas d'una norma, generada un cop i reutilitzada sempre.
 *
 * Nomes hi ha deu normes i no canvien mai, aixi que despres de la primera
 * vegada aixo no torna a costar res. Es la diferencia entre un cost fix
 * ridicul i pagar una locucio per alumne i per dictat.
 */
export async function getOrCreateRuleHelpAudio(
  regla: string,
  versio: VersioAjuda
): Promise<StoredAudio | null> {
  const clau = `${regla}:${versio}`;

  const desat = await prisma.ruleHelpAudio.findUnique({ where: { clau } });
  if (desat) {
    return { data: Buffer.from(desat.data), mimeType: desat.mimeType, source: desat.source };
  }

  const guio = guioParaLlegir(regla, versio);
  if (!guio) return null;

  // A poc a poc: qui demana que li llegeixin la norma no te pressa, i sovint
  // es precisament qui li costa seguir-la.
  const generat = await generateAudioDataUrl(guio, "slow");
  if (!generat.dataUrl) return null;

  const decodificat = decodeDataUrl(generat.dataUrl);
  if (!decodificat) return null;

  // Si dues persones la demanen alhora, la segona insercio xoca amb la clau:
  // no es cap problema, la locucio ja hi es.
  await prisma.ruleHelpAudio
    .create({
      data: {
        clau,
        data: new Uint8Array(decodificat.data),
        mimeType: decodificat.mimeType,
        source: generat.source,
      },
    })
    .catch(() => {});

  return {
    data: decodificat.data,
    mimeType: decodificat.mimeType,
    source: generat.source,
  };
}
