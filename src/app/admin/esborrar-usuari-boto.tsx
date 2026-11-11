"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteUser } from "./actions";

/**
 * Esborra un usuari del tot, des del panell de superadministració.
 *
 * Abans era un formulari que cridava l'acció i prou: quan el servidor s'hi
 * negava (l'últim superadministrador, una subscripció que no es pot cancel·lar)
 * no passava res a la pantalla i semblava una avaria. Ara es diu què ha passat.
 */
export function EsborrarUsuariBoto({ userId, nom }: { userId: string; nom: string }) {
  const [pending, startTransition] = useTransition();

  function esborrar() {
    const segur = window.confirm(
      `Vols esborrar ${nom} del tot?\n\n` +
        "S'esborren el seu compte, les seves entregues i els seus informes. " +
        "Els dictats que hagi fet per a una classe es conserven.\n\n" +
        "Això no es pot desfer.",
    );
    if (!segur) return;

    const data = new FormData();
    data.set("userId", userId);
    startTransition(async () => {
      try {
        const resultat = await deleteUser(data);
        if (resultat.ok) toast.success(`${nom} esborrat.`);
        else toast.error(resultat.error);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No s'ha pogut esborrar.");
      }
    });
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="text-destructive hover:bg-destructive/10"
      disabled={pending}
      aria-label={`Esborrar ${nom}`}
      onClick={esborrar}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      Esborrar
    </Button>
  );
}
