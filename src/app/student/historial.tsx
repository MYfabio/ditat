"use client";

import { useState } from "react";
import { ChevronDown, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TextMarcat } from "@/components/dictation/text-marcat";
import { DictationPlayer } from "./dictation-player";

export type EntregaHistorial = {
  id: string;
  data: string;
  score: number | null;
  escrit: string | null;
  feedback: string | null;
  errors: { paraulaOriginal: string; paraulaEscrita: string; explicacio: string }[];
  dictat: {
    id: string;
    title: string;
    rawText: string;
    hasAudio: boolean;
    playback: Record<string, unknown> | undefined;
  };
};

/**
 * L'historial de dictats fets, amb la correccio a dins.
 *
 * Abans, un cop entregat, el dictat sortia de la llista de feina i al progres
 * només en quedava el títol i la nota. La correcció —que és l'única part on
 * s'aprèn alguna cosa— no es podia tornar a mirar, i el dictat no es podia
 * repetir. Un dictat que has fallat i no pots repassar no serveix de res.
 *
 * Per aixo cada entrega s'obre: hi ha el text correcte i el teu de costat amb
 * les diferencies marcades, l'explicacio de cada falta, i el boto per tornar-lo
 * a fer. Repetir crea una entrega nova, i les dues queden a la llista: aixi es
 * veu si la segona vegada ha anat millor.
 */
export function Historial({
  entregues,
  obertPerDefecte = null,
}: {
  entregues: EntregaHistorial[];
  obertPerDefecte?: string | null;
}) {
  const [obert, setObert] = useState<string | null>(obertPerDefecte);
  const [repetint, setRepetint] = useState<string | null>(null);

  if (entregues.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Encara no has fet cap dictat. Comença&apos;n un des de &quot;Per fer&quot;.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {entregues.map((e) => {
        const desplegat = obert === e.id;
        return (
          <li key={e.id} className="rounded-md border">
            <button
              type="button"
              onClick={() => {
                setObert(desplegat ? null : e.id);
                setRepetint(null);
              }}
              aria-expanded={desplegat}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted/40"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{e.dictat.title}</span>
                <span className="text-xs text-muted-foreground">{e.data}</span>
              </span>
              <span className="flex shrink-0 items-center gap-2">
                <Badge variant={e.score !== null && e.score >= 70 ? "default" : "secondary"}>
                  {e.score !== null ? `${e.score}%` : "Pendent"}
                </Badge>
                <ChevronDown
                  className={`size-4 text-muted-foreground transition-transform ${
                    desplegat ? "rotate-180" : ""
                  }`}
                />
              </span>
            </button>

            {desplegat && (
              <div className="space-y-4 border-t p-3">
                {e.feedback && <p className="text-sm text-muted-foreground">{e.feedback}</p>}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">
                      Com s&apos;havia d&apos;escriure
                    </p>
                    <p className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
                      <TextMarcat
                        text={e.dictat.rawText}
                        paraules={e.errors.map((x) => x.paraulaOriginal)}
                        to="be"
                      />
                    </p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">El que vas escriure</p>
                    <p className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
                      <TextMarcat
                        text={e.escrit || "Sense text."}
                        paraules={e.errors.map((x) => x.paraulaEscrita)}
                        to="malament"
                      />
                    </p>
                  </div>
                </div>

                {e.errors.length > 0 && (
                  <ul className="space-y-2">
                    {e.errors.map((x, i) => (
                      <li key={i} className="rounded-md border px-3 py-2 text-sm">
                        <span className="font-medium text-amber-700 dark:text-amber-400">
                          {x.paraulaEscrita}
                        </span>
                        <span className="mx-2 text-muted-foreground">→</span>
                        <span className="font-medium text-emerald-700 dark:text-emerald-400">
                          {x.paraulaOriginal}
                        </span>
                        <p className="mt-1 text-xs text-muted-foreground">{x.explicacio}</p>
                      </li>
                    ))}
                  </ul>
                )}

                {repetint === e.id ? (
                  <DictationPlayer
                    dictationId={e.dictat.id}
                    title={e.dictat.title}
                    rawText={e.dictat.rawText}
                    audioUrl={e.dictat.hasAudio ? `/api/dictations/${e.dictat.id}/audio` : null}
                    playback={e.dictat.playback as never}
                  />
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setRepetint(e.id)}>
                    <RotateCcw className="mr-2 size-4" />
                    Tornar-lo a fer
                  </Button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
