import type { OcrWord } from "@/lib/ai/ocr";

/**
 * Marques que l'app dibuixa sobre la foto del dictat, imitant el que faria un
 * mestre amb el boligraf vermell:
 *
 * - `underline`: la paraula esta mal escrita, se subratlla i s'escriu la forma
 *   correcta a sobre.
 * - `accent`: nomes falla l'accentuacio; en lloc de subratllar tota la
 *   paraula, es marca la vocal que hauria de portar l'accent.
 * - `insert`: hi falta una paraula; es dibuixa un ganxo entre les dues
 *   paraules del costat amb la paraula que hi hauria d'anar.
 * - `review`: l'OCR no esta segur d'haver llegit be aquesta paraula. Es marca
 *   perque el docent hi pugui mirar, pero no es corregeix res: potser
 *   l'alumne l'havia escrit be i qui s'equivoca es la maquina.
 *
 * Les coordenades son relatives (0-1) com les de l'OCR.
 */
export type AnnotationKind = "underline" | "accent" | "insert" | "review";

export type Annotation = {
  kind: AnnotationKind;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Forma correcta que s'escriu al costat de la marca. */
  label: string;
  /** Per que esta marcada, per al text alternatiu i el detall. */
  note: string;
};

export type AnnotationError = {
  paraulaOriginal: string;
  paraulaEscrita: string;
  explicacio: string;
  /** Fals quan la lectura de l'OCR es dubtosa i l'error no es dona per bo. */
  countForLearning?: boolean;
};

/** Paraula que l'avaluacio marca com a absent del text de l'alumne. */
const MISSING = "(falta)";

function stripDiacritics(word: string) {
  return word.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function normalise(word: string) {
  return word
    .toLowerCase()
    .replace(/[.,;:!?"'«»()¿¡]/g, "")
    .trim();
}

/** Nomes canvia l'accentuacio: "cafe" per "café", "es" per "és". */
function isAccentOnly(original: string, written: string) {
  const o = normalise(original);
  const w = normalise(written);
  if (!o || o === w) return false;
  return stripDiacritics(o) === stripDiacritics(w);
}

/**
 * Dins d'una paraula accentuada, quina vocal porta l'accent.
 * Retorna la posicio relativa (0-1) dins la paraula, o null si no n'hi ha cap.
 */
function accentedVowelPosition(original: string) {
  const letters = [...normalise(original)];
  for (let i = 0; i < letters.length; i++) {
    if (stripDiacritics(letters[i]) !== letters[i]) {
      return letters.length > 1 ? i / letters.length : 0;
    }
  }
  return null;
}

/** Estreny el rectangle d'una paraula a la lletra que ocupa `position`. */
function letterBox(word: OcrWord, position: number, letterCount: number) {
  const letterWidth = word.width / Math.max(letterCount, 1);
  return {
    x: word.x + position * word.width,
    y: word.y,
    width: letterWidth,
    height: word.height,
  };
}

/**
 * Emparella cada error amb la paraula de la foto on s'ha comes.
 *
 * Es recorren les paraules de l'OCR en ordre de lectura i cada error consumeix
 * la seguent coincidencia a partir d'on va quedar l'anterior: aixi una paraula
 * repetida al text es marca a la linia on toca i no sempre a la primera.
 */
export function buildAnnotations(errors: AnnotationError[], words: OcrWord[]): Annotation[] {
  if (!words.length) return [];

  const annotations: Annotation[] = [];
  let cursor = 0;

  for (const error of errors) {
    const written = normalise(error.paraulaEscrita);
    const correct = error.paraulaOriginal;

    // Paraula que l'alumne s'ha deixat: es marca el forat despres de l'ultima
    // paraula emparellada, que es on hauria d'anar.
    if (!written || error.paraulaEscrita === MISSING) {
      // Si el que falta es la primera paraula de tot, el ganxo va davant de la
      // primera que si que hi ha; si no, darrere de l'ultima emparellada.
      const anchor = words[Math.min(cursor, words.length - 1)];
      if (!anchor) continue;
      const at = cursor === 0 ? anchor.x : Math.min(anchor.x + anchor.width, 0.99);
      annotations.push({
        kind: "insert",
        x: at,
        y: anchor.y,
        width: Math.min(anchor.width, 1 - at),
        height: anchor.height,
        label: correct,
        note: error.explicacio,
      });
      continue;
    }

    const index = words.findIndex((w, i) => i >= cursor && normalise(w.text) === written);
    if (index === -1) continue;
    const word = words[index];
    cursor = index + 1;

    // Lectura dubtosa: es marca per revisar, no es corregeix.
    if (error.countForLearning === false) {
      annotations.push({
        kind: "review",
        x: word.x,
        y: word.y,
        width: word.width,
        height: word.height,
        label: "?",
        note: error.explicacio,
      });
      continue;
    }

    const accentPosition = isAccentOnly(correct, word.text)
      ? accentedVowelPosition(correct)
      : null;

    if (accentPosition !== null) {
      annotations.push({
        kind: "accent",
        ...letterBox(word, accentPosition, normalise(correct).length),
        label: correct,
        note: error.explicacio,
      });
      continue;
    }

    annotations.push({
      kind: "underline",
      x: word.x,
      y: word.y,
      width: word.width,
      height: word.height,
      label: correct,
      note: error.explicacio,
    });
  }

  return annotations;
}

/** Llegeix les marques desades dins `Submission.correctedData`. */
export function readAnnotations(correctedData: unknown): Annotation[] {
  if (!correctedData || typeof correctedData !== "object") return [];
  const marks = (correctedData as { annotations?: unknown }).annotations;
  return Array.isArray(marks) ? (marks as Annotation[]) : [];
}
