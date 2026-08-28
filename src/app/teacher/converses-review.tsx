"use client";

import { useState } from "react";
import { ChevronDown, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type ConversaPerRevisar = {
  id: string;
  alumne: string;
  tema: string;
  data: string;
  score: number;
  preguntes: string[];
  transcripcions: string[];
  resum: string;
  millores: { que: string; exemple: string }[];
};

/**
 * Les converses de l'alumnat, per repassar-les.
 *
 * La valoracio automatica es un primer filtre, no l'ultima paraula: el docent
 * llegeix la transcripcio sencera i decideix. Per aixo aqui hi ha tot el que
 * es va dir, no nomes la nota — una nota sense el text de sota no es pot
 * discutir ni corregir.
 *
 * L'audio no hi es perque no existeix: es va analitzar i descartar al moment.
 */
export function ConversesReview({ converses }: { converses: ConversaPerRevisar[] }) {
  const [oberta, setOberta] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="size-5 text-primary" />
          Converses orals
        </CardTitle>
      </CardHeader>
      <CardContent>
        {converses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Encara no hi ha cap conversa. Quan l&apos;alumnat en faci, aquí en tindràs la
            transcripció i la valoració per repassar-les.
          </p>
        ) : (
          <ul className="space-y-2">
            {converses.map((c) => {
              const desplegada = oberta === c.id;
              return (
                <li key={c.id} className="rounded-md border">
                  <button
                    type="button"
                    onClick={() => setOberta(desplegada ? null : c.id)}
                    aria-expanded={desplegada}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/40"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">{c.alumne}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.tema} · {c.data}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Badge variant={c.score >= 70 ? "default" : "secondary"}>{c.score}%</Badge>
                      <ChevronDown
                        className={`size-4 text-muted-foreground transition-transform ${
                          desplegada ? "rotate-180" : ""
                        }`}
                      />
                    </span>
                  </button>

                  {desplegada && (
                    <div className="space-y-3 border-t p-3 text-sm">
                      <p className="text-muted-foreground">{c.resum}</p>
                      {c.preguntes.map((p, i) => (
                        <div key={i} className="rounded-md bg-muted/30 p-2.5">
                          <p className="text-xs font-medium text-muted-foreground">{p}</p>
                          <p className="mt-1">{c.transcripcions[i] ?? "—"}</p>
                        </div>
                      ))}
                      {c.millores.length > 0 && (
                        <div>
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            El que se li va proposar millorar
                          </p>
                          <ul className="space-y-1">
                            {c.millores.map((m, i) => (
                              <li key={i}>
                                {m.que}
                                {m.exemple && (
                                  <span className="text-muted-foreground"> — {m.exemple}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
