import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, TriangleAlert } from "lucide-react";
import { ruleLabel } from "@/lib/dictation-rules";

export type StudentProfileView = {
  studentId: string;
  studentName: string;
  totalSubmissions: number;
  averageScore: number;
  perRule: { rule: string; averageScore: number; attempts: number; mastered: boolean }[];
  curriculumProgress: { expected: number; mastered: number; pending: string[] };
  observations: { key: string; label: string; detail: string }[];
  progressio: {
    punts: number[];
    tendencia: "millora" | "estable" | "empitjora" | null;
    inici: number;
    ara: number;
  };
};

/**
 * L'evolucio d'una persona, comparada nomes amb ella mateixa.
 *
 * Sense eixos ni numeros a sobre: no es una grafica per llegir-hi valors, es
 * per veure d'un cop d'ull si la linia puja o baixa. El que importa ho diu la
 * frase de sota amb paraules.
 */
function Evolucio({ punts }: { punts: number[] }) {
  if (punts.length < 2) return null;
  const ample = 120;
  const alt = 28;
  const max = Math.max(...punts, 100);
  const min = Math.min(...punts, 0);
  const rang = max - min || 1;
  const cami = punts
    .map((p, i) => {
      const x = (i / (punts.length - 1)) * ample;
      const y = alt - ((p - min) / rang) * alt;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${ample} ${alt}`}
      className="h-7 w-[120px] shrink-0 overflow-visible"
      role="img"
      aria-label={`Evolucio de les ultimes ${punts.length} puntuacions`}
    >
      <path d={cami} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
      <circle
        cx={ample}
        cy={alt - ((punts[punts.length - 1] - min) / rang) * alt}
        r="2.5"
        className="fill-primary"
      />
    </svg>
  );
}

export function StudentProfiles({ profiles }: { profiles: StudentProfileView[] }) {
  if (profiles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Encara no hi ha prou dictats corregits per elaborar el perfil individual de cap
        alumne/a.
      </p>
    );
  }

  const withObservations = profiles.filter((p) => p.observations.length > 0);

  return (
    <div className="space-y-6">
      {withObservations.length > 0 && (
        <Card className="border-amber-400/50 bg-amber-50/60 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TriangleAlert className="size-4 text-amber-600" />
              Observacions per revisar amb l&apos;equip d&apos;orientació
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 rounded-md border border-amber-400/40 bg-background/60 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <p>
                Això <strong className="text-foreground">no es cap diagnòstic</strong>. dictats.cat
                només descriu patrons observats als dictats —quines errades es
                repeteixen i on cauen dins del text—, i no anomena cap trastorn.
                Els mateixos errors poden tenir causes molt diferents. Només un professional
                (psicopedagog/a o logopeda) pot valorar si hi ha una dificultat específica
                d&apos;aprenentatge. Fes servir aquesta informació unicament com a punt de
                partida per parlar amb l&apos;equip d&apos;orientació del centre.
              </p>
            </div>
            {withObservations.map((p) => (
              <div key={p.studentId} className="rounded-md border bg-background p-3">
                <p className="mb-2 text-sm font-medium">{p.studentName}</p>
                <ul className="space-y-1.5">
                  {p.observations.map((o) => (
                    <li key={o.key} className="text-sm">
                      <span className="font-medium">{o.label}.</span>{" "}
                      <span className="text-muted-foreground">{o.detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {profiles.map((p) => (
          <Card key={p.studentId}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {p.studentName}
                <Badge variant={p.averageScore >= 70 ? "default" : "secondary"}>
                  {p.averageScore}%
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {p.totalSubmissions} dictats corregits · {p.curriculumProgress.mastered}/
                {p.curriculumProgress.expected} regles del seu curs consolidades
              </p>
            </CardHeader>
            <CardContent className="space-y-2">
              {p.progressio.tendencia && (
                <div className="mb-3 space-y-1 rounded-md border bg-muted/30 p-2">
                  <p className="text-xs font-medium">Progressos</p>
                  <div className="flex items-center gap-3">
                  <Evolucio punts={p.progressio.punts} />
                  <p className="text-xs">
                    {p.progressio.tendencia === "millora" ? (
                      <>
                        Va a <strong className="text-emerald-700 dark:text-emerald-400">millor</strong>
                        : del {p.progressio.inici}% al {p.progressio.ara}% de mitjana.
                      </>
                    ) : p.progressio.tendencia === "empitjora" ? (
                      <>
                        Ha <strong className="text-amber-700 dark:text-amber-400">baixat</strong>: del{" "}
                        {p.progressio.inici}% al {p.progressio.ara}% de mitjana.
                      </>
                    ) : (
                      <>
                        S&apos;hi manté: al voltant del {p.progressio.ara}% des del principi.
                      </>
                    )}
                    </p>
                  </div>
                </div>
              )}
              {p.perRule.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sense dades per regla encara.</p>
              ) : (
                p.perRule.map((r) => (
                  <div key={r.rule} className="flex items-center gap-3 text-sm">
                    <span className="w-36 shrink-0 truncate" title={ruleLabel(r.rule)}>
                      {ruleLabel(r.rule)}
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${r.mastered ? "bg-primary" : "bg-amber-500"}`}
                        style={{ width: `${r.averageScore}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-muted-foreground">
                      {r.averageScore}%
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
