import { ORTHOGRAPHIC_RULES, rulesExpectedAt, type OrthographicRuleValue } from "@/lib/dictation-rules";

export type SubmissionForProfile = {
  score: number | null;
  createdAt: Date;
  dictation: { targetRule: string; gradeLevel: string };
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
  key: "reversals" | "persistent" | "omissions";
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
};

type EvaluationError = { paraulaOriginal: string; paraulaEscrita: string; explicacio: string };

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
  };
}

export function isKnownRule(rule: string): rule is OrthographicRuleValue {
  return ORTHOGRAPHIC_RULES.some((r) => r.value === rule);
}
