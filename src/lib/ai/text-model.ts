import { getAnthropicClient, hasAnthropicKey } from "@/lib/ai/clients";

/**
 * Un sol lloc per demanar text a una IA, faci servir el motor que faci servir.
 *
 * Abans la generacio i la correccio cridaven Anthropic cadascuna pel seu
 * compte, i quan no hi havia clau requeien en textos de reserva sense que es
 * notes enlloc. Aixi es va estar dies servint sempre el mateix dictat.
 *
 * Ara el motor es tria segons la clau que hi hagi: si n'hi ha una d'Anthropic
 * s'hi va, i si no, es fa servir la de Gemini, que es la que ja hi ha
 * configurada per a la locucio. Qui crida no ha de saber res d'aixo.
 */

// Google retira models sense avisar: el 2.5-flash va deixar d'acceptar
// comptes nous i tornava un 404 amb el nom del substitut. Es deixa canviable
// per variable per no haver de desplegar quan torni a passar.
const GEMINI_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-3.6-flash";

export const hasGeminiKey = !!process.env.GEMINI_API_KEY;

/** Cert si hi ha algun motor de text disponible; si no, toca text de reserva. */
export const hasTextModel = hasAnthropicKey || hasGeminiKey;

/** Quin motor respon ara mateix, per poder dir-ho als registres. */
export const textProvider = hasAnthropicKey ? "anthropic" : hasGeminiKey ? "gemini" : "cap";

async function askGemini(prompt: string, maxTokens: number): Promise<string> {
  const resposta = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.9 },
      }),
    }
  );

  if (!resposta.ok) {
    const detall = await resposta.text().catch(() => "");
    throw new Error(`Gemini ha respost ${resposta.status}: ${detall.slice(0, 200)}`);
  }

  const dades = (await resposta.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = dades.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("Gemini ha respost sense text");
  return text.trim();
}

async function askAnthropic(prompt: string, maxTokens: number): Promise<string> {
  const client = getAnthropicClient();
  if (!client) throw new Error("Sense client d'Anthropic");
  const message = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const block = message.content.find((b) => b.type === "text");
  const text = block && "text" in block ? block.text.trim() : "";
  if (!text) throw new Error("Anthropic ha respost sense text");
  return text;
}

/**
 * Demana text al motor que hi hagi. Torna null si no n'hi ha cap o si falla,
 * i llavors qui crida ja decidira que fa.
 */
export async function askText(prompt: string, maxTokens = 1000): Promise<string | null> {
  // Es proven en ordre i no nomes el primer: una clau caducada, un tall del
  // servei o una quota exhaurida en un motor no ha de deixar l'aplicacio
  // servint textos de reserva si l'altre motor respon perfectament.
  const motors: [string, () => Promise<string>][] = [];
  if (hasAnthropicKey) motors.push(["anthropic", () => askAnthropic(prompt, maxTokens)]);
  if (hasGeminiKey) motors.push(["gemini", () => askGemini(prompt, maxTokens)]);

  for (const [nom, crida] of motors) {
    try {
      return await crida();
    } catch (error) {
      // Es deixa constancia: un text de reserva servit en silenci sembla que
      // tot funciona, i es exactament el que va passar durant dies.
      console.error(`[ia] ${nom} no ha pogut respondre:`, error);
    }
  }
  return null;
}
