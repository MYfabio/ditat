export const GRADE_LEVELS = [
  { value: "1-primaria", label: "1r Primaria" },
  { value: "2-primaria", label: "2n Primaria" },
  { value: "3-primaria", label: "3r Primaria" },
  { value: "4-primaria", label: "4t Primaria" },
  { value: "5-primaria", label: "5e Primaria" },
  { value: "6-primaria", label: "6e Primaria" },
  { value: "1-eso", label: "1r ESO" },
  { value: "2-eso", label: "2n ESO" },
  { value: "3-eso", label: "3r ESO" },
  { value: "4-eso", label: "4t ESO" },
] as const;

// `expectedFrom` es el curs a partir del qual el curriculum de Catalunya
// espera que l'alumnat domini la regla. Serveix per mesurar el progres
// individual respecte del que li tocaria per la seva etapa.
export const ORTHOGRAPHIC_RULES = [
  { value: "c-qu-g-gu", label: "c/qu i g/gu", expectedFrom: "2-primaria" },
  { value: "h-muda", label: "La h muda", expectedFrom: "2-primaria" },
  { value: "j-g", label: "Distincio j / g", expectedFrom: "3-primaria" },
  { value: "s-ss-c-z", label: "Els sons de s (s, ss, c, z)", expectedFrom: "3-primaria" },
  { value: "b-v", label: "Distincio b / v", expectedFrom: "3-primaria" },
  { value: "x-ix", label: "Els sons de x, ix, tx", expectedFrom: "4-primaria" },
  { value: "l-l", label: "La l·l geminada", expectedFrom: "4-primaria" },
  { value: "apostrofacio", label: "Apostrofacio d'article i preposicio", expectedFrom: "4-primaria" },
  { value: "accentuacio", label: "Accentuacio (oberts i tancats)", expectedFrom: "5-primaria" },
  { value: "dieresi", label: "La dieresi (u, gu, qu)", expectedFrom: "6-primaria" },
] as const;

export type GradeLevelValue = (typeof GRADE_LEVELS)[number]["value"];
export type OrthographicRuleValue = (typeof ORTHOGRAPHIC_RULES)[number]["value"];

export function gradeLabel(value: string) {
  return GRADE_LEVELS.find((g) => g.value === value)?.label ?? value;
}

export function ruleLabel(value: string) {
  return ORTHOGRAPHIC_RULES.find((r) => r.value === value)?.label ?? value;
}

export function gradeIndex(value: string) {
  return GRADE_LEVELS.findIndex((g) => g.value === value);
}

/** Regles que el curriculum ja espera dominar en un curs donat. */
export function rulesExpectedAt(gradeLevel: string) {
  const current = gradeIndex(gradeLevel);
  if (current < 0) return [...ORTHOGRAPHIC_RULES];
  return ORTHOGRAPHIC_RULES.filter((r) => gradeIndex(r.expectedFrom) <= current);
}
