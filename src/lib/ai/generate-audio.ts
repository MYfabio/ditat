import { getOpenAIClient, hasOpenAIKey } from "@/lib/ai/clients";
import { synthesiseWithGemini, hasGeminiKey } from "@/lib/ai/gemini-tts";

export type AudioSource = "gemini" | "openai" | "browser";

export type AudioResult = {
  /** null quan cap servei ha pogut generar l'àudio: el client farà servir la veu del navegador. */
  dataUrl: string | null;
  source: AudioSource;
};

/**
 * Locució del dictat. Es prova Gemini primer (té veu catalana i és el servei
 * que fem servir per defecte), després OpenAI si el centre el té configurat, i
 * si cap dels dos respon es retorna null perquè el navegador ho llegeixi.
 *
 * En cap cas s'hi envia informació personal de l'alumne: només el text.
 */
export async function generateAudioDataUrl(
  text: string,
  pace: "slow" | "normal" = "normal"
): Promise<AudioResult> {
  if (hasGeminiKey) {
    const gemini = await synthesiseWithGemini(text, pace);
    if (gemini) return { dataUrl: gemini.dataUrl, source: "gemini" };
  }

  const client = getOpenAIClient();
  if (hasOpenAIKey && client) {
    try {
      const response = await client.audio.speech.create({
        model: "tts-1",
        voice: "alloy",
        input: text,
        response_format: "mp3",
        speed: pace === "slow" ? 0.85 : 1,
      });
      const buffer = Buffer.from(await response.arrayBuffer());
      return {
        dataUrl: `data:audio/mpeg;base64,${buffer.toString("base64")}`,
        source: "openai",
      };
    } catch (err) {
      console.error("OpenAI TTS ha fallat.", err);
    }
  }

  return { dataUrl: null, source: "browser" };
}
