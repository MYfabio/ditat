import { hasGeminiKey } from "@/lib/ai/text-model";

export type RespostaAudio = { data: Buffer; mimeType: string };

export type AvaluacioConversa = {
  transcripcions: string[];
  puntuacio: number;
  resum: string;
  millores: { que: string; exemple: string }[];
};

const MODEL = () => process.env.GEMINI_TEXT_MODEL || "gemini-3.6-flash";

/**
 * Escolta les respostes d'una conversa guiada i les valora.
 *
 * Tot en UNA sola crida: les tres respostes viatgen juntes amb les preguntes
 * intercalades, perque la valoracio ha de ser del conjunt (si a la tercera
 * pregunta repeteix el vocabulari de la primera, aixo es veu junt, no per
 * separat).
 *
 * El que se li demana avaluar es el que la IA sap escoltar be: vocabulari,
 * estructura, adequacio a la pregunta i errors gramaticals audibles. La
 * fonetica fina (e oberta o tancada) NO es demana, perque la faria malament i
 * val mes callar que corregir malament.
 *
 * L'audio nomes viu en aquesta funcio: entra, s'analitza i el que en surt es
 * text. No es desa mai enlloc.
 */
export async function evaluateConversa(
  nivell: string,
  preguntes: string[],
  respostes: RespostaAudio[]
): Promise<AvaluacioConversa | null> {
  if (!hasGeminiKey()) return null;

  const parts: object[] = [
    {
      text:
        `Ets un docent de català que escolta una pràctica de conversa oral d'un alumne de nivell ${nivell}. ` +
        `Li has fet ${preguntes.length} preguntes i ara escoltaràs la resposta gravada a cadascuna, en ordre.\n\n` +
        `Valora NOMÉS el que se sent amb claredat: si respon al que es pregunta, la riquesa i varietat del vocabulari, ` +
        `l'estructura de les frases i els errors gramaticals audibles. NO valoris la pronúncia fina de vocals ni ` +
        `accents: no es demana.\n\n` +
        `El to del resum ha de ser el d'un docent que anima: primer el que ha fet bé, després el que pot millorar. ` +
        `Les millores han de ser poques i concretes, amb un exemple de com dir-ho millor.\n\n` +
        `Respon NOMÉS amb un JSON amb aquesta forma exacta:\n` +
        `{"transcripcions": ["resposta 1 transcrita", ...], "puntuacio": 0-100, ` +
        `"resum": "dues o tres frases en català dirigides a l'alumne", ` +
        `"millores": [{"que": "què millorar", "exemple": "com dir-ho"}] (màxim 3, pot ser buit)}`,
    },
  ];

  preguntes.forEach((pregunta, i) => {
    const resposta = respostes[i];
    parts.push({ text: `Pregunta ${i + 1}: ${pregunta}\nResposta ${i + 1} (àudio):` });
    if (resposta) {
      parts.push({
        inline_data: {
          mime_type: resposta.mimeType,
          data: resposta.data.toString("base64"),
        },
      });
    } else {
      parts.push({ text: "(sense resposta gravada)" });
    }
  });

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL()}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          // Mateix marge generos que al text: el raonament comparteix
          // pressupost amb la resposta i, escatimant, surt tallada.
          maxOutputTokens: 24000,
          temperature: 0.3,
          responseMimeType: "application/json",
        },
      }),
    }
  );

  if (!r.ok) {
    const detall = await r.text().catch(() => "");
    console.error(`[conversa] Gemini ha respost ${r.status}: ${detall.slice(0, 200)}`);
    return null;
  }

  const dades = (await r.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  };
  const cru = dades.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!cru.trim() || dades.candidates?.[0]?.finishReason === "MAX_TOKENS") {
    console.error("[conversa] resposta buida o tallada");
    return null;
  }

  try {
    const json = JSON.parse(cru.match(/\{[\s\S]*\}/)?.[0] ?? "");
    return {
      transcripcions: Array.isArray(json.transcripcions)
        ? json.transcripcions.map(String)
        : [],
      puntuacio: Math.max(0, Math.min(100, Number(json.puntuacio) || 0)),
      resum: String(json.resum ?? ""),
      millores: Array.isArray(json.millores)
        ? json.millores
            .slice(0, 3)
            .map((m: { que?: unknown; exemple?: unknown }) => ({
              que: String(m.que ?? ""),
              exemple: String(m.exemple ?? ""),
            }))
        : [],
    };
  } catch {
    console.error("[conversa] no s'ha pogut interpretar la valoracio");
    return null;
  }
}
