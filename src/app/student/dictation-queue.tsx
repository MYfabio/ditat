"use client";

import { useState } from "react";
import { DictationPlayer } from "./dictation-player";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle2 } from "lucide-react";
import type { PlaybackSettings } from "@/lib/playback-settings";

export type DictationForStudent = {
  id: string;
  title: string;
  rawText: string;
  hasAudio: boolean;
  personalised: boolean;
  playback: PlaybackSettings;
};

/**
 * Els dictats que l'alumne té per fer, d'un en un.
 *
 * Abans sortien tots alhora, cada un amb el seu reproductor, el seu quadre de
 * text i els seus botons. Amb tres dictats pendents la pantalla tenia tres
 * llocs on escriure i cap manera de saber quin tocava: un dictat es fa
 * escoltant i concentrant-se, i no es pot demanar concentracio a algu a qui li
 * ensenyes tres feines a la vegada.
 *
 * Ara nomes hi ha el que toca. Els altres son una llista de titols, per si
 * l'alumne vol canviar d'ordre, pero no ocupen la pantalla.
 */
export function DictationQueue({
  pending,
  sentencesPerChunk,
}: {
  pending: DictationForStudent[];
  sentencesPerChunk: number;
}) {
  const [actual, setActual] = useState(0);

  if (pending.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center">
        <CheckCircle2 className="size-8 text-primary" />
        <p className="font-medium">Ho tens tot fet</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Ara mateix no tens cap dictat pendent. Quan el teu/a docent te&apos;n posi un de
          nou, el trobaras aqui.
        </p>
      </div>
    );
  }

  const d = pending[actual];
  const altres = pending.filter((_, i) => i !== actual);

  return (
    <div className="space-y-4">
      <DictationPlayer
        key={d.id}
        dictationId={d.id}
        title={d.title}
        rawText={d.rawText}
        audioUrl={d.hasAudio ? `/api/dictations/${d.id}/audio` : null}
        personalised={d.personalised}
        sentencesPerChunk={sentencesPerChunk}
        playback={d.playback}
      />

      {altres.length > 0 && (
        <div className="rounded-lg border border-dashed p-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Quan acabis aquest, en tens {altres.length}{" "}
            {altres.length === 1 ? "mes" : "mes"}:
          </p>
          <div className="flex flex-col gap-1">
            {pending.map((p, i) =>
              i === actual ? null : (
                <Button
                  key={p.id}
                  variant="ghost"
                  size="sm"
                  className="h-auto justify-start gap-2 py-1.5 text-left"
                  onClick={() => setActual(i)}
                >
                  {p.personalised && (
                    <Badge variant="secondary" className="shrink-0">
                      <Sparkles className="size-3" />
                      Per a tu
                    </Badge>
                  )}
                  <span className="truncate">{p.title}</span>
                </Button>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
