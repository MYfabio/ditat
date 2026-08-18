"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const STORAGE_KEY = "dictatsia:accessibility-prefs";

export type Prefs = { dyslexicFont: boolean; highContrast: boolean };

const DEFAULT_PREFS: Prefs = { dyslexicFont: false, highContrast: false };

const listeners = new Set<() => void>();

// Adaptacions declarades pel docent per a aquest alumne. Són el punt de
// partida; si l'alumne toca els controls, la seva tria (a localStorage) mana.
let assignedPrefs: Prefs = DEFAULT_PREFS;

let cachedRaw: string | null | undefined;
let cachedPrefs: Prefs = DEFAULT_PREFS;
let cachedSnapshot: Prefs = DEFAULT_PREFS;

function readStored(): Prefs | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const stored = JSON.parse(raw);
      cachedPrefs = {
        dyslexicFont: Boolean(stored.dyslexicFont),
        highContrast: Boolean(stored.highContrast),
      };
    } catch {
      cachedPrefs = DEFAULT_PREFS;
    }
  }
  return cachedPrefs;
}

/** L'estat efectiu: la tria de l'alumne si n'hi ha, si no el que ha dit el docent. */
function getSnapshot(): Prefs {
  const effective = readStored() ?? assignedPrefs;
  // useSyncExternalStore exigeix una referència estable mentre no hi hagi canvis.
  if (
    effective.dyslexicFont !== cachedSnapshot.dyslexicFont ||
    effective.highContrast !== cachedSnapshot.highContrast
  ) {
    cachedSnapshot = { ...effective };
  }
  return cachedSnapshot;
}

function getServerSnapshot(): Prefs {
  return DEFAULT_PREFS;
}

function notify() {
  listeners.forEach((l) => l());
}

function writePrefs(next: Prefs) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  cachedRaw = undefined; // força rellegir
  notify();
}

/**
 * Publica les adaptacions que el docent ha assignat a aquest alumne. Es crida
 * des del servidor via `<AssignedNeedsSync>`, no des de la interfície.
 */
export function setAssignedPrefs(next: Prefs) {
  if (
    assignedPrefs.dyslexicFont === next.dyslexicFont &&
    assignedPrefs.highContrast === next.highContrast
  ) {
    return;
  }
  assignedPrefs = next;
  notify();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

type AccessibilityContextValue = Prefs & {
  toggleDyslexicFont: () => void;
  toggleHighContrast: () => void;
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    document.documentElement.classList.toggle("font-dyslexic", prefs.dyslexicFont);
    document.documentElement.classList.toggle("contrast-high", prefs.highContrast);
  }, [prefs.dyslexicFont, prefs.highContrast]);

  const toggleDyslexicFont = useCallback(() => {
    writePrefs({ ...getSnapshot(), dyslexicFont: !getSnapshot().dyslexicFont });
  }, []);

  const toggleHighContrast = useCallback(() => {
    writePrefs({ ...getSnapshot(), highContrast: !getSnapshot().highContrast });
  }, []);

  return (
    <AccessibilityContext.Provider value={{ ...prefs, toggleDyslexicFont, toggleHighContrast }}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibilityPrefs() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibilityPrefs must be used within an AccessibilityProvider");
  }
  return ctx;
}
