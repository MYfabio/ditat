"use client";

import { useState } from "react";
import { BookOpen, ChevronDown } from "lucide-react";
import { textAjuda, type AjudaRegla } from "@/lib/rule-help";

/**
 * El repas de la norma abans de comencar el dictat.
 *
 * Es el que faria un docent: abans de dictar, recorda que es el que s'hi posa
 * a prova. Sense aixo, un dictat nomes serveix per comprovar el que ja se sap;
 * amb aixo, tambe per aprendre-ho.
 *
 * S'obre sol per a qui te adaptacions o per a qui falla aquesta regla de
 * manera repetida, i queda darrere d'un boto per a la resta. Obrir-lo sempre
 * el convertiria en una pantalla que tothom tanca sense llegir; amagar-lo
 * sempre el deixaria sense fer servir, perque qui mes falla es qui menys
 * demana ajuda.
 */
export function RuleHelpPanel({
  ajuda,
  regla,
  obertPerDefecte = false,
  versioCurta = false,
  esPrimaria = false,
}: {
  ajuda: AjudaRegla;
  regla: string;
  obertPerDefecte?: boolean;
  /** Versio reduida per a qui te adaptacions: menys text i menys exemples. */
  versioCurta?: boolean;
  /** Cursos de primaria: explicacio sense metallenguatge. */
  esPrimaria?: boolean;
}) {
  const [obert, setObert] = useState(obertPerDefecte);
  const text = textAjuda(ajuda, { primaria: esPrimaria, curta: versioCurta });

  return (
    <div className="rounded-md border border-primary/30 bg-primary/5">
      <button
        type="button"
        onClick={() => setObert(!obert)}
        aria-expanded={obert}
        className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <BookOpen className="size-4 text-primary" />
          Abans de comencar: {regla}
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${
            obert ? "rotate-180" : ""
          }`}
        />
      </button>

      {obert && (
        <div className="space-y-3 border-t border-primary/20 px-3 py-3 text-sm">
          <p className={versioCurta ? "text-base font-medium leading-relaxed" : undefined}>
            {text.norma}
          </p>

          {/* Menys exemples i mes grans: amb dos n'hi ha prou per veure el
              patro, i una llista llarga nomes es mes text per llegir. */}
          <ul className="space-y-1">
            {text.exemples.map((e) => (
              <li
                key={e}
                className={`rounded bg-background/70 px-2 py-1 font-mono ${
                  versioCurta ? "text-sm" : "text-xs"
                }`}
              >
                {e}
              </li>
            ))}
          </ul>

          {text.parany && (
            <p className="rounded-md border border-amber-400/40 bg-amber-50/60 p-2 text-xs dark:bg-amber-900/20">
              <strong>Compte:</strong> {text.parany}
            </p>
          )}

          {!versioCurta && (
          <p className="text-xs text-muted-foreground">
            Si en vols mes:{" "}
            <a
              href="https://llengua.gencat.cat/ca/serveis/aprendre_catala/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              recursos per aprendre catala de la Generalitat
            </a>
            .
          </p>
          )}
        </div>
      )}
    </div>
  );
}
