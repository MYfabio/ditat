import { ORTHOGRAPHIC_RULES, gradeIndex, ruleLabel } from "@/lib/dictation-rules";

/**
 * Arbre de competencies ortografiques: cada regla del curriculum es divideix en
 * habilitats petites, que son les que de debo es dominen o no per separat.
 *
 * Un alumne pot accentuar be les agudes i fallar sistematicament les
 * esdruixoles: si nomes es mesura "accentuacio" com un tot, aquesta diferencia
 * queda amagada i el seguent dictat no la pot atacar.
 *
 * La clau d'una subhabilitat es "regla.subhabilitat" i es el que es desa a
 * StudentSkillState. La clau de la regla sola (sense punt) tambe es valida:
 * es el que va a Dictation.targetRule i el que tria el docent.
 */
export const TAXONOMY_VERSION = 1;

export type Subskill = {
  /** Clau completa, "accentuacio.agudes". */
  key: string;
  label: string;
};

export type Competency = {
  /** Clau de la regla, tal com viu a Dictation.targetRule. */
  key: string;
  label: string;
  /** Curs a partir del qual el curriculum ja l'espera dominada. */
  expectedFrom: string;
  subskills: Subskill[];
};

/**
 * Subhabilitats per regla. Nomes el tros final: la clau completa es munta a
 * sota, per no haver de repetir el prefix a cada linia i no poder-lo
 * descuadrar.
 */
const SUBSKILLS: Record<string, [string, string][]> = {
  "c-qu-g-gu": [
    ["c-forta", "c davant a, o, u"],
    ["qu", "qu davant e, i"],
    ["g-forta", "g davant a, o, u"],
    ["gu", "gu davant e, i"],
  ],
  "h-muda": [
    ["inicial", "h a principi de paraula"],
    ["intercalada", "h enmig de paraula"],
    ["sense-h", "Paraules que no en porten"],
  ],
  "j-g": [
    ["j", "j davant a, o, u"],
    ["g", "g davant e, i"],
    ["tg-tj", "tg i tj"],
  ],
  "s-ss-c-z": [
    ["s-sonora", "s sonora entre vocals"],
    ["ss", "ss entre vocals"],
    ["c-trencada", "c i ç"],
    ["z", "z"],
  ],
  "b-v": [
    ["b", "Paraules amb b"],
    ["v", "Paraules amb v"],
    ["families", "Famílies de paraules"],
  ],
  "x-ix": [
    ["x-inicial", "x a principi de paraula"],
    ["ix", "ix darrere vocal"],
    ["tx", "tx"],
  ],
  "l-l": [
    ["geminada", "l·l geminada"],
    ["ll", "ll"],
    ["l-simple", "l simple"],
  ],
  apostrofacio: [
    ["article", "Apòstrof de l'article"],
    ["preposicio", "Apòstrof de la preposició de"],
    ["excepcions", "Excepcions (la una, la host…)"],
    ["contraccions", "Contraccions (al, del, pel)"],
  ],
  accentuacio: [
    ["agudes", "Paraules agudes"],
    ["planes", "Paraules planes"],
    ["esdruixoles", "Paraules esdrúixoles"],
    ["obert-tancat", "Accent obert i tancat"],
    ["diacritics", "Accents diacrítics"],
  ],
  dieresi: [
    ["hiat", "Dièresi en hiat"],
    ["gu-qu", "güe, güi, qüe, qüi"],
    ["excepcions", "Excepcions (infinitius, sufixos)"],
  ],
};

export const TAXONOMY: Competency[] = ORTHOGRAPHIC_RULES.map((rule) => ({
  key: rule.value,
  label: rule.label,
  expectedFrom: rule.expectedFrom,
  subskills: (SUBSKILLS[rule.value] ?? []).map(([suffix, label]) => ({
    key: `${rule.value}.${suffix}`,
    label,
  })),
}));

const BY_KEY = new Map(TAXONOMY.map((c) => [c.key, c]));

/** La regla a la qual pertany una habilitat: "accentuacio.agudes" -> "accentuacio". */
export function competencyOf(skillKey: string) {
  return skillKey.split(".")[0];
}

export function competency(key: string) {
  return BY_KEY.get(competencyOf(key)) ?? null;
}

/** Totes les subhabilitats de totes les regles, en ordre de curriculum. */
export function allSubskills(): Subskill[] {
  return TAXONOMY.flatMap((c) => c.subskills);
}

/**
 * Nom llegible d'una habilitat, sigui regla o subhabilitat.
 * "accentuacio.agudes" -> "Accentuació: Paraules agudes".
 */
export function skillLabel(skillKey: string) {
  const comp = competency(skillKey);
  if (!comp) return skillKey;
  if (!skillKey.includes(".")) return comp.label;
  const sub = comp.subskills.find((s) => s.key === skillKey);
  return sub ? `${comp.label}: ${sub.label}` : comp.label;
}

/** Habilitats que el curriculum ja espera dominades en un curs donat. */
export function skillsExpectedAt(gradeLevel: string): string[] {
  const current = gradeIndex(gradeLevel);
  const reached =
    current < 0 ? TAXONOMY : TAXONOMY.filter((c) => gradeIndex(c.expectedFrom) <= current);
  // Una regla sense subhabilitats definides encara es una habilitat mesurable
  // per ella mateixa: val mes comptar-la que deixar-la fora del curriculum.
  return reached.flatMap((c) => (c.subskills.length ? c.subskills.map((s) => s.key) : [c.key]));
}

export function isKnownSkill(skillKey: string) {
  if (!BY_KEY.has(competencyOf(skillKey))) return false;
  if (!skillKey.includes(".")) return true;
  return allSubskills().some((s) => s.key === skillKey);
}

export { ruleLabel };
