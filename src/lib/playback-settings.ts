/** Com vol el docent que s'escolti un dictat concret. */
export type PlaybackSettings = {
  /** Velocitat inicial de la locució. */
  defaultSpeed: number;
  /** Vegades que l'alumne pot repetir cada frase; null = sense límit. */
  maxRepetitions: number | null;
  /** Amaga el text i impedeix que l'alumne el destapi mentre escriu. */
  forceHiddenScreen: boolean;
};

export const DEFAULT_PLAYBACK: PlaybackSettings = {
  defaultSpeed: 1,
  maxRepetitions: null,
  forceHiddenScreen: false,
};

export const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;

export function parsePlaybackSettings(raw: unknown): PlaybackSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PLAYBACK };
  const p = raw as Record<string, unknown>;

  const speed = Number(p.defaultSpeed);
  const reps = Number(p.maxRepetitions);

  return {
    defaultSpeed: SPEED_OPTIONS.includes(speed as (typeof SPEED_OPTIONS)[number])
      ? speed
      : DEFAULT_PLAYBACK.defaultSpeed,
    maxRepetitions: Number.isFinite(reps) && reps > 0 ? Math.floor(reps) : null,
    forceHiddenScreen: Boolean(p.forceHiddenScreen),
  };
}
