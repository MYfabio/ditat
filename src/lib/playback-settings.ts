/** Com vol el docent que s'escolti un dictat concret. */
export type PlaybackSettings = {
  /** Velocitat inicial de la locució. */
  defaultSpeed: number;
  /** Vegades que l'alumne pot repetir cada frase; null = sense límit. */
  maxRepetitions: number | null;
  /** Amaga el text i impedeix que l'alumne el destapi mentre escriu. */
  forceHiddenScreen: boolean;
  /**
   * Segons de compte enrere abans de començar a llegir, perquè l'alumne pugui
   * agafar el boli o posar les mans al teclat. 0 = comença de seguida.
   */
  countdownSeconds: number;
};

export const DEFAULT_PLAYBACK: PlaybackSettings = {
  defaultSpeed: 1,
  maxRepetitions: null,
  forceHiddenScreen: false,
  countdownSeconds: 3,
};

export const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5] as const;

export const COUNTDOWN_OPTIONS = [0, 3, 5, 10] as const;

export function parsePlaybackSettings(raw: unknown): PlaybackSettings {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PLAYBACK };
  const p = raw as Record<string, unknown>;

  const speed = Number(p.defaultSpeed);
  const reps = Number(p.maxRepetitions);
  const countdown = Number(p.countdownSeconds);

  return {
    defaultSpeed: SPEED_OPTIONS.includes(speed as (typeof SPEED_OPTIONS)[number])
      ? speed
      : DEFAULT_PLAYBACK.defaultSpeed,
    maxRepetitions: Number.isFinite(reps) && reps > 0 ? Math.floor(reps) : null,
    forceHiddenScreen: Boolean(p.forceHiddenScreen),
    // Els dictats creats abans que existis el compte enrere no porten el camp:
    // se'ls hi aplica el valor per defecte en lloc de deixar-los sense.
    countdownSeconds: COUNTDOWN_OPTIONS.includes(countdown as (typeof COUNTDOWN_OPTIONS)[number])
      ? countdown
      : DEFAULT_PLAYBACK.countdownSeconds,
  };
}
