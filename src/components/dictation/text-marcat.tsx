"use client";

/** Compara paraules sense que hi facin nosa accents, majuscules ni puntuacio. */
export function nua(paraula: string) {
  return paraula
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/**
 * Pinta el text i destaca les paraules que han fallat.
 *
 * Tenir el text correcte i el teu de costat nomes serveix si veus on son les
 * diferencies. Comparar dos parrafs a ull cansa i, sobretot, se t'escapen
 * justament les faltes que no saps que fas: si el problema es que escrius
 * "haverhi" sense adonar-te'n, llegir-ho be tampoc no t'ho fara notar.
 */
export function TextMarcat({
  text,
  paraules,
  to,
}: {
  text: string;
  paraules: string[];
  to: "be" | "malament";
}) {
  const marcades = new Set(paraules.map(nua).filter(Boolean));
  if (marcades.size === 0) return <>{text}</>;

  const estil =
    to === "be"
      ? "rounded bg-emerald-100 px-0.5 font-medium text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100"
      : "rounded bg-amber-100 px-0.5 font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-100";

  // Es parteix conservant els separadors perque el text ha de quedar igual:
  // nomes se n'embolcalla algun tros.
  return (
    <>
      {text.split(/(\s+)/).map((tros, i) =>
        marcades.has(nua(tros)) ? (
          <mark key={i} className={estil}>
            {tros}
          </mark>
        ) : (
          <span key={i}>{tros}</span>
        )
      )}
    </>
  );
}

