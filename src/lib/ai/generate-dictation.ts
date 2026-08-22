import { getAnthropicClient, hasAnthropicKey } from "@/lib/ai/clients";
import { getMockDictationText } from "@/lib/ai/mock-dictations";
import { gradeLabel, ruleLabel, lengthForGrade, countWords, styleGuidanceFor} from "@/lib/dictation-rules";
import { skillLabel } from "@/lib/skill-taxonomy";

export type GenerateDictationInput = {
  gradeLevel: string;
  targetRule: string;
  /** Habilitat concreta dins la regla ("accentuacio.agudes"), si se'n vol una. */
  targetSubskill?: string | null;
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
  const { gradeLevel, targetRule, targetSubskill, neeAdaptation = "cap" } = input;
  const focus = targetSubskill ? skillLabel(targetSubskill) : ruleLabel(targetRule);
  const title = `Dictat: ${focus} (${gradeLabel(gradeLevel)})`;

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

  const length = lengthForGrade(gradeLevel);

  const prompt = `Ets un mestre expert en llengua catalana seguint el currículum del Departament d'Educació de Catalunya.
Genera un text de dictat en català, adequat per a l'alumnat de ${gradeLabel(gradeLevel)}, que posi
especial èmfasi en la regla ortogràfica següent: "${ruleLabel(targetRule)}".
${
  targetSubskill
    ? `Dins d'aquesta regla, concentra't especialment en: "${skillLabel(targetSubskill)}". Les paraules que hi treballin han de ser-hi diverses vegades i en contextos diferents, no repetint la mateixa paraula.`
    : ""
}

${styleGuidanceFor(gradeLevel) ? `ESTIL DEL NIVELL: ${styleGuidanceFor(gradeLevel)}
` : ""}LLARGADA OBLIGATÒRIA: entre ${length.min} i ${length.max} paraules (${length.cycle}, ${length.ages}).
${length.guidance}
Compta les paraules abans de respondre: un text fora d'aquest rang no serveix.

Fes servir un vocabulari natural i proper a l'alumnat, sense encapçalaments ni explicacions.
${neeInstruction}
Respon només amb el text del dictat, sense cometes ni comentaris addicionals.`;

  async function ask(messages: { role: "user" | "assistant"; content: string }[]) {
    const message = await client!.messages.create({
      // El producte promet textos de nivell C1 i C2. El registre i la
      // naturalitat del catala avancat es justament on es nota el model, i
      // un dictat son unes poques centenes de tokens: la diferencia de preu
      // es de decimes de centim, molt per sota del que costa la locucio.
      model: "claude-opus-5",
      // Escriure un text curt amb unes restriccions clares no demana gaire
      // deliberacio, i baixar l'esforc el fa mes rapid i mes barat.
      output_config: { effort: "low" },
      max_tokens: 1000,
      messages,
    });
    const block = message.content.find((b) => b.type === "text");
    return block && "text" in block ? block.text.trim() : "";
  }

  try {
    let text = await ask([{ role: "user", content: prompt }]);
    if (!text) throw new Error("Resposta buida de Claude");

    // Els models sovint es queden curts o es passen: si el text surt del rang,
    // se li demana una correcció abans de donar-lo per bo.
    const words = countWords(text);
    if (words < length.min || words > length.max) {
      const retry = await ask([
        { role: "user", content: prompt },
        { role: "assistant", content: text },
        {
          role: "user",
          content: `Aquest text té ${words} paraules i el rang demanat és de ${length.min} a ${length.max}. Reescriu-lo ${
            words > length.max ? "més curt" : "més llarg"
          } respectant el rang, la mateixa regla ortogràfica i el mateix nivell. Respon només amb el text.`,
        },
      ]);
      const retryWords = countWords(retry);
      // Es queda amb el reintent només si realment s'acosta més al rang.
      if (retry && Math.abs(retryWords - (length.min + length.max) / 2) < Math.abs(words - (length.min + length.max) / 2)) {
        text = retry;
      }
    }

    return { text, title, mocked: false };
  } catch {
    return { text: getMockDictationText(targetRule, gradeLevel), title, mocked: true };
  }
}
