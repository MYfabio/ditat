import { hasVisionKey } from "@/lib/ai/clients";

export type OcrResult = { text: string; mocked: boolean };

const MOCK_TEXT =
  "[OCR simulat] Configura GOOGLE_CLOUD_VISION_API_KEY per activar la lectura real de fotos manuscrites. Aquest es un text d'exemple que simula la transcripcio.";

export async function extractTextFromImage(imageDataUrl: string): Promise<OcrResult> {
  if (!hasVisionKey) {
    return { text: MOCK_TEXT, mocked: true };
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
    return { text: text.trim(), mocked: false };
  } catch {
    return {
      text: "[OCR fallit] No s'ha pogut llegir la imatge. Torna-ho a provar amb una foto mes clara i ben il·luminada.",
      mocked: true,
    };
  }
}
