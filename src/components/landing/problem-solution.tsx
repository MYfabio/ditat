import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Check } from "lucide-react";

const PROBLEMS = [
  "Hores corregint dictats a mà, un per un.",
  "Cap manera ràpida de detectar errors ortogràfics repetits a la classe.",
  "Materials genèrics, no adaptats a cada curs ni a cada regla ortogràfica.",
  "Alumnat amb TDAH o dislèxia sense cap suport específic.",
];

const SOLUTIONS = [
  "Correcció automàtica en segons a partir d'una simple foto.",
  "Diagnòstic instantani dels errors ortogràfics més freqüents per classe.",
  "Dictats generats per IA segons curs, nivell i regla ortogràfica exacta.",
  "Adaptacions NEE integrades: OpenDyslexic, alt contrast i ritme per TDAH.",
];

export function ProblemSolution() {
  return (
    <section className="border-b py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            De la correcció manual al diagnòstic instantani
          </h2>
          <p className="mt-3 text-muted-foreground">
            El que fins ara costava hores de feina docent, ara passa en segons.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">
                Correcció manual tradicional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {PROBLEMS.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm">
                  <X className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-primary/30 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-base text-primary">Amb DictatsIA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {SOLUTIONS.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
