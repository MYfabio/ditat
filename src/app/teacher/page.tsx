import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DbNotice } from "@/components/dashboard/db-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DictationGenerator } from "./dictation-generator";
import { SubmissionReviewer, type ReviewSubmission } from "./submission-reviewer";
import { StudentProfiles, type StudentProfileView } from "./student-profiles";
import { ClassRoster, type RosterStudent } from "./class-roster";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { ruleLabel } from "@/lib/dictation-rules";
import { parseNeedsProfile } from "@/lib/needs-profile";

type EvaluationError = { paraulaOriginal: string; paraulaEscrita: string; explicacio: string };
type CorrectedData = { errors?: EvaluationError[]; feedback?: string } | null;

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
    const [classGroups, dictations, students] = await Promise.all([
      prisma.classGroup.findMany({ where: { teacherId }, orderBy: { name: "asc" } }),
      prisma.dictation.findMany({
        where: { teacherId },
        include: { submissions: { include: { student: true } } },
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
    ]);
    return { dbAvailable: true as const, classGroups, dictations, students };
  } catch {
    return { dbAvailable: false as const };
  }
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
          };
        })
      )
    : [];

  const studentProfiles: StudentProfileView[] = data.dbAvailable
    ? data.students
        .map((student) => {
          const metrics = student.improvementReports[0]?.weaknessMetrics as {
            totalSubmissions?: number;
            averageScore?: number;
            perRule?: StudentProfileView["perRule"];
            curriculumProgress?: StudentProfileView["curriculumProgress"];
            observations?: StudentProfileView["observations"];
          } | null;
          return {
            studentId: student.id,
            studentName: student.name || student.email,
            totalSubmissions: metrics?.totalSubmissions ?? 0,
            averageScore: metrics?.averageScore ?? 0,
            perRule: metrics?.perRule ?? [],
            curriculumProgress: metrics?.curriculumProgress ?? {
              expected: 0,
              mastered: 0,
              pending: [],
            },
            observations: metrics?.observations ?? [],
          };
        })
        .filter((p) => p.totalSubmissions > 0)
    : [];

  const roster: RosterStudent[] = data.dbAvailable
    ? data.students.map((s) => ({
        id: s.id,
        name: s.name || s.email,
        email: s.email,
        classGroupName: s.classGroup?.name ?? null,
        needs: parseNeedsProfile(s.needsProfile),
      }))
    : [];

  const errorTally = new Map<string, number>();
  for (const s of submissions) {
    for (const err of s.errors) {
      const key = err.paraulaOriginal.toLowerCase();
      errorTally.set(key, (errorTally.get(key) ?? 0) + 1);
    }
  }
  const topErrors = [...errorTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxErrorCount = topErrors[0]?.[1] ?? 1;

  const progress = data.dbAvailable
    ? data.dictations
        .map((d) => {
          const scored = d.submissions.filter((s) => s.score !== null);
          const avg = scored.length
            ? Math.round(scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length)
            : null;
          return { title: d.title, rule: ruleLabel(d.targetRule), avg, count: d.submissions.length };
        })
        .filter((p) => p.avg !== null)
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

        <Tabs defaultValue={q || grup ? "classe" : "generador"}>
          <TabsList>
            <TabsTrigger value="generador">Generador de dictats</TabsTrigger>
            <TabsTrigger value="analitiques">Analítiques de classe</TabsTrigger>
            <TabsTrigger value="classe">La meva classe</TabsTrigger>
            <TabsTrigger value="alumnat">Seguiment individual</TabsTrigger>
            <TabsTrigger value="entregues">Revisor d&apos;entregues</TabsTrigger>
          </TabsList>

          <TabsContent value="classe" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="generador" className="space-y-6">
            <DictationGenerator classGroups={data.dbAvailable ? data.classGroups : []} />
          </TabsContent>

          <TabsContent value="analitiques" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Errors ortogràfics més freqüents</CardTitle>
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
                <CardTitle className="text-base">Puntuació mitjana per dictat</CardTitle>
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
          </TabsContent>

          <TabsContent value="alumnat">
            <StudentProfiles profiles={studentProfiles} />
          </TabsContent>

          <TabsContent value="entregues">
            <SubmissionReviewer submissions={submissions} />
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}
