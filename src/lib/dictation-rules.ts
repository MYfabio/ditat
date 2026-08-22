export const GRADE_LEVELS = [
  { value: "1-primaria", label: "1r Primària" },
  { value: "2-primaria", label: "2n Primària" },
  { value: "3-primaria", label: "3r Primària" },
  { value: "4-primaria", label: "4t Primària" },
  { value: "5-primaria", label: "5è Primària" },
  { value: "6-primaria", label: "6è Primària" },
  { value: "1-eso", label: "1r ESO" },
  { value: "2-eso", label: "2n ESO" },
  { value: "3-eso", label: "3r ESO" },
  { value: "4-eso", label: "4t ESO" },
] as const;

// `expectedFrom` es el curs a partir del qual el currículum de Catalunya
// espera que l'alumnat domini la regla. Serveix per mesurar el progres
// individual respecte del que li tocaria per la seva etapa.
export const ORTHOGRAPHIC_RULES = [
  { value: "c-qu-g-gu", label: "c/qu i g/gu", expectedFrom: "2-primaria" },
  { value: "h-muda", label: "La h muda", expectedFrom: "2-primaria" },
  { value: "j-g", label: "Distinció j / g", expectedFrom: "3-primaria" },
  { value: "s-ss-c-z", label: "Els sons de s (s, ss, c, z)", expectedFrom: "3-primaria" },
  { value: "b-v", label: "Distinció b / v", expectedFrom: "3-primaria" },
  { value: "x-ix", label: "Els sons de x, ix, tx", expectedFrom: "4-primaria" },
  { value: "l-l", label: "La l·l geminada", expectedFrom: "4-primaria" },
  { value: "apostrofacio", label: "Apostrofació d'article i preposició", expectedFrom: "4-primaria" },
  { value: "accentuacio", label: "Accentuació (oberts i tancats)", expectedFrom: "5-primaria" },
  { value: "dieresi", label: "La dièresi (u, gu, qu)", expectedFrom: "6-primaria" },
] as const;

/**
 * Nivells del Marc europeu, per a qui es prepara pel seu compte una
 * certificacio i no cursa cap curs escolar.
 *
 * Van a part dels cursos i no els substitueixen: un adult que es presenta al
 * C1 no es un alumne de 4t d'ESO, encara que el curriculum els demani coses
 * semblants. `equivalentGrade` nomes serveix per saber quines regles se li
 * suposen apreses, que es l'unic on les dues escales s'han de tocar.
 */
export const MCER_LEVELS = [
  { value: "A1", label: "A1 (inicial)", equivalentGrade: "2-primaria" },
  { value: "A2", label: "A2 (basic)", equivalentGrade: "4-primaria" },
  { value: "B1", label: "B1 (llindar)", equivalentGrade: "6-primaria" },
  { value: "B2", label: "B2 (avancat)", equivalentGrade: "2-eso" },
  { value: "C1", label: "C1 (domini funcional)", equivalentGrade: "4-eso" },
  { value: "C2", label: "C2 (mestratge)", equivalentGrade: "4-eso" },
] as const;

export type McerLevelValue = (typeof MCER_LEVELS)[number]["value"];

/** El curs escolar equivalent a un nivell, per mesurar-hi el curriculum. */
export function curriculumGradeFor(level: string) {
  return MCER_LEVELS.find((l) => l.value === level)?.equivalentGrade ?? level;
}

export function isMcerLevel(level: string): level is McerLevelValue {
  return MCER_LEVELS.some((l) => l.value === level);
}

export type GradeLevelValue = (typeof GRADE_LEVELS)[number]["value"];
export type OrthographicRuleValue = (typeof ORTHOGRAPHIC_RULES)[number]["value"];

export function gradeLabel(value: string) {
  return (
    GRADE_LEVELS.find((g) => g.value === value)?.label ??
    MCER_LEVELS.find((l) => l.value === value)?.label ??
    value
  );
}

export function ruleLabel(value: string) {
  return ORTHOGRAPHIC_RULES.find((r) => r.value === value)?.label ?? value;
}

export function gradeIndex(value: string) {
  return GRADE_LEVELS.findIndex((g) => g.value === curriculumGradeFor(value));
}

