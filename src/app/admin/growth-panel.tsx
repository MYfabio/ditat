import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, UserPlus, PencilLine, CreditCard } from "lucide-react";
import type { Embut } from "@/lib/growth-metrics";

/**
 * L'embut, de dalt a baix. Cada esglao es mes petit que l'anterior i el que
 * importa no es el numero sino quin percentatge passa al seguent: es alla on
 * es veu que falla.
 */
export function GrowthPanel({ embut }: { embut: Embut }) {
  const passos = [
    { icon: Eye, label: "Visites", valor: embut.visites, nota: "als darrers 30 dies" },
    {
      icon: UserPlus,
      label: "S'han donat d'alta",
      valor: embut.altes,
      nota: percentatge(embut.altes, embut.visites, "de les visites"),
    },
    {
      icon: PencilLine,
      label: "Han fet un dictat",
      valor: embut.hanFetUnDictat,
      nota: percentatge(embut.hanFetUnDictat, embut.altes, "de qui s'ha donat d'alta"),
    },
    {
      icon: CreditCard,
      label: "Pagarien",
      valor: embut.llistaEspera,
      nota: percentatge(embut.llistaEspera, embut.hanFetUnDictat, "de qui l'ha provat"),
    },
  ];

  const maxim = Math.max(1, ...embut.perDia.map((d) => d.visites));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {passos.map((p) => (
          <Card key={p.label}>
            <CardContent className="flex flex-col gap-1 pt-6">
              <p.icon className="mb-1 size-5 text-primary" />
              <span className="text-3xl font-bold tabular-nums">{p.valor}</span>
              <span className="text-sm font-medium">{p.label}</span>
              <span className="text-xs text-muted-foreground">{p.nota}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dia a dia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-40 items-end gap-1 overflow-x-auto">
            {embut.perDia.map((d) => (
              <div key={d.dia} className="flex min-w-[10px] flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-primary/70"
                  style={{ height: `${(d.visites / maxim) * 100}%` }}
                  title={`${d.dia}: ${d.visites} visites, ${d.altes} altes`}
                />
                {d.altes > 0 && (
                  <div className="size-1.5 rounded-full bg-foreground" title={`${d.altes} altes`} />
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Barres: visites. Punt sota la barra: aquell dia algu es va donar d&apos;alta.
          </p>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Les visites es compten al servidor sense galetes ni cap identificador: només
        quantes vegades s&apos;ha obert cada pàgina pública cada dia. Per això no cal
        cap banner de consentiment ni cap servei extern.
      </p>
    </div>
  );
}

function percentatge(part: number, total: number, sufix: string) {
  if (total <= 0) return "—";
  return `${Math.round((part / total) * 100)}% ${sufix}`;
}
