"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { joinClassWithCode } from "./actions";

/**
 * L'alumne entra el codi que li ha donat el docent. Si arriba des de l'enllaç
 * compartit (…/student?codi=ABC123) el camp ve omplert i només ha de confirmar.
 */
export function JoinClass({ hasGroup }: { hasGroup: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  // El codi de l'enllaç compartit omple el camp d'entrada; a partir d'aquí
  // mana el que escrigui l'alumne.
  const [typed, setTyped] = useState<string | null>(null);
  const code = typed ?? (searchParams.get("codi") ?? "").toUpperCase();
  const setCode = (v: string) => setTyped(v.toUpperCase());

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const result = await joinClassWithCode(code);
      if (result.ok) {
        toast.success(`Ja ets a ${result.groupName}!`);
        setTyped("");
        router.replace("/student");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
      <div className="grid gap-1.5">
        <Label htmlFor="codi">Codi de la classe</Label>
        <Input
          id="codi"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Per exemple: K7M2XQ"
          className="font-mono tracking-widest uppercase"
          maxLength={10}
          autoComplete="off"
        />
      </div>
      <Button type="submit" disabled={pending || !code.trim()}>
        {pending ? <Loader2 className="animate-spin" /> : <LogIn className="size-4" />}
        {hasGroup ? "Canviar de classe" : "Apuntar-me"}
      </Button>
    </form>
  );
}
