"use client";

import { useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { createUserByAdmin } from "./actions";

const ROLS = [
  { value: "TEACHER", label: "Docent" },
  { value: "STUDENT", label: "Alumne/a" },
  { value: "SCHOOL_COORD", label: "Coordinació d'escola" },
  { value: "SUPERADMIN", label: "Superadministrador" },
];

/**
 * Alta d'un usuari abans que entri amb el seu compte. El que es posa aqui es el
 * que tindra quan entri per primera vegada: el centre i el rol ja preparats.
 */
export function AltaUsuariForm({
  schools,
  centreFix,
}: {
  schools: { id: string; name: string }[];
  /** Des de la fitxa d'un centre: l'alta va sempre a aquell centre i no es tria. */
  centreFix?: string;
}) {
  const [pending, startTransition] = useTransition();
  // Un superadministrador no penja de cap centre: dins d'una fitxa no s'ofereix.
  const rols = centreFix ? ROLS.filter((r) => r.value !== "SUPERADMIN") : ROLS;

  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      try {
        const resultat = await createUserByAdmin(data);
        if (resultat.ok) {
          toast.success(`${resultat.email} donat d'alta.`);
          form.reset();
        } else {
          toast.error(resultat.error);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No s'ha pogut donar d'alta.");
      }
    });
  }

  return (
    <form
      onSubmit={enviar}
      className={
        centreFix
          ? "grid gap-4 sm:grid-cols-[2fr_1.5fr_1fr_auto] sm:items-end"
          : "grid gap-4 sm:grid-cols-[2fr_1.5fr_1fr_1.5fr_auto] sm:items-end"
      }
    >
      <div className="space-y-1.5">
        <Label htmlFor="alta-email">Correu</Label>
        <Input id="alta-email" name="email" type="email" required placeholder="nom@escola.cat" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="alta-nom">Nom (opcional)</Label>
        <Input id="alta-nom" name="name" placeholder="Maria Puig" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="alta-rol">Rol</Label>
        <select
          id="alta-rol"
          name="role"
          defaultValue="TEACHER"
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          {rols.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      {centreFix ? (
        <input type="hidden" name="schoolId" value={centreFix} />
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="alta-centre">Centre</Label>
          <select
            id="alta-centre"
            name="schoolId"
            defaultValue=""
            required
            className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="" disabled>
              Tria un centre
            </option>
            <option value="cap">Sense centre (només superadministrador)</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <UserPlus className="size-4" />}
        Donar d&apos;alta
      </Button>
    </form>
  );
}
