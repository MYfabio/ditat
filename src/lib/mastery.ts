/**
 * Com es calcula que domina un alumne de cada habilitat.
 *
 * Va a part del perfil i de la base de dades a proposit: es l'unic lloc on
 * viuen aquestes decisions, i queda versionat. El dia que els umbrals canviin
 * amb dades reals, la versio permet distingir les mesures velles de les noves
 * i recalcular-les, en lloc de barrejar-les sense saber-ho.
 */
export const MASTERY_ALGORITHM_VERSION = 1;

/**
 * Umbrals i pesos, tots en un sol lloc perque es puguin ajustar amb dades
 * reals sense haver de tocar la logica.
 */
export const MASTERY_PARAMS = {
  /** Per sota d'aixo, cal reforçar i abaixar complexitat. */
  reinforce: 0.6,
  /** Entre reinforce i consolidate, es continua practicant. */
  consolidate: 0.8,
  /** A partir d'aqui, es candidat a domini. */
  mastered: 0.9,
  /** Pes que perd cada intent anterior: el mes recent val mes. */
  recencyDecay: 0.75,
  /** Intents a partir dels quals la mesura es considera solida. */
  attemptsForConfidence: 5,
  /** Dies a partir dels quals una habilitat sense practicar perd fiabilitat. */
  staleAfterDays: 45,
  /** Intents seguits per sobre de `raiseAfterScore` per pujar dificultat. */
  raiseAfterStreak: 3,
  raiseAfterScore: 0.85,
  /** Intents seguits per sota de `reinforce` per aïllar l'habilitat. */
  lowerAfterStreak: 2,
  /**
   * Quant pesa la fiabilitat en triar la seguent habilitat. Com mes alt, mes
   * cal haver-ho vist repetidament perque una habilitat reorienti el curs.
   */
  confidenceWeight: 0.75,
  /** Escala de dificultat interna, independent del curs. */
  minDifficulty: 1,
  maxDifficulty: 5,
} as const;

export type SkillAttempt = {
  /** Encerts sobre el total, de 0 a 1. */
  ratio: number;
  at: Date;
  errors: number;
};

export type SkillState = {
  skill: string;
  mastery: number;
  confidence: number;
  attempts: number;
  errors: number;
  lastPracticedAt: Date | null;
};

export type SkillStage = "reforçar" | "practicar" | "consolidar" | "dominada";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

function daysSince(date: Date, now: Date) {
  return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * Domini d'una habilitat: mitjana dels intents amb els mes recents pesant mes.
 *
 * Es fa aixi i no amb la mitjana simple perque el que interessa es on es
 * l'alumne ara, no on era: qui va fallar cinc dictats i despres n'ha encertat
 * tres ha apres alguna cosa, i una mitjana plana ho amagaria durant setmanes.
 */
export function computeMastery(attempts: SkillAttempt[]) {
  if (!attempts.length) return 0;
  const newestFirst = [...attempts].sort((a, b) => b.at.getTime() - a.at.getTime());
  let weightedSum = 0;
  let weightTotal = 0;
  newestFirst.forEach((attempt, i) => {
    const weight = Math.pow(MASTERY_PARAMS.recencyDecay, i);
    weightedSum += clamp01(attempt.ratio) * weight;
    weightTotal += weight;
  });
  return clamp01(weightedSum / weightTotal);
}

/**
 * Fiabilitat de la mesura: puja amb el nombre d'intents i baixa quan fa massa
 * temps de l'ultim. Un 100 % de fa mig any no diu gaire res d'avui.
 */
export function computeConfidence(attempts: SkillAttempt[], now = new Date()) {
  if (!attempts.length) return 0;
  const evidence = 1 - Math.exp(-attempts.length / MASTERY_PARAMS.attemptsForConfidence);
  const last = attempts.reduce((a, b) => (a.at > b.at ? a : b)).at;
  const age = daysSince(last, now);
  const freshness =
    age <= MASTERY_PARAMS.staleAfterDays
      ? 1
      : clamp01(MASTERY_PARAMS.staleAfterDays / age);
  return clamp01(evidence * freshness);
}

export function buildSkillState(
  skill: string,
  attempts: SkillAttempt[],
  now = new Date()
): SkillState {
  return {
    skill,
    mastery: computeMastery(attempts),
    confidence: computeConfidence(attempts, now),
    attempts: attempts.length,
    errors: attempts.reduce((sum, a) => sum + a.errors, 0),
    lastPracticedAt: attempts.length
      ? attempts.reduce((a, b) => (a.at > b.at ? a : b)).at
      : null,
  };
}

export function stageOf(mastery: number): SkillStage {
  if (mastery < MASTERY_PARAMS.reinforce) return "reforçar";
  if (mastery < MASTERY_PARAMS.consolidate) return "practicar";
  if (mastery < MASTERY_PARAMS.mastered) return "consolidar";
  return "dominada";
}

/** Una habilitat es dona per apresa quan el domini es alt i la mesura es fiable. */
export function isMastered(state: SkillState) {
  return state.mastery >= MASTERY_PARAMS.mastered && state.confidence >= 0.5;
}

/**
 * Quina habilitat toca practicar ara.
 *
 * Es tria la de domini mes baix, pero una mesura poc fiable no pot manar tant
 * com una de solida: amb un sol intent fluix encara no se sap si es una
 * dificultat real o un mal dia, i val mes no reorientar-li el curs per aixo.
 */
export function pickNextSkill(states: SkillState[], pending: string[]): string | null {
  if (!states.length) return pending[0] ?? null;

  const practising = states.filter((s) => !isMastered(s));
  if (!practising.length) return pending[0] ?? null;

  const w = MASTERY_PARAMS.confidenceWeight;
  const priority = (s: SkillState) => (1 - s.mastery) * (1 - w + w * s.confidence);
  const sorted = [...practising].sort((a, b) => priority(b) - priority(a));

  // Una habilitat del curriculum que no s'ha practicat mai passa al davant
  // d'una que ja es porta a mig fer, si aquesta no va francament malament.
  const neverPractised = pending.find((skill) => !states.some((s) => s.skill === skill));
  if (neverPractised && sorted[0].mastery >= MASTERY_PARAMS.reinforce) return neverPractised;

  return sorted[0].skill;
}

/**
 * Dificultat recomanada per al seguent dictat, seguint la ratxa d'intents.
 *
 * Puja nomes amb evidencia repetida i baixa de seguida que hi ha dificultat:
 * equivocar-se a l'alça costa mes a l'alumne que quedar-se curt.
 */
export function recommendDifficulty(
  current: number,
  recentAttempts: SkillAttempt[]
): number {
  const { minDifficulty, maxDifficulty, raiseAfterStreak, raiseAfterScore } = MASTERY_PARAMS;
  const newestFirst = [...recentAttempts].sort((a, b) => b.at.getTime() - a.at.getTime());

  const good = newestFirst.slice(0, raiseAfterStreak);
  if (good.length === raiseAfterStreak && good.every((a) => a.ratio >= raiseAfterScore)) {
    return Math.min(current + 1, maxDifficulty);
  }

  const bad = newestFirst.slice(0, MASTERY_PARAMS.lowerAfterStreak);
  if (
    bad.length === MASTERY_PARAMS.lowerAfterStreak &&
    bad.every((a) => a.ratio < MASTERY_PARAMS.reinforce)
  ) {
    return Math.max(current - 1, minDifficulty);
  }

  return Math.min(Math.max(current, minDifficulty), maxDifficulty);
}
