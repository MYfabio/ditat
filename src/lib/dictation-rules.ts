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

/** Regles que el currículum ja espera dominar en un curs donat. */
export function rulesExpectedAt(gradeLevel: string) {
  const current = gradeIndex(gradeLevel);
  if (current < 0) return [...ORTHOGRAPHIC_RULES];
  return ORTHOGRAPHIC_RULES.filter((r) => gradeIndex(r.expectedFrom) <= current);
}
