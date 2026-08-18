"use client";

import { useEffect } from "react";
import { setAssignedPrefs } from "@/hooks/use-accessibility-prefs";

/**
 * Publica al client les adaptacions que el docent ha declarat per a aquest
 * alumne. Es fa des de la pàgina de l'alumne i no des del layout arrel perquè
 * la resta del web (landing inclosa) pugui continuar sent estàtica.
 */
export function AssignedNeedsSync({
  dyslexiaSupport,
  highContrast,
}: {
  dyslexiaSupport: boolean;
  highContrast: boolean;
}) {
  useEffect(() => {
    setAssignedPrefs({ dyslexicFont: dyslexiaSupport, highContrast });
  }, [dyslexiaSupport, highContrast]);

  return null;
}
