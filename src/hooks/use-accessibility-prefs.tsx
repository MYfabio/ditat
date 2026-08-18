"use client";

import { usePathname } from "next/navigation";
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

type Stored = Prefs & { setAt: number };

const listeners = new Set<() => void>();

// Adaptacions declarades pel docent i quan les va tocar per última vegada.
let assignedPrefs: Prefs = DEFAULT_PREFS;
let assignedAt = 0;

let cachedRaw: string | null | undefined;
let cachedStored: Stored | null = null;
let cachedSnapshot: Prefs = DEFAULT_PREFS;

function readStored(): Stored | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === null) return null;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      const s = JSON.parse(raw);
      cachedStored = {
        dyslexicFont: Boolean(s.dyslexicFont),
        highContrast: Boolean(s.highContrast),
        setAt: Number(s.setAt) || 0,
      };
    } catch {
      cachedStored = null;
    }
  }
  return cachedStored;
}

/**
 * Mana la decisió més recent. L'alumne pot ajustar-se les ajudes al seu
 * dispositiu, però si després el docent les torna a tocar, tornen a manar les
 * del docent: si no, qui hagués tocat els controls un sol cop es quedaria
 * aïllat de qualsevol canvi posterior, sense saber-ho.
 */
function effectivePrefs(): Prefs {
  const stored = readStored();
  if (!stored) return assignedPrefs;
  if (assignedAt > stored.setAt) return assignedPrefs;
  return { dyslexicFont: stored.dyslexicFont, highContrast: stored.highContrast };
}

function getSnapshot(): Prefs {
  const next = effectivePrefs();
  // useSyncExternalStore exigeix una referència estable mentre res no canviï.
  if (
    next.dyslexicFont !== cachedSnapshot.dyslexicFont ||
    next.highContrast !== cachedSnapshot.highContrast
  ) {
    cachedSnapshot = { ...next };
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
  const stored: Stored = { ...next, setAt: Date.now() };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  cachedRaw = undefined;
  notify();
}

/** Descarta la tria local i torna al que ha assignat el docent. */
export function resetToAssigned() {
  window.localStorage.removeItem(STORAGE_KEY);
  cachedRaw = undefined;
  cachedStored = null;
  notify();
}

/** Publica les adaptacions declarades pel docent per a aquest alumne. */
export function setAssignedPrefs(next: Prefs, updatedAt?: string) {
  const at = updatedAt ? Date.parse(updatedAt) || 0 : 0;
  if (
    assignedPrefs.dyslexicFont === next.dyslexicFont &&
    assignedPrefs.highContrast === next.highContrast &&
    assignedAt === at
  ) {
    return;
  }
  assignedPrefs = next;
  assignedAt = at;
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
  /** Cert quan l'alumne ha canviat les ajudes respecte del que va posar el docent. */
  overridden: boolean;
  resetToAssigned: () => void;
};

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const overridden = useSyncExternalStore(
    subscribe,
    () => {
      const stored = readStored();
      return !!stored && stored.setAt >= assignedAt;
    },
    () => false
  );
  const pathname = usePathname();

  // Les adaptacions són per a l'espai de l'alumne. Aplicar-les a tot el web
  // deixava la pàgina pública en blanc i negre per a qui hagués activat mai
  // l'alt contrast, i des d'allà no hi ha cap control per desactivar-lo.
  const appliesHere = pathname?.startsWith("/student") ?? false;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("font-dyslexic", appliesHere && prefs.dyslexicFont);
    root.classList.toggle("contrast-high", appliesHere && prefs.highContrast);
  }, [appliesHere, prefs.dyslexicFont, prefs.highContrast]);

  const toggleDyslexicFont = useCallback(() => {
    const cur = getSnapshot();
    writePrefs({ ...cur, dyslexicFont: !cur.dyslexicFont });
  }, []);

  const toggleHighContrast = useCallback(() => {
    const cur = getSnapshot();
    writePrefs({ ...cur, highContrast: !cur.highContrast });
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{ ...prefs, toggleDyslexicFont, toggleHighContrast, overridden, resetToAssigned }}
    >
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
