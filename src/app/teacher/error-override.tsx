"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil } from "lucide-react";
import { TAXONOMY } from "@/lib/skill-taxonomy";
import { overrideErrorClassification } from "./actions";

/**
 * Esmena d'una classificacio de la IA per part del docent.
 *
 * Va plegat darrere d'un boto perque la taula d'errades es per llegir-la de
 * pressa: qui nomes vol veure la correccio no ha de travessar un formulari a
 * cada fila.
 */
export function ErrorOverride({
  submissionId,
  errorIndex,
  currentSkill,
}: {
  submissionId: string;
  errorIndex: number;
  currentSkill: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState("invalidar");
  const [newSkill, setNewSkill] = useState(currentSkill ?? "");

  if (!open) {
    return (
      <Button size="icon-sm" variant="ghost" onClick={() => setOpen(true)} title="Esmenar la IA">
        <Pencil />
      </Button>
    );
  }

  return (
    <form
      action={async (formData) => {
        await overrideErrorClassification(formData);
        setOpen(false);
      }}
      className="space-y-2 rounded-md border p-2"
    >
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="errorIndex" value={errorIndex} />
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="newSkill" value={action === "reclassificar" ? newSkill : ""} />

      <Select value={action} onValueChange={(v) => v && setAction(v)}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="invalidar">No és cap errada</SelectItem>
          <SelectItem value="reclassificar">És d&apos;una altra regla</SelectItem>
        </SelectContent>
      </Select>

      {action === "reclassificar" && (
        <Select value={newSkill} onValueChange={(v) => v && setNewSkill(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Quina regla" />
          </SelectTrigger>
          <SelectContent>
            {TAXONOMY.flatMap((c) =>
              c.subskills.map((sub) => (
                <SelectItem key={sub.key} value={sub.key}>
                  {c.label}: {sub.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}

      <Input name="reason" placeholder="Per què?" required />

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={action === "reclassificar" && !newSkill}>
          Desa
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel·la
        </Button>
      </div>
    </form>
  );
}
