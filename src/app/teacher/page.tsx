import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DbNotice } from "@/components/dashboard/db-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UrlTabs } from "@/components/dashboard/url-tabs";
import { DictationGenerator } from "./dictation-generator";
import { SubmissionReviewer, type ReviewSubmission } from "./submission-reviewer";
import { StudentProfiles, type StudentProfileView } from "./student-profiles";
import { RuleHelpReview } from "./rule-help-review";
import { ConversesReview, type ConversaPerRevisar } from "./converses-review";
import { topicPerId } from "@/lib/conversa-topics";
import { ClassRoster, type RosterStudent } from "./class-roster";
import { GroupBreakdown, type GroupStatView } from "./group-breakdown";
import { FilterBar } from "@/components/dashboard/filter-bar";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ruleLabel } from "@/lib/dictation-rules";
import { parseNeedsProfile } from "@/lib/needs-profile";
import type { Annotation } from "@/lib/annotations";
import { comparaAmbGrup, mitjanaDelGrup, mitjanaSetmanal } from "@/lib/group-evolution";

type EvaluationError = { paraulaOriginal: string; paraulaEscrita: string; explicacio: string };
type CorrectedData = {
  errors?: EvaluationError[];
  feedback?: string;
  annotations?: Annotation[];
} | null;

async function loadTeacherData(teacherId: string, filters: { q?: string; grup?: string }) {
  // Cerca per nom o correu de l'alumne i filtre per grup classe.
  const search = filters.q?.trim();
  const searchFilter = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};
  const groupFilter = filters.grup ? { classGroupId: filters.grup } : {};

  try {
    const [classGroups, dictations, students, converses, entregues, ultimaConversa] = await Promise.all([
      prisma.classGroup.findMany({
        where: { teacherId },
        include: { _count: { select: { students: true } } },
        orderBy: { name: "asc" },
      }),
      prisma.dictation.findMany({
        where: { teacherId },
        include: {
          submissions: {
            // `photoUrl` es queda fora a proposit: son fotos senceres en base64
            // i aqui n'hi ha prou amb saber si n'hi ha, que la imatge ja se
            // serveix a part quan el docent obre una entrega.
            omit: { photoUrl: true },
            include: { student: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { role: "STUDENT", classGroup: { teacherId }, ...searchFilter, ...groupFilter },
        orderBy: { name: "asc" },
        include: {
          improvementReports: { orderBy: { createdAt: "desc" }, take: 1 },
          classGroup: { select: { name: true } },
        },
      }),
      prisma.conversa.findMany({
        where: { student: { classGroup: { teacherId } } },
        include: { student: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      // Totes les entregues de l'alumnat del docent, no nomes les de l'alumnat
      // que surt al filtre: la mitjana d'un grup s'ha de calcular amb tot el grup.
      prisma.submission.findMany({
        where: { student: { classGroup: { teacherId } } },
        select: {
          studentId: true,
          score: true,
          createdAt: true,
          dictation: { select: { title: true } },
          student: { select: { classGroupId: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.conversa.groupBy({
        by: ["studentId"],
        where: { student: { classGroup: { teacherId } } },
        _max: { createdAt: true },
      }),
    ]);
    return {
      dbAvailable: true as const,
      classGroups,
      dictations,
      students,
      converses,
      entregues,
      ultimaConversa: new Map<string, Date | null>(
        ultimaConversa.map((r): [string, Date | null] => [r.studentId, r._max.createdAt])
      ),
    };
  } catch {
    return { dbAvailable: false as const };
  }
}

type DictationForStats = {
  title: string;
  targetRule: string;
  submissions: { score: number | null; correctedData: unknown }[];
};

/**
 * Errors mes freqüents i puntuacio mitjana per dictat, a partir d'una llista
 * de dictats. Serveix tant per al resum de tota la classe com per al
 * desglossament per grup: nomes canvia quins dictats se li passen.
 */
function statsFor(dictations: DictationForStats[]) {
  const errorTally = new Map<string, number>();
  for (const d of dictations) {
    for (const s of d.submissions) {
      const corrected = s.correctedData as CorrectedData;
      for (const err of corrected?.errors ?? []) {
        const key = err.paraulaOriginal.toLowerCase();
        errorTally.set(key, (errorTally.get(key) ?? 0) + 1);
      }
    }
  }
  const topErrors = [...errorTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxErrorCount = topErrors[0]?.[1] ?? 1;

  const progress = dictations
    .map((d) => {
      const scored = d.submissions.filter((s) => s.score !== null);
      const avg = scored.length
        ? Math.round(scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length)
        : null;
      return { title: d.title, rule: ruleLabel(d.targetRule), avg, count: d.submissions.length };
    })
    .filter((p): p is { title: string; rule: string; avg: number; count: number } => p.avg !== null);

  return { topErrors, maxErrorCount, progress };
}

/**
 * Compara la primera meitat dels dictats amb la segona.
 *
 * Amb poques dades una recta de regressio balla massa; mitja i mitja aguanta
 * millor que un dictat especialment bo o dolent no giri la conclusio.
 */
function evolucioDe(punts: number[]): StudentProfileView["progressio"] {
  const MINIM = 4;
  if (punts.length < MINIM) return { punts, tendencia: null, inici: 0, ara: 0 };
  const tall = Math.floor(punts.length / 2);
  const mitjana = (v: number[]) => Math.round(v.reduce((t, n) => t + n, 0) / v.length);
  const inici = mitjana(punts.slice(0, tall));
  const ara = mitjana(punts.slice(tall));
  const salt = ara - inici;
  // Cinc punts: per sota d'aixo es soroll, no una millora.
  return { punts, tendencia: salt >= 5 ? "millora" : salt <= -5 ? "empitjora" : "estable", inici, ara };
}

type EntregaDelDocent = {
  studentId: string;
  score: number | null;
  createdAt: Date;
  dictation: { title: string };
  student: { classGroupId: string | null };
};

type AlumneDelDocent = {
  id: string;
  name: string | null;
  email: string;
  classGroupId: string | null;
  classGroup: { name: string } | null;
  improvementReports: { weaknessMetrics: unknown }[];
};

const dataCurta = (d: Date) =>
  d.toLocaleDateString("ca-ES", { day: "2-digit", month: "short", year: "numeric" });

/**
 * El perfil de cada alumne del docent. Les observacions i les regles surten de
 * l'informe guardat; l'activitat, la millor nota, les darreres entregues i
 * l'evolucio es calculen aqui a partir de totes les entregues, perque un
 * informe antic no les porta.
 */
function construeixPerfils(
  alumnes: AlumneDelDocent[],
  entregues: EntregaDelDocent[],
  ultimaConversa: Map<string, Date | null>
): StudentProfileView[] {
  // Les entregues arriben de la mes nova a la mes vella.
  const perAlumne = new Map<string, EntregaDelDocent[]>();
  const grupPerAlumne = new Map<string, string | null>();
  for (const e of entregues) {
    const llista = perAlumne.get(e.studentId) ?? [];
    llista.push(e);
    perAlumne.set(e.studentId, llista);
    grupPerAlumne.set(e.studentId, e.student.classGroupId);
  }

  const setmanesPerAlumne = new Map<string, Map<string, number>>();
  for (const [id, llista] of perAlumne) {
    const puntuades = llista.flatMap((e) =>
      e.score === null ? [] : [{ data: e.createdAt, score: e.score }]
    );
    setmanesPerAlumne.set(id, mitjanaSetmanal(puntuades));
  }

  const setmanesDelGrup = new Map<string, Map<string, number>[]>();
  for (const [id, setmanes] of setmanesPerAlumne) {
    const grupId = grupPerAlumne.get(id);
    if (!grupId) continue;
    const llista = setmanesDelGrup.get(grupId) ?? [];
    llista.push(setmanes);
    setmanesDelGrup.set(grupId, llista);
  }
  const mitjanaPerGrup = new Map<string, Map<string, number>>();
  for (const [grupId, llista] of setmanesDelGrup) {
    mitjanaPerGrup.set(grupId, mitjanaDelGrup(llista));
  }

  return alumnes
    .map((alumne): StudentProfileView => {
      const llista = perAlumne.get(alumne.id) ?? [];
      const puntuades = llista.filter(
        (e): e is EntregaDelDocent & { score: number } => e.score !== null
      );
      const metrics = alumne.improvementReports[0]?.weaknessMetrics as {
        totalSubmissions?: number;
        averageScore?: number;
        perRule?: StudentProfileView["perRule"];
        curriculumProgress?: StudentProfileView["curriculumProgress"];
        observations?: StudentProfileView["observations"];
      } | null;
      const grup = alumne.classGroupId ? mitjanaPerGrup.get(alumne.classGroupId) : undefined;
      const darrera = [llista[0]?.createdAt, ultimaConversa.get(alumne.id)]
        .filter((d): d is Date => d instanceof Date)
        .sort((a, b) => b.getTime() - a.getTime())[0];

      return {
        studentId: alumne.id,
        studentName: alumne.name || alumne.email,
        classGroupName: alumne.classGroup?.name ?? null,
        totalSubmissions: metrics?.totalSubmissions ?? 0,
        averageScore: metrics?.averageScore ?? 0,
        perRule: metrics?.perRule ?? [],
        curriculumProgress: metrics?.curriculumProgress ?? {
          expected: 0,
          mastered: 0,
          pending: [],
        },
        observations: metrics?.observations ?? [],
        progressio: evolucioDe(puntuades.map((e) => e.score).reverse()),
        ultimaActivitat: darrera ? dataCurta(darrera) : null,
        millorNota: puntuades.length ? Math.round(Math.max(...puntuades.map((e) => e.score))) : null,
        darreres: llista.slice(0, 3).map((e) => ({
          titol: e.dictation.title,
          data: dataCurta(e.createdAt),
          score: e.score === null ? null : Math.round(e.score),
        })),
        comparacio: grup ? comparaAmbGrup(setmanesPerAlumne.get(alumne.id) ?? new Map(), grup) : null,
      };
    })
    .filter((p) => p.totalSubmissions > 0);
}

export default async function TeacherPage(props: PageProps<"/teacher">) {
  const session = await auth();
  const params = await props.searchParams;
  const q = typeof params.q === "string" ? params.q : "";
  const grup = typeof params.grup === "string" ? params.grup : "";
  const data = session?.user
    ? await loadTeacherData(session.user.id, { q, grup })
    : { dbAvailable: false as const };

  const submissions: ReviewSubmission[] = data.dbAvailable
    ? data.dictations.flatMap((d) =>
        d.submissions.map((s) => {
          const corrected = s.correctedData as CorrectedData;
          return {
            id: s.id,
            studentName: s.student.name || s.student.email,
            dictationTitle: d.title,
            originalText: d.rawText,
            ocrText: s.ocrText,
            score: s.score,
            status: s.status,
            createdAt: s.createdAt.toISOString(),
            errors: corrected?.errors ?? [],
            feedback: corrected?.feedback ?? null,
            hasPhoto: s.inputMethod === "PHOTO",
            annotations: corrected?.annotations ?? [],
          };
        })
      )
    : [];

  const studentProfiles: StudentProfileView[] = data.dbAvailable
    ? construeixPerfils(data.students, data.entregues, data.ultimaConversa)
    : [];

  const conversesPerRevisar: ConversaPerRevisar[] = data.dbAvailable
    ? data.converses.map((c) => {
        const av = (c.avaluacio ?? {}) as {
          resum?: string;
          millores?: { que: string; exemple: string }[];
        };
        return {
          id: c.id,
          alumne: c.student.name || c.student.email,
          tema: topicPerId(c.topicId)?.titol ?? c.topicId,
          data: c.createdAt.toLocaleDateString("ca-ES", {
            day: "2-digit",
            month: "short",
          }),
          score: c.score,
          preguntes: (c.questions as string[]) ?? [],
          transcripcions: (c.transcripcions as string[]) ?? [],
          resum: av.resum ?? "",
          millores: av.millores ?? [],
        };
      })
    : [];

  const grupsResum = data.dbAvailable
    ? {
        grups: data.classGroups.length,
        alumnes: data.classGroups.reduce((n, c) => n + c._count.students, 0),
        classroom: data.classGroups.filter((c) => c.googleClassroomId).length,
      }
    : null;

  const roster: RosterStudent[] = data.dbAvailable
    ? data.students.map((s) => ({
        id: s.id,
        name: s.name || s.email,
        email: s.email,
        classGroupName: s.classGroup?.name ?? null,
        needs: parseNeedsProfile(s.needsProfile),
      }))
    : [];

  const overallStats = data.dbAvailable
    ? statsFor(data.dictations)
    : { topErrors: [] as [string, number][], maxErrorCount: 1, progress: [] as { title: string; rule: string; avg: number; count: number }[] };
  const { topErrors, maxErrorCount, progress } = overallStats;

  const groupStats: GroupStatView[] = data.dbAvailable
    ? data.classGroups.map((g) => ({
        groupId: g.id,
        groupName: g.name,
        studentCount: g._count.students,
        ...statsFor(data.dictations.filter((d) => d.classGroupId === g.id)),
      }))
    : [];

  return (
    <>
      <DashboardHeader
        title="Panell del Docent"
        subtitle="Genera dictats amb IA, consulta l'analítica de la classe i revisa les entregues."
        role="TEACHER"
        userName={session?.user?.name}
        userEmail={session?.user?.email}
      />
      <main className="mx-auto max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        {!data.dbAvailable && <DbNotice />}

        {/* Tres espais en lloc de sis llocs: la feina del dia (crear i
            corregir), el seguiment (classe i alumne), i el que es toca un cop
            (grups i repas de normes). I la pestanya viu a l'URL: recarregar
            et deixa on eres. */}
        <UrlTabs defaultValue={q || grup ? "config" : "feina"}>
          <TabsList>
            <TabsTrigger value="feina">Dictats i entregues</TabsTrigger>
            <TabsTrigger value="seguiment">Seguiment</TabsTrigger>
            <TabsTrigger value="config">La classe i el repàs</TabsTrigger>
          </TabsList>

          <TabsContent value="feina" className="space-y-8">

            <DictationGenerator classGroups={data.dbAvailable ? data.classGroups : []} />

            <SubmissionReviewer submissions={submissions} />
          </TabsContent>

          <TabsContent value="seguiment" className="space-y-8">

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Errors ortogràfics més freqüents
                  {groupStats.length > 1 && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      (tots els grups)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {topErrors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Encara no hi ha prou entregues corregides per mostrar estadistiques.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {topErrors.map(([word, count]) => (
                      <div key={word} className="flex items-center gap-3 text-sm">
                        <span className="w-28 shrink-0 truncate font-medium">{word}</span>
                        <div className="h-2 flex-1 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-destructive"
                            style={{ width: `${(count / maxErrorCount) * 100}%` }}
                          />
                        </div>
                        <span className="w-6 shrink-0 text-right text-muted-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Puntuació mitjana per dictat
                  {groupStats.length > 1 && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      (tots els grups)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {progress.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Encara no hi ha puntuacions per mostrar l&apos;evolució de la classe.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {progress.map((p) => (
                      <div key={p.title} className="flex items-center gap-3 text-sm">
                        <span className="w-40 shrink-0 truncate" title={p.title}>
                          {p.rule}
                        </span>
                        <div className="h-2 flex-1 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary"
                            style={{ width: `${p.avg}%` }}
                          />
                        </div>
                        <span className="w-10 shrink-0 text-right text-muted-foreground">
                          {p.avg}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <GroupBreakdown groups={groupStats} />

            <StudentProfiles profiles={studentProfiles} />
            <ConversesReview converses={conversesPerRevisar} />
          </TabsContent>

          <TabsContent value="config" className="space-y-8">

            {/* La gestió dels grups (crear, Classroom, codis, alumnat de cada
                grup) viu a la seva pàgina: aquí només el resum i la porta. */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Grups classe</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  {!grupsResum || grupsResum.grups === 0
                    ? "Encara no tens cap grup. Crea'n un o importa'l de Google Classroom."
                    : `${grupsResum.grups} ${grupsResum.grups === 1 ? "grup" : "grups"} · ${grupsResum.alumnes} alumnes` +
                      (grupsResum.classroom > 0 ? ` · ${grupsResum.classroom} de Classroom` : "") +
                      ". Codis de classe, Classroom i l'alumnat de cada grup."}
                </p>
                <Button nativeButton={false} render={<Link href="/teacher/grups" />}>
                  Gestiona els grups
                  <ArrowRight className="size-4" />
                </Button>
              </CardContent>
            </Card>

            <FilterBar
              action="/teacher"
              q={q}
              placeholder="Nom o correu de l'alumne…"
              resultCount={roster.length}
              selects={[
                {
                  name: "grup",
                  label: "Grup classe",
                  value: grup,
                  options: [
                    { value: "", label: "Tots els grups" },
                    ...(data.dbAvailable
                      ? data.classGroups.map((c) => ({ value: c.id, label: c.name }))
                      : []),
                  ],
                },
              ]}
            />
            <ClassRoster students={roster} />

            <RuleHelpReview />
          </TabsContent>
        </UrlTabs>
      </main>
    </>
  );
}
