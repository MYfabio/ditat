import { isKnownSkill } from "@/lib/skill-taxonomy";

/**
 * Classifica cada diferencia entre el dictat i el que ha escrit l'alumne.
 *
 * Es logica de l'aplicacio i no una pregunta al model a proposit: el perfil
 * d'aprenentatge es construeix damunt d'aixo, i ha de sortir igual avui i
 * d'aqui a sis mesos amb la mateixa entrada. Un model que un dia digui
 * "accentuacio" i un altre "ortografia" per la mateixa paraula faria que el
 * domini d'un alumne depengues del temps que fa que es va corregir.
 */
export const CLASSIFIER_VERSION = 1;

export type ErrorType =
  | "omissio"
  | "addicio"
  | "substitucio"
  | "puntuacio"
  | "majuscules"
  | "ortografia";

export type ClassifiedError = {
  paraulaOriginal: string;
  paraulaEscrita: string;
  explicacio: string;
  type: ErrorType;
  /** Habilitat de la taxonomia a la qual s'atribueix, si s'ha pogut deduir. */
  skill: string | null;
  /** Es un error de la regla que treballava el dictat. */
  isTarget: boolean;
  /** Confianca amb que l'OCR va llegir la paraula, d'1 quan no ve de foto. */
  ocrConfidence: number;
  /**
   * Si aquest error ha de moure el perfil de l'alumne. Una lectura dubtosa es
   * mostra i s'explica, pero no compta: no es pot penalitzar per una lletra
   * que potser ni tan sols ha escrit malament.
   */
  countForLearning: boolean;
};

/** Per sota d'aixo, la lectura de l'OCR no es prou fiable per comptar-la. */
export const OCR_CONFIDENCE_THRESHOLD = 0.75;

/** Marca que l'avaluacio posa quan l'alumne s'ha deixat una paraula. */
const MISSING = "(falta)";

