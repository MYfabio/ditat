import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Pla Aula",
    price: "Consulta'ns",
    description: "Per a un sol docent que vol provar DictatsIA amb la seva classe.",
    features: [
      "1 docent i fins a 30 alumnes",
      "Generació de dictats amb IA",
      "Correcció per foto (OCR + IA)",
      "Suport per correu electrònic",
    ],
    highlight: false,
  },
  {
    name: "Pla Escola",
    price: "Consulta'ns",
    description: "Per a un centre educatiu sencer amb múltiples cursos i docents.",
    features: [
      "Docents i alumnat il·limitats",
      "SSO amb Google / Microsoft",
      "Panell de coordinació de centre",
      "Adaptacions NEE (TDAH, dislèxia)",
      "Suport prioritari",
    ],
    highlight: true,
  },
  {
    name: "Pla Xarxa / Municipal",
    price: "Consulta'ns",
    description: "Per a consorcis educatius o ajuntaments amb diversos centres.",
    features: [
      "Múltiples escoles centralitzades",
      "Mètriques agregades per xarxa",
      "Auditoria RGPD i exportació de dades",
      "Gestor de compte dedicat",
    ],
    highlight: false,
  },
];

export function Pricing() {
  return (
    <section id="preus" className="border-b py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Un pla per a cada tipus de centre
          </h2>
          <p className="mt-3 text-muted-foreground">
            Preus adaptats a la mida del teu centre. Sense sorpreses.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={plan.highlight ? "border-primary shadow-lg shadow-primary/10" : ""}
            >
              <CardHeader>
                {plan.highlight && (
                  <Badge className="mb-2 w-fit">Més popular</Badge>
                )}
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <p className="text-2xl font-bold">{plan.price}</p>
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
                  render={<a href="#demo" />}
                >
                  Demana Demo
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
