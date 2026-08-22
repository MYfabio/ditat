"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CreditCard } from "lucide-react";
import { toast } from "sonner";

/**
 * Quants dictats li queden aquest mes, i com passar a il·limitats.
 *
 * Nomes surt a qui aprèn pel seu compte. Qui va a través d'un centre no el veu
 * mai: el seu accés el paga el centre i cobrar-li seria cobrar dos cops.
 */
export function SubscriptionCard({
  actiu,
  restants,
  gratuitsAlMes,
  preuMensual,
  pagamentsActius,
}: {
  actiu: boolean;
  restants: number | null;
  gratuitsAlMes: number;
  preuMensual: number;
  /** Fals mentre no hi hagi claus de pagament configurades. */
  pagamentsActius: boolean;
}) {
  const [carregant, setCarregant] = useState<"alta" | "gestio" | null>(null);

  async function obre(rutaFinal: "checkout" | "portal", quin: "alta" | "gestio") {
    setCarregant(quin);
    try {
      const res = await fetch(`/api/stripe/${rutaFinal}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        toast.error(data.error || "No s'ha pogut obrir la pàgina de pagament.");
        return;
      }
      window.location.href = data.url;
    } catch {
      toast.error("Error de xarxa. Torna-ho a provar.");
    } finally {
      setCarregant(null);
    }
  }

  if (actiu) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="size-4 text-primary" />
          <span>
            <strong>Subscripció activa.</strong> Dictats il·limitats.
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={carregant !== null}
          onClick={() => obre("portal", "gestio")}
        >
          {carregant === "gestio" ? <Loader2 className="animate-spin" /> : null}
          Gestionar la subscripció
        </Button>
      </div>
    );
  }

  const sensePendents = restants !== null && restants <= 0;

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">Pla gratuït</p>
        <Badge variant={sensePendents ? "outline" : "secondary"}>
          {restants ?? 0} de {gratuitsAlMes} aquest mes
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        {sensePendents
          ? `Ja has fet els ${gratuitsAlMes} dictats d'aquest mes. El dia 1 en tornaràs a tenir, o pots passar a il·limitats ara mateix.`
          : `Cada mes tens ${gratuitsAlMes} dictats fets a la teva mida. Amb la subscripció no hi ha límit.`}
      </p>

      {pagamentsActius ? (
        <Button
          className="w-full sm:w-auto"
          disabled={carregant !== null}
          onClick={() => obre("checkout", "alta")}
        >
          {carregant === "alta" ? (
            <Loader2 className="animate-spin" />
          ) : (
            <CreditCard className="size-4" />
          )}
          Dictats il·limitats per {preuMensual} € al mes
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          La subscripció s&apos;obrirà ben aviat.
        </p>
      )}
    </div>
  );
}
