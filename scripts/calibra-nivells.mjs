/**
 * Calibra els nivells B1-C2 contra els dictats oficials de la Generalitat.
 *
 * Fins ara "dictat de nivell C1" era una intencio: la IA rebia el nom del
 * nivell i el que sortis, sortia. Ningu comprovava que s'assemblés a un C1 de
 * debo. Aixo mesura 379 dictats oficials i n'extreu el perfil, perque el que
 * generem es pugui comparar amb alguna cosa.
 *
 *   node scripts/calibra-nivells.mjs
 *
 * IMPORTANT: els textos oficials NO es desen mai al repositori. Es descarreguen
 * a una carpeta temporal, se'n treuen els numeros i prou. Publicar-los seria
 * redistribuir-los, i aixo ja son figues d'un altre paner.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const FONT = "https://www.gencat.cat/llengua/dictats/dictats.xml";
const NIVELLS = { 1: "B1", 2: "B2", 3: "C1", 4: "C2" };

function entre(bloc, camp) {
  // Cerca literal en lloc d'expressio construida: amb <text> i <text_marcat>
  // convivint, una expressio mal escapada busca coses que no son i torna buit
  // sense queixar-se, que es la pitjor manera de fallar.
  const obre = `<${camp}>`;
  const tanca = `</${camp}>`;
  const i = bloc.indexOf(obre);
  if (i === -1) return "";
  const j = bloc.indexOf(tanca, i + obre.length);
  if (j === -1) return "";
  return bloc.slice(i + obre.length, j);
}

/** Treu la numeracio de frase i les marques del text_marcat. */
function nateja(text) {
  return text
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/^\s*\d+\.\s*/gm, " ")
    .replace(/--/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mesura(text, marcat) {
  const net = nateja(text);
  const paraules = net.split(/\s+/).filter(Boolean);
  const frases = net.split(/(?<=[.!?])\s+/).filter((f) => f.trim().length > 3);
  // Les paraules avaluades venen marcades _aixi__ al text_marcat: son les que
  // el dictat posa a prova de debo.
  const marcades = (marcat.match(/_[^_\s]+__/g) || []).length;
  const llargues = paraules.filter((p) => p.replace(/[^\p{L}]/gu, "").length > 7).length;
  const comes = (net.match(/,/g) || []).length;

  return {
    paraules: paraules.length,
    frases: frases.length,
    paraulesPerFrase: frases.length ? paraules.length / frases.length : 0,
    marcadesPer100: paraules.length ? (marcades / paraules.length) * 100 : 0,
    llarguesPercent: paraules.length ? (llargues / paraules.length) * 100 : 0,
    comesPerFrase: frases.length ? comes / frases.length : 0,
  };
}

const mediana = (v) => {
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const percentil = (v, p) => {
  const s = [...v].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * s.length) - 1))];
};
const arrodoneix = (n, d = 1) => Number(n.toFixed(d));

console.log("Baixant el corpus oficial…");
const xml = await fetch(FONT).then((r) => {
  if (!r.ok) throw new Error(`No s'ha pogut baixar el corpus: ${r.status}`);
  return r.text();
});

// Es desa fora del repositori, nomes per si cal repassar-ho a ma.
const carpeta = join(tmpdir(), "dictats-oficials");
mkdirSync(carpeta, { recursive: true });
writeFileSync(join(carpeta, "dictats.xml"), xml);
console.log(`Corpus desat fora del repositori: ${carpeta}\n`);

const blocs = xml.match(/<Entrades>[\s\S]*?<\/Entrades>/g) || [];
const perNivell = {};

for (const bloc of blocs) {
  const nivell = NIVELLS[entre(bloc, "nivell")];
  const text = entre(bloc, "text");
  if (!nivell || !text) continue;
  (perNivell[nivell] ??= []).push(mesura(text, entre(bloc, "text_marcat")));
}

const perfil = {};
for (const [nivell, mostres] of Object.entries(perNivell)) {
  const camp = (k) => mostres.map((m) => m[k]);
  perfil[nivell] = {
    mostres: mostres.length,
    paraules: {
      min: percentil(camp("paraules"), 10),
      mediana: arrodoneix(mediana(camp("paraules")), 0),
      max: percentil(camp("paraules"), 90),
    },
    frases: arrodoneix(mediana(camp("frases")), 0),
    paraulesPerFrase: arrodoneix(mediana(camp("paraulesPerFrase"))),
    marcadesPer100: arrodoneix(mediana(camp("marcadesPer100"))),
    llarguesPercent: arrodoneix(mediana(camp("llarguesPercent"))),
    comesPerFrase: arrodoneix(mediana(camp("comesPerFrase"))),
  };
}

console.log("Perfil mesurat sobre els dictats oficials:\n");
console.log("nivell  n   paraules(p10-p90)  med  par/frase  marcades/100  llargues%  comes/frase");
for (const n of ["B1", "B2", "C1", "C2"]) {
  const p = perfil[n];
  if (!p) continue;
  console.log(
    `${n.padEnd(6)} ${String(p.mostres).padEnd(3)} ` +
      `${String(p.paraules.min).padStart(4)}-${String(p.paraules.max).padEnd(4)}      ` +
      `${String(p.paraules.mediana).padStart(4)}  ` +
      `${String(p.paraulesPerFrase).padStart(8)}  ` +
      `${String(p.marcadesPer100).padStart(11)}  ` +
      `${String(p.llarguesPercent).padStart(8)}  ` +
      `${String(p.comesPerFrase).padStart(10)}`
  );
}

const desti = "src/lib/level-profiles.json";
writeFileSync(
  desti,
  JSON.stringify(
    {
      _comentari:
        "Perfil mesurat sobre els dictats oficials de la Generalitat de Catalunya. " +
        "Nomes numeros derivats: cap text original no es desa aqui. " +
        "Regenerar amb: node scripts/calibra-nivells.mjs",
      _font: FONT,
      _mesuratEl: new Date().toISOString().slice(0, 10),
      perfil,
    },
    null,
    2
  ) + "\n"
);
console.log(`\nPerfil desat a ${desti}`);
