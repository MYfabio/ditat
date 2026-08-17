import { getAnthropicClient, hasAnthropicKey } from "@/lib/ai/clients";
import { getMockDictationText } from "@/lib/ai/mock-dictations";
import { gradeLabel, ruleLabel } from "@/lib/dictation-rules";

export type GenerateDictationInput = {
  gradeLevel: string;
  targetRule: string;
  neeAdaptation?: "cap" | "tdah" | "dislexia";
};

export type GenerateDictationResult = {
  text: string;
  title: string;
  mocked: boolean;
};

export async function generateDictationText(
  input: GenerateDictationInput
): Promise<GenerateDictationResult> {
  const { gradeLevel, targetRule, neeAdaptation = "cap" } = input;
  const title = `Dictat: ${ruleLabel(targetRule)} (${gradeLabel(gradeLevel)})`;

  const client = getAnthropicClient();
  if (!hasAnthropicKey || !client) {
    return { text: getMockDictationText(targetRule, gradeLevel), title, mocked: true };
  }

  const neeInstruction =
    neeAdaptation === "tdah"
      ? "Escriu frases curtes (màxim 12 paraules) per facilitar la lectura fragmentada per a alumnat amb TDAH."
      : neeAdaptation === "dislexia"
        ? "Evita paraules molt llargues o poc freqüents i utilitza estructures sintactiques simples, pensant en alumnat amb dislèxia."
        : "";

  const prompt = `Ets un mestre expert en llengua catalana seguint el currículum del Departament d'Educació de Catalunya.
Genera un text de dictat en català, adequat per a l'alumnat de ${gradeLabel(gradeLevel)}, que posi
especial emfasi en la regla ortogràfica següent: "${ruleLabel(targetRule)}".
El text ha de tenir entre 3 i 5 frases, un vocabulari natural i proper a l'alumnat, sense encapcalaments ni explicacions.
${neeInstruction}
Respon només amb el text del dictat, sense cometes ni comentaris addicionals.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });
    const block = message.content.find((b) => b.type === "text");
    const text = block && "text" in block ? block.text.trim() : "";
    if (!text) throw new Error("Resposta buida de Claude");
    return { text, title, mocked: false };
  } catch {
    return { text: getMockDictationText(targetRule, gradeLevel), title, mocked: true };
  }
}
