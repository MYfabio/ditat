"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { MCER_LEVELS } from "@/lib/dictation-rules";
import { setLearningLevel, requestOwnDictation } from "./actions";

/**
 * Pantalla de qui es prepara pel seu compte, sense cap centre ni docent al
 * darrere: algu que va a treure's un C1.
 *
 * Aqui els dictats no els posa ningu, aixi que se'ls demana ell mateix. El
 * text el continua triant el motor adaptatiu segons el seu perfil: l'unica
 * diferencia amb un alumne de classe es qui prem el boto.
 */
export function AutonomousPanel({
  level,
  hasPending,
}: {
  level: string | null;
  hasPending: boolean;
}) {
  const [selected, setSelected] = useState(level ?? "");
  const [saving, startSaving] = useTransition();
  const [asking, startAsking] = useTransition();

  function chooseLevel(value: string) {
    setSelected(value);
    startSaving(async () => {
      const result = await setLearningLevel(value);
      if (!result.ok) toast.error(result.error ?? "No s'ha pogut desar el nivell.");
      else toast.success("Nivell desat.");
    });
  }

  function askForDictation() {
    startAsking(async () => {
      const result = await requestOwnDictation();
      if (!result.ok) toast.error(result.error ?? "No s'ha pogut preparar el dictat.");
      else toast.success("Ja tens un dictat nou a punt.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Quin nivell et prepares?</p>
        <Select value={selected} onValueChange={(v) => v && chooseLevel(v)} disabled={saving}>
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="Tria el teu nivell" />
          </SelectTrigger>
          <SelectContent>
            {MCER_LEVELS.map((l) => (
              <SelectItem key={l.value} value={l.value}>
                {l.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Marca la llargada i les regles que se&apos;t suposen. El pots canviar quan vulguis.
        </p>
      </div>

      <div>
        <Button onClick={askForDictation} disabled={asking || !selected || hasPending}>
          {asking ? <Loader2 className="animate-spin" /> : <Sparkles />}
          Prepara&apos;m el següent dictat
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          {hasPending
            ? "Ja en tens un de pendent: acaba aquest abans de demanar-ne un altre."
            : "Sortirà de la regla que ara mateix et costa més."}
        </p>
      </div>
    </div>
  );
}
