/**
 * Comprova si la clau de Gemini pot generar veu, sense haver de crear un dictat
 * i endevinar per què ha sonat la veu del navegador.
 *
 *   railway run node scripts/check-gemini-tts.mjs    (clau de producció)
 *   GEMINI_API_KEY=... node scripts/check-gemini-tts.mjs
 */
const key = process.env.GEMINI_API_KEY || process.argv[2];
const model = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
const voice = process.env.GEMINI_TTS_VOICE || "Kore";

if (!key) {
  console.error("Falta GEMINI_API_KEY (variable d'entorn o primer argument).");
  process.exit(1);
}
console.log(`Clau: ...${key.slice(-6)}  |  Model: ${model}  |  Veu: ${voice}\n`);

// 1) La clau serveix per a alguna cosa? Distingeix "clau dolenta" de
//    "projecte bloquejat" i de "aquest model no el tens".
const list = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
  headers: { "x-goog-api-key": key },
});
if (!list.ok) {
  console.error(`[1/2] Llistar models: FALLA ${list.status}`);
  console.error(await list.text());
  console.error(
    "\n403 amb 'project has been denied access' = bloqueig del projecte a Google," +
      "\nno de la clau. Cal mirar facturació / suport a Google AI Studio."
  );
  process.exit(1);
}
const models = (await list.json()).models ?? [];
const tts = models.filter((m) => /tts/i.test(m.name));
console.log(`[1/2] Llistar models: OK (${models.length} models)`);
console.log(`      Models de veu disponibles: ${tts.map((m) => m.name.replace("models/", "")).join(", ") || "cap"}`);
if (!tts.some((m) => m.name.endsWith(model))) {
  console.log(`      AVÍS: "${model}" no surt a la llista. Potser cal canviar GEMINI_TTS_MODEL.`);
}

// 2) Generar de debò uns segons d'àudio.
const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Llegeix en català: El gos guarda la casa." }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
      },
    }),
  }
);
if (!res.ok) {
  console.error(`\n[2/2] Generar veu: FALLA ${res.status}`);
  console.error(await res.text());
  process.exit(1);
}
const part = (await res.json())?.candidates?.[0]?.content?.parts?.find((p) => p?.inlineData?.data);
if (!part) {
  console.error("\n[2/2] Generar veu: la resposta no porta àudio.");
  process.exit(1);
}
const bytes = Buffer.from(part.inlineData.data, "base64").length;
console.log(`\n[2/2] Generar veu: OK — ${bytes} bytes, ${part.inlineData.mimeType}`);
console.log("\nGemini funciona. Els dictats nous amb la casella d'àudio marcada ja el faran servir.");
