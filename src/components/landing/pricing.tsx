import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Building2 } from "lucide-react";
import { DICTATS_GRATUITS_AL_MES, PREU_MENSUAL_EUR } from "@/lib/subscription";

/**
 * Preus.
 *
 * Es venen dues coses molt diferents i abans es presentaven igual. Una persona
 * que es prepara un nivell decideix sola i en dos minuts: necessita veure el
 * preu i un boto. Un centre no compra mai aixi —ho parla, ho passa per
 * direccio i ho paga per factura—, i posar-li un boto de pagar no li serveix
 * de res. Per aixo aqui hi ha preu, i alla hi ha conversa.
 */
const INDIVIDUAL = [
  {
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
    highlight: false,
  },
  {
    name: "Il·limitat",
    price: `${PREU_MENSUAL_EUR} €`,
    period: "al mes",
    description: "Per preparar-te de debò, al teu ritme.",
    features: [
      "Dictats sense límit",
      "Els següents surten dels teus propis errors",
      "Correcció per foto del que has escrit a mà",
      "El teu progrés regla per regla",
      "Pots donar-te de baixa quan vulguis",
    ],
    highlight: true,
  },
];

export function Pricing() {
  return (
    <section id="preus" className="border-b py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Comença gratis, paga només si t&apos;ajuda
          </h2>
          <p className="mt-3 text-muted-foreground">
            Sense permanència i sense lletra petita.
          </p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
          {INDIVIDUAL.map((plan) => (
            <Card
              key={plan.name}
              className={plan.highlight ? "border-primary shadow-lg shadow-primary/10" : ""}
            >
              <CardHeader>
                {plan.highlight && <Badge className="mb-2 w-fit">Recomanat</Badge>}
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-sm text-muted-foreground">{plan.period}</span>
                </p>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </CardHeader>
              <CardContent className="flex h-full flex-col gap-6">
                <ul className="flex-1 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={plan.highlight ? "default" : "outline"}
                  nativeButton={false}
                  render={<a href="/login" />}
                >
                  {plan.highlight ? "Començar" : "Provar-ho gratis"}
                </Button>
              </CardContent>
            </Card>
          ))}
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