const PUNCTUATION = /[.,;:!?"'«»()¿¡\-—–]/g;

function stripDiacritics(word: string) {
  return word.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function bare(word: string) {
  return word.toLowerCase().replace(PUNCTUATION, "");
}

function letters(word: string) {
  return stripDiacritics(bare(word));
}

/** Quines lletres canvien entre dues paraules, alineades pel prefix i el sufix. */
function difference(expected: string, written: string) {
  let start = 0;
  while (start < expected.length && start < written.length && expected[start] === written[start]) {
    start++;
  }
  let end = 0;
  while (
    end < expected.length - start &&
    end < written.length - start &&
    expected[expected.length - 1 - end] === written[written.length - 1 - end]
  ) {
    end++;
  }
  return { start, end };
}

type Diff = { expected: string; written: string; before: string };

/**
 * Maneres de retallar el tros que canvia entre dues paraules.
 *
 * Cal mes d'una perque el tall minim amaga justament les regles que van de
 * lletres dobles: entre "passar" i "pasar" el minim es una "s" que sobra, i
 * el que de debo ha passat es que "ss" s'ha escrit "s". Per aixo, a mes del
 * tall minim, es prova eixamplant-lo una lletra a cada banda.
 */
function diffVariants(expected: string, written: string): Diff[] {
  const { start, end } = difference(expected, written);
  const variants: Diff[] = [];

  const cut = (from: number, toEndOffset: number) => {
    if (from < 0) return;
    if (expected.length - toEndOffset < from || written.length - toEndOffset < from) return;
    variants.push({
      expected: expected.slice(from, expected.length - toEndOffset),
      written: written.slice(from, written.length - toEndOffset),
      before: expected.slice(0, from),
    });
  };

  cut(start, end);
  cut(start - 1, end);
  cut(start, end - 1);
  return variants;
}

const VOWELS = "aeiou";

/**
 * A quina subhabilitat d'accentuacio correspon un accent, segons on cau la
 * sillaba tonica: ultima (aguda), penultima (plana) o abans (esdruixola).
 */
function accentSubskill(expected: string) {
  const word = bare(expected);
  if (/[üï]/.test(word)) return "dieresi.hiat";

  const accentIndex = [...word].findIndex((ch) => stripDiacritics(ch) !== ch);
  if (accentIndex < 0) return "accentuacio.obert-tancat";

  // Es compten els grups vocalics posteriors a l'accent: cap vol dir aguda,
  // un vol dir plana, mes vol dir esdruixola.
  let groups = 0;
  let inVowel = false;
  for (let i = accentIndex + 1; i < word.length; i++) {
    const isVowel = VOWELS.includes(stripDiacritics(word[i]));
    if (isVowel && !inVowel) groups++;
    inVowel = isVowel;
  }
  if (groups === 0) return "accentuacio.agudes";
  if (groups === 1) return "accentuacio.planes";
  return "accentuacio.esdruixoles";
}

/**
 * Parelles de lletres que identifiquen una regla concreta. Es mira que
 * s'esperava i que s'ha escrit al tros que canvia.
 */
const LETTER_RULES: { expected: RegExp; written: RegExp; skill: string }[] = [
  { expected: /^l·l$|^·l$|^·$/, written: /^l?l?$/, skill: "l-l.geminada" },
  { expected: /^ll$/, written: /^l$|^y$/, skill: "l-l.ll" },
  { expected: /^l$/, written: /^ll$/, skill: "l-l.l-simple" },
  { expected: /^b$/, written: /^v$/, skill: "b-v.b" },
  { expected: /^v$/, written: /^b$/, skill: "b-v.v" },
  { expected: /^ss$/, written: /^s$|^c$|^ç$/, skill: "s-ss-c-z.ss" },
  { expected: /^ll$/, written: /^l$|^y$|^i$/, skill: "l-l.ll" },
  { expected: /^s$/, written: /^ss$|^z$|^c$/, skill: "s-ss-c-z.s-sonora" },
  { expected: /^ç$|^c$/, written: /^s$|^ss$|^z$/, skill: "s-ss-c-z.c-trencada" },
  { expected: /^z$/, written: /^s$|^c$|^ss$/, skill: "s-ss-c-z.z" },
  { expected: /^tg$|^tj$/, written: /^g$|^j$|^tx$/, skill: "j-g.tg-tj" },
  { expected: /^g$/, written: /^j$/, skill: "j-g.g" },
  { expected: /^j$/, written: /^g$/, skill: "j-g.j" },
  { expected: /^ix$/, written: /^x$|^i$|^tx$|^$/, skill: "x-ix.ix" },
  { expected: /^tx$/, written: /^x$|^ix$|^ch$/, skill: "x-ix.tx" },
  { expected: /^x$/, written: /^ix$|^tx$|^s$/, skill: "x-ix.x-inicial" },
  { expected: /^qu$/, written: /^c$|^k$|^q$|^cu$|^ku$/, skill: "c-qu-g-gu.qu" },
  { expected: /^c$|^k$/, written: /^qu$|^q$/, skill: "c-qu-g-gu.c-forta" },
  { expected: /^gu$/, written: /^g$/, skill: "c-qu-g-gu.gu" },
  { expected: /^g$/, written: /^gu$/, skill: "c-qu-g-gu.g-forta" },
  { expected: /^rr$/, written: /^r$/, skill: "" },
];

/** La h nomes es h: no cal comparar-la amb res, o hi es o no hi es. */
function hSubskill(diff: { expected: string; written: string; before: string }) {
  const missing = diff.expected === "h" && diff.written === "";
  const added = diff.written === "h" && diff.expected === "";
  if (!missing && !added) return null;
  if (added) return "h-muda.sense-h";
  return diff.before === "" ? "h-muda.inicial" : "h-muda.intercalada";
}

/** L'apostrof i les contraccions es veuen a la paraula sencera, no en una lletra. */
function apostropheSkill(expected: string, written: string) {
  const e = expected.toLowerCase();
  const w = written.toLowerCase();
  const hadApostrophe = e.includes("'") || e.includes("’");
  const writesApostrophe = w.includes("'") || w.includes("’");
  if (hadApostrophe === writesApostrophe) return null;
  if (/^(al|del|pel|als|dels|pels)$/.test(e)) return "apostrofacio.contraccions";
  if (/^d/.test(e)) return "apostrofacio.preposicio";
  return "apostrofacio.article";
}

/**
 * A quina habilitat pertany un error, mirant nomes les lletres que canvien.
 * Retorna null quan no encaixa en cap regla coneguda: val mes no atribuir-lo
 * que atribuir-lo malament i moure un domini que no toca.
 */
export function classifySkill(expected: string, written: string): string | null {
  if (!expected || !written) return null;

  const apostrophe = apostropheSkill(expected, written);
  if (apostrophe) return apostrophe;

  // Mateixes lletres i nomes canvien els accents: es accentuacio o dieresi.
  if (letters(expected) === letters(written) && bare(expected) !== bare(written)) {
    return accentSubskill(expected);
  }

  const variants = diffVariants(bare(expected), bare(written));

  for (const diff of variants) {
    if (!diff.expected && !diff.written) continue;

    const h = hSubskill(diff);
    if (h) return h;

    for (const rule of LETTER_RULES) {
      if (rule.expected.test(diff.expected) && rule.written.test(diff.written)) {
        // Regla real del catala que la taxonomia d'aquesta app encara no cobreix.
        return rule.skill && isKnownSkill(rule.skill) ? rule.skill : null;
      }
    }
  }

  return scanLetterByLetter(bare(expected), bare(written));
}

/**
 * Ultim recurs quan la paraula porta mes d'una errada alhora ("fàcil" escrit
 * "fasil": hi falla l'accent i la c). Aleshores el tros que canvia es massa
 * gran per encaixar en cap regla, i cal mirar lletra per lletra.
 *
 * Es queda amb la primera regla que reconeix. Es una tria discutible quan n'hi
 * ha dues, pero atribuir l'errada a una habilitat real val mes que descartar
 * la paraula sencera i perdre-la del perfil.
 */
function scanLetterByLetter(expected: string, written: string): string | null {
  if (expected.length !== written.length) return null;

  for (let i = 0; i < expected.length; i++) {
    if (expected[i] === written[i]) continue;
    const diff = {
      expected: expected[i],
      written: written[i],
      before: expected.slice(0, i),
    };

    const h = hSubskill(diff);
    if (h) return h;

    for (const rule of LETTER_RULES) {
      if (rule.expected.test(diff.expected) && rule.written.test(diff.written)) {
        return rule.skill && isKnownSkill(rule.skill) ? rule.skill : null;
      }
    }
  }

  return null;
}

export function classifyType(expected: string, written: string): ErrorType {
  if (written === MISSING || !written) return "omissio";
  if (!expected) return "addicio";
  if (bare(expected) === bare(written)) {
    // Les lletres son les mateixes: el que canvia es la puntuacio o la caixa.
    // Si en minuscules ja son iguals, l'unic que canviava era la caixa; si no,
    // el que sobra o falta es un signe de puntuacio.
    return expected.toLowerCase() === written.toLowerCase() ? "majuscules" : "puntuacio";
  }
  if (expected.toLowerCase() === written.toLowerCase()) return "majuscules";
  return "substitucio";
}

export type RawError = {
  paraulaOriginal: string;
  paraulaEscrita: string;
  explicacio: string;
};

/**
 * Classifica els errors d'una entrega i decideix quins poden moure el perfil.
 *
 * `confidenceOf` diu com de segur estava l'OCR de cada paraula escrita; per a
 * un dictat teclejat sempre es 1, perque el text es exactament el que va
 * escriure l'alumne.
 */
export function classifyErrors(
  errors: RawError[],
  targetRule: string,
  confidenceOf: (writtenWord: string) => number
): ClassifiedError[] {
  return errors.map((error) => {
    const skill = classifySkill(error.paraulaOriginal, error.paraulaEscrita);
    const type = classifyType(error.paraulaOriginal, error.paraulaEscrita);
    const ocrConfidence =
      error.paraulaEscrita === MISSING ? 1 : confidenceOf(error.paraulaEscrita);

    return {
      ...error,
      type,
      skill,
      isTarget: skill ? skill.split(".")[0] === targetRule : false,
      ocrConfidence,
      countForLearning: ocrConfidence >= OCR_CONFIDENCE_THRESHOLD,
    };
  });
}
