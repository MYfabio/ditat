import { hasVisionKey } from "@/lib/ai/clients";

/**
 * Una paraula llegida de la foto, amb el rectangle que ocupa dins la imatge.
 *
 * Les coordenades son relatives (0-1) i no pixels a proposit: aixi la capa de
 * marques del mestre encaixa sobre la foto sigui quina sigui la mida amb que
 * es mostri, sense haver de recordar les dimensions originals.
 */
export type OcrWord = {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type OcrResult = { text: string; words: OcrWord[]; mocked: boolean };

const MOCK_TEXT =
  "[OCR simulat] Configura GOOGLE_CLOUD_VISION_API_KEY per activar la lectura real de fotos manuscrites. Aquest és un text d'exemple que simula la transcripció.";

type Vertex = { x?: number; y?: number };

/** Passa els vertexs d'un boundingPoly de Vision a un rectangle relatiu. */
function toRelativeBox(vertices: Vertex[], pageWidth: number, pageHeight: number) {
  if (!vertices.length || pageWidth <= 0 || pageHeight <= 0) return null;
  const xs = vertices.map((v) => v.x ?? 0);
  const ys = vertices.map((v) => v.y ?? 0);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  if (maxX <= minX || maxY <= minY) return null;
  return {
    x: minX / pageWidth,
    y: minY / pageHeight,
    width: (maxX - minX) / pageWidth,
    height: (maxY - minY) / pageHeight,
  };
}

/**
 * Treu les paraules amb posicio de la resposta de Vision.
 *
 * S'usa `textAnnotations` (una entrada per paraula) i no l'arbre de
 * `fullTextAnnotation`, perque ja ve pla i en ordre de lectura, que es
 * exactament el que necessita l'emparellament amb els errors.
 */
function extractWords(data: unknown): OcrWord[] {
  const response = (data as { responses?: Record<string, unknown>[] })?.responses?.[0];
  if (!response) return [];

  const page = (
    response.fullTextAnnotation as { pages?: { width?: number; height?: number }[] } | undefined
  )?.pages?.[0];
  const pageWidth = page?.width ?? 0;
  const pageHeight = page?.height ?? 0;
  if (!pageWidth || !pageHeight) return [];

  const annotations = response.textAnnotations as
    | { description?: string; boundingPoly?: { vertices?: Vertex[] } }[]
    | undefined;
  if (!Array.isArray(annotations)) return [];

  const words: OcrWord[] = [];
  // La primera entrada es el text sencer, no una paraula: es descarta.
  for (const annotation of annotations.slice(1)) {
    const text = annotation.description?.trim();
    const box = toRelativeBox(annotation.boundingPoly?.vertices ?? [], pageWidth, pageHeight);
    if (!text || !box) continue;
    words.push({ text, ...box });
  }
  return words;
}

export async function extractTextFromImage(imageDataUrl: string): Promise<OcrResult> {
  if (!hasVisionKey) {
    return { text: MOCK_TEXT, words: [], mocked: true };
  }

  const base64 = imageDataUrl.includes(",") ? imageDataUrl.split(",")[1] : imageDataUrl;

  try {
    const res = await fetch(
      `https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_CLOUD_VISION_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [
            {
              image: { content: base64 },
              features: [{ type: "TEXT_DETECTION" }],
              imageContext: { languageHints: ["ca"] },
            },
          ],
        }),
      }
    );
    if (!res.ok) throw new Error(`Vision API error: ${res.status}`);
    const data = await res.json();
    const text: string | undefined = data?.responses?.[0]?.fullTextAnnotation?.text;
    if (!text?.trim()) throw new Error("Cap text detectat a la imatge");
    return { text: text.trim(), words: extractWords(data), mocked: false };
  } catch {
    return {
      text: "[OCR fallit] No s'ha pogut llegir la imatge. Torna-ho a provar amb una foto més clara i ben il·luminada.",
      words: [],
      mocked: true,
    };
  }
}