// Llargada recomanada del dictat per etapa educativa (en paraules).
export const TEXT_LENGTH_BY_CYCLE = [
  {
    cycle: "Cicle inicial",
    ages: "6-7 anys",
    grades: ["1-primaria", "2-primaria"],
    min: 20,
    max: 40,
    guidance: "Frases simples i paraules molt habituals.",
  },
  {
    cycle: "Cicle mitjà",
    ages: "8-9 anys",
    grades: ["3-primaria", "4-primaria"],
    min: 40,
    max: 70,
    guidance: "Inclou regles ortogràfiques bàsiques ja treballades.",
  },
  {
    cycle: "Cicle superior",
    ages: "10-12 anys",
    grades: ["5-primaria", "6-primaria"],
    min: 70,
    max: 120,
    guidance: "Més complexitat i ús de signes de puntuació.",
  },
  {
    cycle: "Secundària",
    ages: "12-16 anys",
    grades: ["1-eso", "2-eso", "3-eso", "4-eso"],
    min: 120,
    max: 150,
    guidance: "Textos fluids amb ortografia avançada.",
  },
] as const;

/**
 * Llargada per a qui es prepara una certificacio. No es la del curs
 * equivalent: un adult de nivell A2 llegeix i escriu mes de pressa que un nen
 * de 4t, encara que ortograficament se li demani el mateix.
 */
/**
 * Llargada del dictat per nivell del MECR, en paraules.
 *
 * De B1 a C2 no son xifres triades a ull: surten de mesurar els 379 dictats
 * oficials de la Generalitat (percentils 10 i 90 de cada nivell). Abans un C1
 * es generava d'entre 140 i 180 paraules quan la mediana oficial es 205: tots
 * els C1 sortien curts i ningu ho podia saber, perque no hi havia res amb que
 * comparar-los.
 *
 * A1 i A2 continuen estimats: la Generalitat no en publica dictats.
 *
 * Es regeneren amb: node scripts/calibra-nivells.mjs
 */
export const TEXT_LENGTH_BY_MCER: Record<string, { min: number; max: number }> = {
  A1: { min: 30, max: 50 },
  A2: { min: 50, max: 80 },
  B1: { min: 43, max: 159 },
  B2: { min: 120, max: 205 },
  C1: { min: 157, max: 229 },
  C2: { min: 163, max: 238 },
};

export function lengthForGrade(gradeLevel: string) {
  const mcer = TEXT_LENGTH_BY_MCER[gradeLevel];
  if (mcer) {
    const level = MCER_LEVELS.find((l) => l.value === gradeLevel);
    return {
      ...mcer,
      cycle: level?.label ?? gradeLevel,
      ages: "preparacio de certificacio",
      guidance: "Text per a persona adulta que es prepara aquest nivell.",
    };
  }
  return (
    TEXT_LENGTH_BY_CYCLE.find((c) => (c.grades as readonly string[]).includes(gradeLevel)) ??
    TEXT_LENGTH_BY_CYCLE[1]
  );
}

export function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Regles que el currículum ja espera dominar en un curs donat. */
export function rulesExpectedAt(gradeLevel: string) {
  const current = gradeIndex(gradeLevel);
  if (current < 0) return [...ORTHOGRAPHIC_RULES];
  return ORTHOGRAPHIC_RULES.filter((r) => gradeIndex(r.expectedFrom) <= current);
}

/**
 * Com ha de ser la frase a cada nivell, mesurat sobre els dictats oficials.
 *
 * La llargada tota sola no distingeix un C1 d'un C2: la mediana oficial es 205
 * i 202 paraules, gairebe la mateixa. El que canvia es la frase —18,5 paraules
 * de mitjana a C1, 20,3 a C2— i el vocabulari. Sense aixo, demanar "nivell C2"
 * nomes feia textos una mica mes llargs, que no es el mateix.
 */
export const MCER_STYLE: Record<string, { paraulesPerFrase: number; llarguesPercent: number }> = {
  A1: { paraulesPerFrase: 9, llarguesPercent: 6 },
  A2: { paraulesPerFrase: 12, llarguesPercent: 8 },
  B1: { paraulesPerFrase: 14.4, llarguesPercent: 11 },
  B2: { paraulesPerFrase: 17.8, llarguesPercent: 14.3 },
  C1: { paraulesPerFrase: 18.5, llarguesPercent: 14.9 },
  C2: { paraulesPerFrase: 20.3, llarguesPercent: 16.1 },
};

/** Instruccions d'estil per al nivell, si en tenim de mesurades. */
export function styleGuidanceFor(level: string): string | null {
  const e = MCER_STYLE[level];
  if (!e) return null;
  return (
    `Frases d'unes ${Math.round(e.paraulesPerFrase)} paraules de mitjana, amb subordinacio ` +
    `propia del nivell. Al voltant d'un ${Math.round(e.llarguesPercent)}% de les paraules han ` +
    `de tenir mes de set lletres: vocabulari precis i no infantil.`
  );
}
