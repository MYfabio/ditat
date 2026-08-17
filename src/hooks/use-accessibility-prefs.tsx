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

type Prefs = { dyslexicFont: boolean; highContrast: boolean };

const DEFAULT_PREFS: Prefs = { dyslexicFont: false, highContrast: false };

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedPrefs: Prefs = DEFAULT_PREFS;

function readPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedPrefs;
  cachedRaw = raw;
  try {
    const stored = JSON.parse(raw ?? "{}");
    cachedPrefs = {
      dyslexicFont: Boolean(stored.dyslexicFont),
      highContrast: Boolean(stored.highContrast),
    };
  } catch {
    cachedPrefs = DEFAULT_PREFS;
  }
  return cachedPrefs;
}

function writePrefs(next: Prefs) {
  const raw = JSON.stringify(next);
  window.localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedPrefs = next;
  listeners.forEach((notify) => notify());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getServerSnapshot(): Prefs {
  return DEFAULT_PREFS;
}

type AccessibilityContextValue = Prefs & {
  toggleDyslexicFont: () => void;
  toggleHighContrast: () => void;
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const prefs = useSyncExternalStore(subscribe, readPrefs, getServerSnapshot);

  useEffect(() => {
    document.documentElement.classList.toggle("font-dyslexic", prefs.dyslexicFont);
    document.documentElement.classList.toggle("contrast-high", prefs.highContrast);
  }, [prefs.dyslexicFont, prefs.highContrast]);

  const toggleDyslexicFont = useCallback(() => {
    const current = readPrefs();
    writePrefs({ ...current, dyslexicFont: !current.dyslexicFont });
  }, []);

  const toggleHighContrast = useCallback(() => {
    const current = readPrefs();
    writePrefs({ ...current, highContrast: !current.highContrast });
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
