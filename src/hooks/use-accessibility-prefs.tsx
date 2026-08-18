"use client";

import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

/**
 * Adaptacions d'accessibilitat de l'alumne.
 *
 * Les decideix el docent des de la llista de classe; l'alumne no les tria ni
 * les pot desactivar. Per això no es guarda res al navegador: l'única font és
 * el perfil de l'alumne a la base de dades, que `AssignedNeedsSync` publica
 * aquí a cada càrrega de la seva pantalla.
 */

// Clau de la versio anterior, quan l'alumne podia canviar-se les ajudes. Es
// neteja perque una tria antiga no li deixi el contrast alt encès per sempre.
const LEGACY_STORAGE_KEY = "dictatsia:accessibility-prefs";

export type Prefs = { dyslexicFont: boolean; highContrast: boolean };

const DEFAULT_PREFS: Prefs = { dyslexicFont: false, highContrast: false };

const listeners = new Set<() => void>();
let assignedPrefs: Prefs = DEFAULT_PREFS;

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): Prefs {
  return assignedPrefs;
}

function getServerSnapshot(): Prefs {
  return DEFAULT_PREFS;
}

/** Publica les adaptacions que el docent ha declarat per a aquest alumne. */
export function setAssignedPrefs(next: Prefs) {
  if (
    assignedPrefs.dyslexicFont === next.dyslexicFont &&
    assignedPrefs.highContrast === next.highContrast
  ) {
    return;
  }
  // useSyncExternalStore exigeix una referencia estable mentre res no canviï.
  assignedPrefs = { ...next };
  listeners.forEach((l) => l());
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const prefs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const pathname = usePathname();

  // Les adaptacions són per a l'espai de l'alumne. Aplicar-les a tot el web
  // deixava la pàgina pública en blanc i negre.
  const appliesHere = pathname?.startsWith("/student") ?? false;

  useEffect(() => {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("font-dyslexic", appliesHere && prefs.dyslexicFont);
    root.classList.toggle("contrast-high", appliesHere && prefs.highContrast);
  }, [appliesHere, prefs.dyslexicFont, prefs.highContrast]);

  return <>{children}</>;
}
