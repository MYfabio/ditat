import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DbNotice } from "@/components/dashboard/db-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DictationGenerator } from "./dictation-generator";
import { SubmissionReviewer, type ReviewSubmission } from "./submission-reviewer";
import { StudentProfiles, type StudentProfileView } from "./student-profiles";
import { ruleLabel } from "@/lib/dictation-rules";

type EvaluationError = { paraulaOriginal: string; paraulaEscrita: string; explicació: string };
type CorrectedData = { errors?: EvaluationError[]; feedback?: string } | null;

async function loadTeacherData(teacherId: string) {
  try {
    const [classGroups, dictations, students] = await Promise.all([
      prisma.classGroup.findMany({ where: { teacherId }, orderBy: { name: "asc" } }),
      prisma.dictation.findMany({
        where: { teacherId },
        include: { submissions: { include: { student: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.user.findMany({
        where: { role: "STUDENT", classGroup: { teacherId } },
        orderBy: { name: "asc" },
        include: {
          improvementReports: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
    ]);
    return { dbAvailable: true as const, classGroups, dictations, students };
  } catch {
    return { dbAvailable: false as const };
  }
}

export default async function TeacherPage() {
  const session = await auth();
  const data = session?.user ? await loadTeacherData(session.user.id) : { dbAvailable: false as const };

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

        <Tabs defaultValue="generador">
          <TabsList>
            <TabsTrigger value="generador">Generador de dictats</TabsTrigger>
            <TabsTrigger value="analitiques">Analítiques de classe</TabsTrigger>
            <TabsTrigger value="alumnat">Seguiment individual</TabsTrigger>
            <TabsTrigger value="entregues">Revisor d&apos;entregues</TabsTrigger>
          </TabsList>

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
