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
};

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
                Això <strong className="text-foreground">no es cap diagnòstic</strong>. DictatsIA
                només descriu patrons observats als dictats. Només un professional
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
