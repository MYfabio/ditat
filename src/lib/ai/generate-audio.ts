import { getOpenAIClient, hasOpenAIKey } from "@/lib/ai/clients";

export async function generateAudioDataUrl(text: string): Promise<string | null> {
  const client = getOpenAIClient();
  if (!hasOpenAIKey || !client) return null;

  try {
    const response = await client.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
      response_format: "mp3",
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:audio/mpeg;base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}
