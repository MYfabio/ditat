import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, TriangleAlert } from "lucide-react";
import { ruleLabel } from "@/lib/dictation-rules";
import type { ComparacioGrup } from "@/lib/group-evolution";

export type StudentProfileView = {
  studentId: string;
  studentName: string;
  classGroupName: string | null;
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
  /** Data de l'ultima entrega o conversa, ja formatada. */
  ultimaActivitat: string | null;
  millorNota: number | null;
  /** Les tres entregues mes recents. */
  darreres: { titol: string; data: string; score: number | null }[];
  /** Null quan l'alumne no te grup. */
  comparacio: ComparacioGrup | null;
};

const POSICIO_GRUP = {
  "per-sobre": "Va per sobre de la mitjana del grup.",
  "a-la-par": "Va a la par de la mitjana del grup.",
  "per-sota": "Va per sota de la mitjana del grup.",
} as const;

/**
 * L'evolucio d'una persona, comparada nomes amb ella mateixa.
 *
 * Sense eixos ni numeros a sobre: no es una grafica per llegir-hi valors, es
 * per veure d'un cop d'ull si la linia puja o baixa. El que importa ho diu la
 * frase de sota amb paraules.
 *
 * Si es passa la mitjana del grup, va dibuixada amb una linia discontinua: aixi
 * es veu d'un cop d'ull si l'alumne va per sobre o per sota.
 */
function Evolucio({ punts, grup }: { punts: number[]; grup?: number[] }) {
  if (punts.length < 2) return null;
  const ample = 120;
  const alt = 28;
  const max = Math.max(...punts, ...(grup ?? []), 100);
  const min = Math.min(...punts, ...(grup ?? []), 0);
  const rang = max - min || 1;
  const cami = (valors: number[]) =>
    valors
      .map((p, i) => {
        const x = (i / (valors.length - 1)) * ample;
        const y = alt - ((p - min) / rang) * alt;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  const ultima = punts[punts.length - 1];
  return (
    <svg
      viewBox={`0 0 ${ample} ${alt}`}
      className="h-7 w-[120px] shrink-0 overflow-visible"
      role="img"
      aria-label={
        grup
          ? "Evolucio de l'alumne comparada amb la mitjana del grup"
          : `Evolucio de les ultimes ${punts.length} puntuacions`
      }
    >
      {grup && grup.length === punts.length && (
        <path
          d={cami(grup)}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="2 2"
          className="text-muted-foreground"
        />
      )}
      <path d={cami(punts)} fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary" />
      <circle cx={ample} cy={alt - ((ultima - min) / rang) * alt} r="2.5" className="fill-primary" />
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

  // Nomes s'agrupa per grup classe quan n'hi ha mes d'un: amb un de sol la
  // capçalera no diria res que la pestanya ja no digui.
  const byGroup = profiles.reduce<Record<string, StudentProfileView[]>>((acc, p) => {
    const key = p.classGroupName ?? "Sense grup";
    (acc[key] ??= []).push(p);
    return acc;
  }, {});
  const showGroupHeadings = Object.keys(byGroup).length > 1;

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

      {showGroupHeadings ? (
        <div className="space-y-6">
          {Object.entries(byGroup).map(([groupName, groupProfiles]) => (
            <div key={groupName} className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">{groupName}</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {groupProfiles.map((p) => (
                  <ProfileCard key={p.studentId} profile={p} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {profiles.map((p) => (
            <ProfileCard key={p.studentId} profile={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileCard({ profile: p }: { profile: StudentProfileView }) {
  // Amb una sola setmana no hi ha tendencia que comparar: no es mostra la linia del grup.
  const comparacio = p.comparacio && p.comparacio.setmanes.length >= 2 ? p.comparacio : null;
  const darreraSetmana = comparacio?.setmanes[comparacio.setmanes.length - 1];

  return (
    <Card>
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
        {p.ultimaActivitat && (
          <p className="text-xs text-muted-foreground">
            Última activitat: {p.ultimaActivitat}
            {p.millorNota !== null && <> · Millor nota: {p.millorNota}%</>}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {(p.progressio.tendencia || comparacio) && (
          <div className="mb-3 space-y-1 rounded-md border bg-muted/30 p-2">
            <p className="text-xs font-medium">Progressos</p>
            <div className="flex items-center gap-3">
              <Evolucio
                punts={comparacio ? comparacio.setmanes.map((s) => s.alumne) : p.progressio.punts}
                grup={comparacio ? comparacio.setmanes.map((s) => s.grup) : undefined}
              />
              <div className="space-y-1 text-xs">
                {p.progressio.tendencia && (
                  <p>
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
                      <>S&apos;hi manté: al voltant del {p.progressio.ara}% des del principi.</>
                    )}
                  </p>
                )}
                {comparacio && darreraSetmana && (
                  <p>
                    Darrera setmana amb dictats: {darreraSetmana.alumne}% · mitjana del grup:{" "}
                    {darreraSetmana.grup}%.
                    {comparacio.posicio && <> {POSICIO_GRUP[comparacio.posicio]}</>}
                    <span className="block text-muted-foreground">
                      Línia contínua: l&apos;alumne. Discontínua: el grup.
                    </span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        {p.darreres.length > 0 && (
          <div className="space-y-1 pb-2">
            <p className="text-xs font-medium">Darreres entregues</p>
            {p.darreres.map((d, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate" title={d.titol}>
                  {d.titol}
                </span>
                <span className="shrink-0 text-muted-foreground">{d.data}</span>
                <span className="w-12 shrink-0 text-right">
                  {d.score !== null ? `${d.score}%` : "Pendent"}
                </span>
              </div>
            ))}
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
  );
}
