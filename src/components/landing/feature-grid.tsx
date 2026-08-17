import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ScanText, HeartHandshake, LayoutDashboard } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Generacio de text amb IA",
    description:
      "Dictats nous cada setmana ajustats a una regla ortografica concreta: l·l, b/v, dieresi i moltes mes, segons el curs de l'alumnat.",
  },
  {
    icon: ScanText,
    title: "Escaneig OCR de fotos",
    description:
      "L'alumnat fotografia el dictat fet a ma i la IA en transcriu i corregeix el text automaticament, sense feina manual del docent.",
  },
  {
    icon: HeartHandshake,
    title: "Inclusio NEE",
    description:
      "Tipografia OpenDyslexic, alt contrast i fragmentacio del text en frases curtes per facilitar el ritme de lectura a l'alumnat amb TDAH.",
  },
  {
    icon: LayoutDashboard,
    title: "Diagnostic per al docent",
    description:
      "Panells amb els errors ortografics mes frequents de cada classe i l'evolucio individual de cada alumne al llarg del curs.",
  },
];

export function FeatureGrid() {
  return (
    <section id="funcionalitats" className="border-b bg-muted/30 py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tot el que necessites per fer dictats amb IA
          </h2>
          <p className="mt-3 text-muted-foreground">
            Des de la creacio del dictat fins a la correccio i el seguiment de
            l&apos;alumnat.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="h-full">
              <CardHeader>
                <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <CardTitle className="text-lg">{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
