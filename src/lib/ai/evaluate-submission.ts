import { getAnthropicClient, hasAnthropicKey } from "@/lib/ai/clients";

export type EvaluationError = {
  paraulaOriginal: string;
  paraulaEscrita: string;
  explicacio: string;
};

export type EvaluationResult = {
  score: number;
  errors: EvaluationError[];
  feedback: string;
  mocked: boolean;
};

function normalizeWords(text: string) {
  return text
    .replace(/[.,;:!?"'«»()]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

function mockEvaluate(originalText: string, ocrText: string): EvaluationResult {
  const original = normalizeWords(originalText);
  const written = normalizeWords(ocrText);
  const total = Math.max(original.length, 1);
  const errors: EvaluationError[] = [];

  for (let i = 0; i < original.length; i++) {
    const o = original[i];
    const w = written[i];
    if (!w) {
      errors.push({
        paraulaOriginal: o,
        paraulaEscrita: "(falta)",
        explicacio: "Sembla que falta aquesta paraula en el text escrit.",
      });
    } else if (o.toLowerCase() !== w.toLowerCase()) {
      errors.push({
        paraulaOriginal: o,
        paraulaEscrita: w,
        explicacio: "Revisa l'ortografia d'aquesta paraula comparant-la amb el text original.",
      });
    }
  }

  const score = Math.max(0, Math.round(((total - errors.length) / total) * 100));
  const feedback =
    errors.length === 0
      ? "Molt be! El dictat esta escrit correctament, sense errors detectats."
      : `Bona feina. S'han detectat ${errors.length} paraula(es) per revisar. Fixa't en aquestes errades per millorar la propera vegada.`;

  return { score, errors, feedback, mocked: true };
}

export async function evaluateSubmission(
  originalText: string,
  ocrText: string
): Promise<EvaluationResult> {
  const client = getAnthropicClient();
  if (!hasAnthropicKey || !client) {
    return mockEvaluate(originalText, ocrText);
  }

  const prompt = `Ets un mestre de llengua catalana que corregeix dictats d'alumnat de primaria i secundaria.
Compara el TEXT ORIGINAL del dictat amb el TEXT ESCRIT per l'alumne (obtingut per OCR d'una foto manuscrita).
Identifica els errors ortografics i dona una puntuacio de 0 a 100.

TEXT ORIGINAL:
"""${originalText}"""

TEXT ESCRIT PER L'ALUMNE:
"""${ocrText}"""

Respon NOMES amb un JSON valid amb aquesta forma exacta, sense cap text addicional:
{
  "score": number,
  "errors": [{ "paraulaOriginal": string, "paraulaEscrita": string, "explicacio": string }],
  "feedback": string
}
El camp "feedback" ha de ser un missatge curt, positiu i pedagogic en catala per a l'alumne.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });
    const block = message.content.find((b) => b.type === "text");
    const raw = block && "text" in block ? block.text.trim() : "";
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Resposta sense JSON");
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      score: Number(parsed.score) || 0,
      errors: Array.isArray(parsed.errors) ? parsed.errors : [],
      feedback: String(parsed.feedback ?? ""),
      mocked: false,
    };
  } catch {
    return mockEvaluate(originalText, ocrText);
  }
}
