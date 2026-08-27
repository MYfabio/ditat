"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RuleHelpPanel } from "@/components/dictation/rule-help-panel";
import { AJUDES_PER_REGLA } from "@/lib/rule-help";
import { ruleLabel } from "@/lib/dictation-rules";

/**
 * El que llegeix l'alumnat abans de cada dictat, perque el docent ho pugui
 * repassar.
 *
 * Aquestes explicacions les llegiran criatures, i qui ha d'avalar que estan
 * ben plantejades es qui fa classe, no nosaltres. Per aixo es veuen tal com
 * les veuen ells, amb les dues versions, i no com una llista de textos
 * amagada en un fitxer.
 */
export function RuleHelpReview() {
  const [versio, setVersio] = useState<"primaria" | "completa">("completa");
  const regles = Object.keys(AJUDES_PER_REGLA);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">El repàs que veu l&apos;alumnat</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Això és el que surt abans de cada dictat, segons la regla que s&apos;hi treballa.
          S&apos;obre sol per a qui té adaptacions o ja ha fallat aquella regla dues vegades
          o més; per a la resta, hi ha el botó. Es pot desactivar alumne per alumne al full
          de classe.
        </p>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ["completa", "Secundària, batxillerat i C1/C2"],
              ["primaria", "Primària"],
            ] as const
          ).map(([v, etiqueta]) => (
            <button
              key={v}
              type="button"
              onClick={() => setVersio(v)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                versio === v ? "border-primary bg-primary/10 font-medium" : "hover:bg-muted/50"
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {regles.map((r) => (
            <RuleHelpPanel
              key={`${r}-${versio}`}
              ajuda={AJUDES_PER_REGLA[r]}
              regla={ruleLabel(r)}
              reglaClau={r}
              esPrimaria={versio === "primaria"}
            />
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Si alguna explicació no et convenç, digues-ho: són a un sol fitxer i es canvien
          de seguida.
        </p>
      </CardContent>
    </Card>
  );
}
