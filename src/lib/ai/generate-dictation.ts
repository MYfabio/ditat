import { askText, hasTextModel } from "@/lib/ai/text-model";
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

  if (!hasTextModel()) {
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

  // El reintent es una segona conversa, no un fil: aixi funciona igual amb
  // qualsevol motor i no depen que sapiga mantenir el context.
  async function ask(text: string) {
    return (await askText(text, 1000)) ?? "";
  }

  try {
    let text = await ask(prompt);
    if (!text) throw new Error("Cap motor de text ha respost");

    // Els models sovint es queden curts o es passen: si el text surt del rang,
    // se li demana una correcció abans de donar-lo per bo.
    const words = countWords(text);
    if (words < length.min || words > length.max) {
      const retry = await ask(
        `${prompt}

Aquest intent anterior té ${words} paraules i el rang demanat és de ${length.min} a ${length.max}:
"""${text}"""
Reescriu-lo ${
          words > length.max ? "més curt" : "més llarg"
        } respectant el rang, la mateixa regla ortogràfica i el mateix nivell. Respon només amb el text.`
      );
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
