import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export type GroupStatView = {
  groupId: string;
  groupName: string;
  studentCount: number;
  topErrors: [string, number][];
  maxErrorCount: number;
  progress: { title: string; rule: string; avg: number; count: number }[];
};

/**
 * Les mateixes dues gràfiques que el resum de tota la classe (errors mes
 * freqüents i puntuacio mitjana per dictat), pero calculades nomes amb els
 * dictats de cada grup -- perque un docent amb mes d'un grup pugui comparar
 * com van per separat, no nomes barrejats.
 *
 * Amb un sol grup no cal: el resum de tota la classe ja es aquest grup.
 */
export function GroupBreakdown({ groups }: { groups: GroupStatView[] }) {
  if (groups.length < 2) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">Per grup classe</h3>
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => (
          <Card key={g.groupId}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                {g.groupName}
                <Badge variant="secondary">
                  <Users className="size-3" />
                  {g.studentCount}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Errors més freqüents
                </p>
                {g.topErrors.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Encara no hi ha entregues corregides.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {g.topErrors.map(([word, count]) => (
                      <div key={word} className="flex items-center gap-2 text-xs">
                        <span className="w-24 shrink-0 truncate font-medium">{word}</span>
                        <div className="h-1.5 flex-1 rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-destructive"
                            style={{ width: `${(count / g.maxErrorCount) * 100}%` }}
                          />
                        </div>
                        <span className="w-5 shrink-0 text-right text-muted-foreground">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Puntuació mitjana per dictat
                </p>
                {g.progress.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Encara no hi ha puntuacions.</p>
                ) : (
                  <div className="space-y-2">
                    {g.progress.map((p) => (
                      <div key={p.title} className="flex items-center gap-2 text-xs">
                        <span className="w-28 shrink-0 truncate" title={p.title}>
                          {p.rule}
                        </span>
                        <div className="h-1.5 flex-1 rounded-full bg-muted">
                          <div
                            className="h-1.5 rounded-full bg-primary"
                            style={{ width: `${p.avg}%` }}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-right text-muted-foreground">
                          {p.avg}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
