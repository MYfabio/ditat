import {
  ORTHOGRAPHIC_RULES,
  rulesExpectedAt,
  ruleLabel,
  type OrthographicRuleValue,
} from "@/lib/dictation-rules";

export type SubmissionForProfile = {
  score: number | null;
  createdAt: Date;
  dictation: { targetRule: string; gradeLevel: string; rawText?: string };
  correctedData: unknown;
};

export type RuleStat = {
  rule: string;
  attempts: number;
  errors: number;
  averageScore: number;
  mastered: boolean;
};

export type ObservationSignal = {
  key: "reversals" | "persistent" | "omissions" | "cansament" | "constant";
  label: string;
  detail: string;
};

export type LearningProfile = {
  totalSubmissions: number;
  averageScore: number;
  perRule: RuleStat[];
  weakestRule: string | null;
  curriculumProgress: { expected: number; mastered: number; pending: string[] };
  observations: ObservationSignal[];
  summaryText: string;
  /**
   * Com li va anant a aquesta persona, comparada nomes amb ella mateixa.
   *
   * El docent no necessita saber qui es el millor de la classe: aixo ja ho
   * sap, i ordenar l'alumnat per nota no ajuda ningu. El que no pot veure a
   * simple vista es si algu que treu un 60% ve de treure'n 40 —va molt be— o
   * de treure'n 80 —alguna cosa passa.
   */
  progressio: {
    punts: number[];
    tendencia: "millora" | "estable" | "empitjora" | null;
    inici: number;
    ara: number;
  };
};

type EvaluationError = { paraulaOriginal: string; paraulaEscrita: string; explicacio: string };

