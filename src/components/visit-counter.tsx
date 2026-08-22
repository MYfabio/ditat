"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Avisa el servidor que s'ha obert una pagina publica.
 *
 * Sense galetes ni identificadors: nomes diu quina pagina, i el servidor suma
 * un al comptador del dia. Si la peticio falla no passa res, perque comptar
 * visites no ha de trencar mai una pagina.
 */
export function VisitCounter() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const cos = JSON.stringify({ path: pathname });
    // sendBeacon no fa esperar la pagina i sobreviu si l'usuari se'n va de
    // seguida; si el navegador no el te, es fa una peticio normal.
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/visita", new Blob([cos], { type: "application/json" }));
      return;
    }
    fetch("/api/visita", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: cos,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
