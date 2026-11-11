"use client";

import { useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, School } from "lucide-react";
import { Button } from "@/components/ui/button";

const INTENT_PER_PERFIL: Record<"aprendre" | "docent", "student" | "teacher"> = {
  aprendre: "student",
  docent: "teacher",
};

/**
 * La primera pregunta abans d'entrar: vens a aprendre o ets docent?
 *
 * Sense aixo, un docent que arribava de nou entrava amb Google, es creava com
 * a alumne i aterrava al panell d'alumne sense entendre res. La pregunta no
 * canvia cap permis —el rol de docent l'assigna la coordinacio, MAI un mateix,
 * perque dona acces a dades d'alumnat— pero posa cadascu al cami que li toca
 * abans que es faci el compte, que es quan encara no s'ha liat res.
 *
 * La tria viatja com a `?intent=` fins a /dashboard (via SSOButtons /
 * EmailLoginForm, que ja llegeixen l'URL per construir el callbackUrl), on es
 * desa un sol cop al compte. Aixi es recorda entre dispositius sense afegir
 * cap pantalla nova despres del login.
 */
export function TriaPerfil({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [perfil, setPerfil] = useState<"aprendre" | "docent" | null>(null);

  function tria(nou: "aprendre" | "docent") {
    setPerfil(nou);
    const params = new URLSearchParams(searchParams.toString());
    params.set("intent", INTENT_PER_PERFIL[nou]);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  if (perfil === null) {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium">Què hi véns a fer?</p>
        <button
          type="button"
          onClick={() => tria("aprendre")}
          className="flex w-full items-center gap-3 rounded-lg border p-4 text-left hover:border-primary hover:bg-primary/5"
        >
          <GraduationCap className="size-6 shrink-0 text-primary" />
          <span>
            <span className="block font-medium">Vinc a aprendre</span>
            <span className="block text-sm text-muted-foreground">
              Sóc alumne/a, o em preparo un nivell pel meu compte.
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => tria("docent")}
          className="flex w-full items-center gap-3 rounded-lg border p-4 text-left hover:border-primary hover:bg-primary/5"
        >
          <School className="size-6 shrink-0 text-primary" />
          <span>
            <span className="block font-medium">Sóc docent o coordino un centre</span>
            <span className="block text-sm text-muted-foreground">
              Vull fer servir dictats.cat amb el meu alumnat.
            </span>
          </span>
        </button>
      </div>
    );
  }

  if (perfil === "docent") {
    return (
      <div className="space-y-4">
        <div className="rounded-md border p-4 text-sm">
          <p className="font-medium">L&apos;accés docent va pel teu centre</p>
          <p className="mt-2 text-muted-foreground">
            Si el teu centre ja fa servir dictats.cat, entra amb el correu del centre i
            la coordinació t&apos;assignarà el rol de docent. El rol no te&apos;l pots posar
            tu perquè dóna accés a dades d&apos;alumnat.
          </p>
          <p className="mt-2 text-muted-foreground">
            Si el centre encara no hi és, demana&apos;n l&apos;alta i us ho preparem:
          </p>
          <Button
            className="mt-3 w-full"
            nativeButton={false}
            render={<a href="https://www.aulaia.cat/alta?app=dictats" />}
          >
            Sol·licita l&apos;alta del teu centre
          </Button>
        </div>
        {children}
        <button
          type="button"
          onClick={() => setPerfil(null)}
          className="w-full text-center text-xs text-muted-foreground underline underline-offset-2"
        >
          Enrere
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {children}
      <button
        type="button"
        onClick={() => setPerfil(null)}
        className="w-full text-center text-xs text-muted-foreground underline underline-offset-2"
      >
        Enrere
      </button>
    </div>
  );
}
