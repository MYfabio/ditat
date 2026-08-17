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

export const ORTHOGRAPHIC_RULES = [
  { value: "l-l", label: "La l·l geminada" },
  { value: "b-v", label: "Distincio b / v" },
  { value: "dieresi", label: "La dieresi (u, gu, qu)" },
  { value: "h-muda", label: "La h muda" },
  { value: "accentuacio", label: "Accentuacio (oberts i tancats)" },
  { value: "c-qu-g-gu", label: "c/qu i g/gu" },
  { value: "x-ix", label: "Els sons de x, ix, tx" },
  { value: "j-g", label: "Distincio j / g" },
  { value: "s-ss-c-z", label: "Els sons de s (s, ss, c, z)" },
  { value: "apostrofacio", label: "Apostrofacio d'article i preposicio" },
] as const;

export type GradeLevelValue = (typeof GRADE_LEVELS)[number]["value"];
export type OrthographicRuleValue = (typeof ORTHOGRAPHIC_RULES)[number]["value"];

export function gradeLabel(value: string) {
  return GRADE_LEVELS.find((g) => g.value === value)?.label ?? value;
}

export function ruleLabel(value: string) {
  return ORTHOGRAPHIC_RULES.find((r) => r.value === value)?.label ?? value;
}
