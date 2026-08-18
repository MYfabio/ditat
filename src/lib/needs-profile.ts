/**
 * Perfil de necessitats educatives d'un alumne.
 *
 * Important: aquest perfil el DECLARA el docent, que és qui coneix l'alumne i
 * qui té la informació de l'equip d'orientació. No s'infereix mai de manera
 * automàtica a partir dels errors detectats: les observacions automàtiques
 * (veure `learning-profile.ts`) són un senyal per al docent, no una etiqueta.
 */
export type NeedsProfile = {
  /** Tipografia OpenDyslexic i vocabulari més senzill als dictats generats. */
  dyslexiaSupport: boolean;
  /** Mode d'alt contrast per defecte. */
  highContrast: boolean;
  /** Frases curtes i lectura d'una sola frase per bloc. */
  tdahPacing: boolean;
  /** Nota del docent (context, indicacions de l'equip d'orientació...). */
  notes?: string;
};

export const EMPTY_NEEDS_PROFILE: NeedsProfile = {
  dyslexiaSupport: false,
  highContrast: false,
  tdahPacing: false,
};

/** Normalitza el Json de la base de dades a un perfil complet i segur. */
export function parseNeedsProfile(raw: unknown): NeedsProfile {
  if (!raw || typeof raw !== "object") return { ...EMPTY_NEEDS_PROFILE };
  const p = raw as Record<string, unknown>;
  return {
    dyslexiaSupport: Boolean(p.dyslexiaSupport),
    highContrast: Boolean(p.highContrast),
    tdahPacing: Boolean(p.tdahPacing),
    notes: typeof p.notes === "string" && p.notes.trim() ? p.notes.trim() : undefined,
  };
}

export function hasAnyAdaptation(profile: NeedsProfile) {
  return profile.dyslexiaSupport || profile.highContrast || profile.tdahPacing;
}

/**
 * Adaptació que s'aplica al text generat. El ritme TDAH mana sobre el suport
 * de dislèxia perquè afecta l'estructura de les frases, no només el vocabulari.
 */
export function generationAdaptation(profile: NeedsProfile): "cap" | "tdah" | "dislexia" {
  if (profile.tdahPacing) return "tdah";
  if (profile.dyslexiaSupport) return "dislexia";
  return "cap";
}

/** Frases per bloc de lectura: amb ritme TDAH, d'una en una. */
export function sentencesPerChunk(profile: NeedsProfile) {
  return profile.tdahPacing ? 1 : 2;
}

/** Preajustos de centre: només serveixen com a valor inicial d'un alumne nou. */
export type SchoolNeePresets = {
  dyslexicFontDefault?: boolean;
  highContrastDefault?: boolean;
  tdahPacingDefault?: boolean;
};

export function profileFromSchoolPresets(raw: unknown): NeedsProfile {
  if (!raw || typeof raw !== "object") return { ...EMPTY_NEEDS_PROFILE };
  const p = raw as SchoolNeePresets;
  return {
    dyslexiaSupport: Boolean(p.dyslexicFontDefault),
    highContrast: Boolean(p.highContrastDefault),
    tdahPacing: Boolean(p.tdahPacingDefault),
  };
}
