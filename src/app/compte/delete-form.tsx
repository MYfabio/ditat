"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { esborrarElMeuCompte } from "./actions";
import { PARAULA_CONFIRMACIO, type ResultatBaixa } from "./constants";

function BotoEsborrar() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? "Esborrant…" : "Esborrar el meu compte"}
    </Button>
  );
}

export function DeleteForm() {
  const [resultat, accio] = useActionState<ResultatBaixa, FormData>(esborrarElMeuCompte, undefined);

  return (
    <form action={accio} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmacio">
          Escriu <span className="font-mono font-semibold">{PARAULA_CONFIRMACIO}</span> per confirmar-ho
        </Label>
        <Input
          id="confirmacio"
          name="confirmacio"
          autoComplete="off"
          spellCheck={false}
          className="max-w-xs"
          aria-describedby={resultat?.error ? "error-baixa" : undefined}
        />
      </div>

      {resultat?.error && (
        <p id="error-baixa" role="alert" className="text-sm text-destructive">
          {resultat.error}
        </p>
      )}

      <BotoEsborrar />
    </form>
  );
}
