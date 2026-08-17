import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ScanText, HeartHandshake, LayoutDashboard } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Generació de text amb IA",
    description:
      "Dictats nous cada setmana ajustats a una regla ortogràfica concreta: l·l, b/v, dièresi i moltes més, segons el curs de l'alumnat.",
  },
  {
    icon: ScanText,
    title: "Escaneig OCR de fotos",
    description:
      "L'alumnat fotografia el dictat fet a mà i la IA en transcriu i corregeix el text automàticament, sense feina manual del docent.",
  },
  {
    icon: HeartHandshake,
    title: "Inclusió NEE",
    description:
      "Tipografia OpenDyslexic, alt contrast i fragmentació del text en frases curtes per facilitar el ritme de lectura a l'alumnat amb TDAH.",
  },
  {
    icon: LayoutDashboard,
    title: "Diagnòstic per al docent",
    description:
      "Panells amb els errors ortogràfics més freqüents de cada classe i l'evolució individual de cada alumne al llarg del curs.",
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
            Des de la creació del dictat fins a la correcció i el seguiment de
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