/** Compara paraules sense accents ni puntuacio, per situar-les dins del text. */
function netejaParaula(p: string) {
  return p
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function readErrors(correctedData: unknown): EvaluationError[] {
  if (!correctedData || typeof correctedData !== "object") return [];
  const errors = (correctedData as { errors?: unknown }).errors;
  return Array.isArray(errors) ? (errors as EvaluationError[]) : [];
}

// Parells de lletres que s'inverteixen o giren amb mes freqüència.
const REVERSAL_PAIRS = [
  ["b", "d"],
  ["p", "q"],
  ["b", "p"],
  ["d", "q"],
  ["n", "u"],
  ["m", "w"],
];

function isReversalPair(a: string, b: string) {
  return REVERSAL_PAIRS.some(
    ([x, y]) => (a === x && b === y) || (a === y && b === x)
  );
}

/** Compta lletres confoses per gir/inversio entre la paraula correcta i l'escrita. */
function countReversals(original: string, written: string) {
  const o = original.toLowerCase();
  const w = written.toLowerCase();
  if (o.length !== w.length) return 0;
  let count = 0;
  for (let i = 0; i < o.length; i++) {
    if (o[i] !== w[i] && isReversalPair(o[i], w[i])) count++;
  }
  return count;
}

/** Detecta si l'alumne ha omes lletres dins d'una paraula (no paraules senceres). */
function isLetterOmission(original: string, written: string) {
  const o = original.toLowerCase();
  const w = written.toLowerCase();
  if (w.length >= o.length || w.length === 0) return false;
  let oi = 0;
  for (const ch of w) {
    while (oi < o.length && o[oi] !== ch) oi++;
    if (oi >= o.length) return false;
    oi++;
  }
  return o.length - w.length <= 3;
}

const MASTERY_SCORE = 85;
const MIN_ATTEMPTS_FOR_MASTERY = 2;

// Llindars deliberadament conservadors: cap observació salta abans d'acumular
// prou evidència repetida, perquè un avís en fals té un cost pedagògic alt.
const MIN_SUBMISSIONS_FOR_OBSERVATIONS = 4;
const MIN_REVERSALS = 5;
const MIN_OMISSIONS = 6;
const PERSISTENT_MIN_ATTEMPTS = 3;
const PERSISTENT_MAX_SCORE = 55;

export function buildLearningProfile(
  submissions: SubmissionForProfile[],
  gradeLevel: string
): LearningProfile {
  const evaluated = submissions.filter((s) => s.score !== null);
  const totalSubmissions = evaluated.length;

  const averageScore = totalSubmissions
    ? Math.round(evaluated.reduce((sum, s) => sum + (s.score ?? 0), 0) / totalSubmissions)
    : 0;

  const byRule = new Map<string, { attempts: number; errors: number; scoreSum: number }>();
  let reversals = 0;
  let omissions = 0;

  for (const sub of evaluated) {
    const rule = sub.dictation.targetRule;
    const entry = byRule.get(rule) ?? { attempts: 0, errors: 0, scoreSum: 0 };
    const errors = readErrors(sub.correctedData);
    entry.attempts += 1;
    entry.errors += errors.length;
    entry.scoreSum += sub.score ?? 0;
    byRule.set(rule, entry);

    for (const err of errors) {
      if (err.paraulaEscrita === "(falta)") continue;
      reversals += countReversals(err.paraulaOriginal, err.paraulaEscrita);
      if (isLetterOmission(err.paraulaOriginal, err.paraulaEscrita)) omissions++;
    }
  }

  const perRule: RuleStat[] = [...byRule.entries()].map(([rule, e]) => {
    const avg = Math.round(e.scoreSum / e.attempts);
    return {
      rule,
      attempts: e.attempts,
      errors: e.errors,
      averageScore: avg,
      mastered: e.attempts >= MIN_ATTEMPTS_FOR_MASTERY && avg >= MASTERY_SCORE,
    };
  });

  // La regla més fluixa es la de pitjor mitjana; si encara no s'ha practicat
  // cap regla del currículum del seu curs, es prioritza la primera pendent.
  const practised = [...perRule].sort((a, b) => a.averageScore - b.averageScore);
  const expectedRules = rulesExpectedAt(gradeLevel);
  const neverPractised = expectedRules.filter((r) => !byRule.has(r.value));

  let weakestRule: string | null = null;
  if (practised.length && practised[0].averageScore < MASTERY_SCORE) {
    weakestRule = practised[0].rule;
  } else if (neverPractised.length) {
    weakestRule = neverPractised[0].value;
  } else if (practised.length) {
    weakestRule = practised[0].rule;
  }

  const masteredCount = expectedRules.filter(
    (r) => perRule.find((p) => p.rule === r.value)?.mastered
  ).length;

  // On cauen les errades dins del text, no nomes quantes n'hi ha.
  //
  // Els mateixos errors —omissions, substitucions, inversions— apareixen tant
  // en dislexia com en TDAH, i comptar-los no els distingeix. El que si els
  // separa es la distribucio: qui te una dificultat instrumental falla igual
  // des de la primera linia, mentre que qui es cansa d'atendre comença be i es
  // va deteriorant a mesura que avança el text.
  //
  // Aixo NO diagnostica res, i no s'anomena cap trastorn enlloc: nomes descriu
  // on cauen les errades, que es una cosa que el docent no pot veure a ull
  // repassant dictats i que li serveix per parlar amb l'equip d'orientacio.
  let errPrimeraMeitat = 0;
  let errSegonaMeitat = 0;
  for (const sub of evaluated) {
    const text = sub.dictation.rawText;
    if (!text) continue;
    const paraules = text.split(/\s+/).filter(Boolean);
    if (paraules.length < 20) continue;
    const migPunt = Math.floor(paraules.length / 2);
    for (const err of readErrors(sub.correctedData)) {
      const idx = paraules.findIndex(
        (w) => netejaParaula(w) === netejaParaula(err.paraulaOriginal)
      );
      if (idx === -1) continue;
      if (idx < migPunt) errPrimeraMeitat++;
      else errSegonaMeitat++;
    }
  }
  const errSituades = errPrimeraMeitat + errSegonaMeitat;

  const observations: ObservationSignal[] = [];
  if (totalSubmissions >= MIN_SUBMISSIONS_FOR_OBSERVATIONS) {
    if (reversals >= MIN_REVERSALS) {
      observations.push({
        key: "reversals",
        label: "Confusio recurrent de lletres simetriques",
        detail: `S'han comptat ${reversals} confusions entre lletres com b/d o p/q al llarg de ${totalSubmissions} dictats.`,
      });
    }
    if (omissions >= MIN_OMISSIONS) {
      observations.push({
        key: "omissions",
        label: "Omissio frequent de lletres dins la paraula",
        detail: `S'han detectat ${omissions} paraules escrites amb lletres omeses.`,
      });
    }
    // Cal un grapat d'errades situades perque la proporcio vulgui dir res.
    if (errSituades >= 12) {
      const proporcioFinal = errSegonaMeitat / errSituades;
      if (proporcioFinal >= 0.68) {
        observations.push({
          key: "cansament",
          label: "Les errades es concentren al final dels dictats",
          detail: `De ${errSituades} errades situades, ${errSegonaMeitat} cauen a la segona meitat del text. Comença be i es va deteriorant a mesura que avança.`,
        });
      } else if (proporcioFinal >= 0.4 && proporcioFinal <= 0.6) {
        observations.push({
          key: "constant",
          label: "Les errades es reparteixen per tot el dictat",
          detail: `De ${errSituades} errades situades, ${errPrimeraMeitat} son a la primera meitat i ${errSegonaMeitat} a la segona: falla igual des del principi, no per cansament.`,
        });
      }
    }

    const persistent = perRule.filter(
      (r) => r.attempts >= PERSISTENT_MIN_ATTEMPTS && r.averageScore < PERSISTENT_MAX_SCORE
    );
    if (persistent.length) {
      observations.push({
        key: "persistent",
        label: "Dificultat persistent malgrat la pràctica",
        detail: `Regles amb poca millora després de ${PERSISTENT_MIN_ATTEMPTS} o mes intents: ${persistent
          .map((p) => p.rule)
          .join(", ")}.`,
      });
    }
  }

  // Es compara la primera meitat dels dictats amb la segona: amb poques dades
  // una recta de regressio balla massa, i mitja i mitja aguanta millor que un
  // dictat especialment bo o dolent no giri la conclusio.
  const cronologic = [...evaluated].sort(
    (x, y) => x.createdAt.getTime() - y.createdAt.getTime()
  );
  const punts = cronologic.map((x) => x.score ?? 0);
  const MINIM_PER_VEURE_TENDENCIA = 4;
  let tendencia: "millora" | "estable" | "empitjora" | null = null;
  let inici = 0;
  let ara = 0;
  if (punts.length >= MINIM_PER_VEURE_TENDENCIA) {
    const tall = Math.floor(punts.length / 2);
    const mitjana = (v: number[]) => Math.round(v.reduce((t, n) => t + n, 0) / v.length);
    inici = mitjana(punts.slice(0, tall));
    ara = mitjana(punts.slice(tall));
    const salt = ara - inici;
    // Cinc punts: per sota d'aixo es soroll, no una millora.
    tendencia = salt >= 5 ? "millora" : salt <= -5 ? "empitjora" : "estable";
  }

  const summaryText = totalSubmissions
    ? `${totalSubmissions} dictats corregits amb una mitjana del ${averageScore}%. ${
        masteredCount
      } de ${expectedRules.length} regles del currículum del seu curs consolidades.`
    : "Encara no hi ha dictats corregits per elaborar un perfil.";

  return {
    totalSubmissions,
    averageScore,
    perRule,
    weakestRule,
    curriculumProgress: {
      expected: expectedRules.length,
      mastered: masteredCount,
      pending: expectedRules
        .filter((r) => !perRule.find((p) => p.rule === r.value)?.mastered)
        .map((r) => r.value),
    },
    observations,
    summaryText,
    progressio: { punts, tendencia, inici, ara },
  };
}

export function isKnownRule(rule: string): rule is OrthographicRuleValue {
  return ORTHOGRAPHIC_RULES.some((r) => r.value === rule);
}

/**
 * Frase de progres per a l'alumne, comparant el perfil d'abans d'aquest dictat
 * amb el d'ara.
 *
 * Es diu nomes quan hi ha una millora concreta que es pot assenyalar: si no hi
 * ha res clar, val mes no dir res que felicitar per res.
 */
export function progressNote(
  before: LearningProfile,
  after: LearningProfile,
  ruleJustPractised: string
): string | null {
  // Sense historial previ no hi ha res amb que comparar: es el primer dictat.
  if (before.totalSubmissions === 0) return null;

  const wasMastered = new Set(before.perRule.filter((r) => r.mastered).map((r) => r.rule));
  const newlyMastered = after.perRule
    .filter((r) => r.mastered && !wasMastered.has(r.rule))
    .map((r) => ruleLabel(r.rule));

  if (newlyMastered.length) {
    return `Ja pots donar per apresa la regla ${newlyMastered.join(" i ")}: fa dos dictats seguits que la fas bé.`;
  }

  const previous = before.perRule.find((r) => r.rule === ruleJustPractised);
  const current = after.perRule.find((r) => r.rule === ruleJustPractised);
  if (previous && current && current.averageScore > previous.averageScore) {
    return `Has fet menys errades de ${ruleLabel(ruleJustPractised)} que en els dictats anteriors. Vas pel bon camí.`;
  }

  if (after.averageScore > before.averageScore) {
    return "Aquest dictat t'ha sortit millor que la teva mitjana. Continua així.";
  }

  return null;
}
