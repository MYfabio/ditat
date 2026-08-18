/**
 * Locució dels dictats amb Gemini TTS.
 *
 * Privadesa: la clau viu només al servidor i mai arriba al navegador; a Gemini
 * només s'hi envia el text del dictat. Cap dada personal de l'alumne (nom,
 * correu, centre) no surt d'aquí: els missatges personalitzats es componen al
 * client, quan es reprodueixen.
 */

export const hasGeminiKey = !!process.env.GEMINI_API_KEY;

// Veu per defecte. Gemini admet català (codi "ca"), que és imprescindible:
// una locució amb accent castellà faria escriure malament l'alumne.
const DEFAULT_VOICE = process.env.GEMINI_TTS_VOICE || "Kore";
const MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";

/** Gemini retorna PCM cru; el navegador només el sap reproduir dins d'un WAV. */
function pcmToWav(pcm: Buffer, sampleRate = 24000, channels = 1, bitsPerSample = 16) {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // mida del bloc fmt
  header.writeUInt16LE(1, 20); // PCM sense comprimir
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
}

/** El ritme no és un paràmetre numèric a Gemini: es demana amb llenguatge natural. */
function buildPrompt(text: string, pace: "slow" | "normal") {
  const style =
    pace === "slow"
      ? "Llegeix aquest dictat en català, a poc a poc i vocalitzant molt clarament, com un mestre que dicta a alumnes de primària. Fes una pausa marcada a cada signe de puntuació."
      : "Llegeix aquest dictat en català amb una dicció clara i un ritme pausat, com un mestre que dicta a classe.";
  return `${style}\n\n${text}`;
}

export type TtsResult = { dataUrl: string; bytes: number } | null;

export async function synthesiseWithGemini(
  text: string,
  pace: "slow" | "normal" = "normal"
): Promise<TtsResult> {
  if (!hasGeminiKey) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY as string,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(text, pace) }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: DEFAULT_VOICE } },
            },
          },
        }),
      }
    );

    if (!res.ok) {
      console.error("Gemini TTS ha fallat:", res.status, await res.text().catch(() => ""));
      return null;
    }

    const data = await res.json();
    const part = data?.candidates?.[0]?.content?.parts?.find(
      (p: { inlineData?: { data?: string } }) => p?.inlineData?.data
    );
    const base64: string | undefined = part?.inlineData?.data;
    if (!base64) {
      console.error("Gemini TTS: resposta sense àudio.");
      return null;
    }

    const mimeType: string = part?.inlineData?.mimeType ?? "audio/L16;rate=24000";
    const raw = Buffer.from(base64, "base64");

    // Si algun model ja retorna un format reproduïble, no el reenvoltem.
    if (/mp3|mpeg|wav|ogg/i.test(mimeType)) {
      const clean = mimeType.split(";")[0];
      return { dataUrl: `data:${clean};base64,${base64}`, bytes: raw.length };
    }

    const rate = Number(/rate=(\d+)/.exec(mimeType)?.[1] ?? 24000);
    const wav = pcmToWav(raw, rate);
    return { dataUrl: `data:audio/wav;base64,${wav.toString("base64")}`, bytes: wav.length };
  } catch (err) {
    console.error("Gemini TTS: error de xarxa.", err);
    return null;
  }
}
