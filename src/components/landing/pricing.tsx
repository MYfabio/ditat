import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Building2 } from "lucide-react";
import { DICTATS_GRATUITS_AL_MES } from "@/lib/subscription";

/**
 * Preus.
 *
 * De moment nomes hi ha la versio gratuita. Un centre no compra aixi: ho parla,
 * ho passa per direccio i ho paga per factura. Per aixo el bloc de sota porta a
 * la conversa i no a un boto de pagar.
 */
const GRATUIT = {
  name: "Gratuït",
  price: "0 €",
  period: "per sempre",
  description: "Per provar-ho i veure si t'ajuda.",
  features: [
    `${DICTATS_GRATUITS_AL_MES} dictats al mes fets a la teva mida`,
    "Nivells del A1 al C2",
    "Correcció amb explicació de cada falta",
    "Veu catalana per escoltar-los",
  ],
};

export function Pricing() {
  return (
    <section id="preus" className="border-b py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Practica gratis, al teu ritme
          </h2>
          <p className="mt-3 text-muted-foreground">
            Sense lletra petita.
          </p>
        </div>

        <div className="mx-auto max-w-md">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{GRATUIT.name}</CardTitle>
              <p className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold">{GRATUIT.price}</span>
                <span className="text-sm text-muted-foreground">{GRATUIT.period}</span>
              </p>
              <p className="text-sm text-muted-foreground">{GRATUIT.description}</p>
            </CardHeader>
            <CardContent className="flex h-full flex-col gap-6">
              <ul className="flex-1 space-y-2.5">
                {GRATUIT.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant="outline"
                nativeButton={false}
                render={<a href="/login" />}
              >
                Començar gratis
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed p-5">
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 size-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Ets una escola o un institut?</p>
              <p className="text-sm text-muted-foreground">
                Per a centres hi ha panell de coordinació, grups classe, adaptacions NEE i
                factura a nom del centre. Ho parlem i ho ajustem a la vostra mida.
              </p>
            </div>
          </div>
          <Button variant="outline" nativeButton={false} render={<a href="#demo" />}>
            Parlem-ne
          </Button>
        </div>
      </div>
    </section>
  );
}
