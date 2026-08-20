import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DbNotice } from "@/components/dashboard/db-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DictationPlayer } from "./dictation-player";
import { AssignedNeedsSync } from "./assigned-needs-sync";
import { JoinClass } from "./join-class";
import { AutonomousPanel } from "./autonomous-panel";
import { parseNeedsProfile, sentencesPerChunk, EMPTY_NEEDS_PROFILE } from "@/lib/needs-profile";
import { parsePlaybackSettings } from "@/lib/playback-settings";
import { Flame, Star, Trophy, Medal } from "lucide-react";
import { ruleLabel } from "@/lib/dictation-rules";

async function loadStudentData(studentId: string, classGroupId: string | null) {
  try {
    const [me, dictations, submissions, latestReport] = await Promise.all([
      prisma.user.findUnique({
        where: { id: studentId },
        select: { needsProfile: true, learningLevel: true },
      }),
      prisma.dictation.findMany({
        where: {
          OR: [
            { targetStudentId: studentId },
            ...(classGroupId ? [{ classGroupId, targetStudentId: null }] : []),
          ],
        },
        // Select explícit: així aquesta consulta no s'emportarà mai cap camp
        // pesat que s'afegeixi al model més endavant. La locució es demana a
        // part, i només quan l'alumne prem "Escoltar".
        select: {
          id: true,
          title: true,
          rawText: true,
          wantsAudio: true,
          targetStudentId: true,
          playbackSettings: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.submission.findMany({
        where: { studentId },
        include: { dictation: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.improvementReport.findFirst({
        where: { studentId },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return {
      dbAvailable: true as const,
      needs: parseNeedsProfile(me?.needsProfile),
      learningLevel: me?.learningLevel ?? null,
      dictations,
      submissions,
      latestReport,
    };
  } catch {
    return { dbAvailable: false as const };
  }
}

function computeStreak(dates: Date[]) {
  const uniqueDays = [
    ...new Set(dates.map((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime())),
  ].sort((a, b) => b - a);
  if (uniqueDays.length === 0) return 0;

  const oneDay = 24 * 60 * 60 * 1000;
  const today = new Date();
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  let streak = 0;
  let cursor = todayMidnight;
  for (const day of uniqueDays) {
    if (day === cursor) {
      streak++;
      cursor -= oneDay;
    } else if (day === cursor - oneDay && streak === 0) {
      // permet que la ratxa comenci ahir si encara no s'ha fet res avui
      streak++;
      cursor = day - oneDay;
    } else {
      break;
    }
  }
  return streak;
}

export default async function StudentPage() {
  const session = await auth();
  const data = session?.user
    ? await loadStudentData(session.user.id, session.user.classGroupId)
    : { dbAvailable: false as const };

  const dictations = data.dbAvailable ? data.dictations : [];
  const submissions = data.dbAvailable ? data.submissions : [];
  const needs = data.dbAvailable ? data.needs : EMPTY_NEEDS_PROFILE;
  const metrics = (data.dbAvailable ? data.latestReport?.weaknessMetrics : null) as {
    perRule?: { rule: string; averageScore: number; mastered: boolean; attempts: number }[];
    curriculumProgress?: { expected: number; mastered: number };
  } | null;

  const learningLevel = data.dbAvailable ? data.learningLevel : null;
  // Un dictat encara sense entregar: mentre en tingui un, no se'n prepara cap més.
  const submittedIds = new Set(submissions.map((s) => s.dictationId));
  const hasPendingDictation = dictations.some(
    (d) => d.targetStudentId !== null && !submittedIds.has(d.id)
  );

  const bestScore = submissions.reduce((max, s) => Math.max(max, s.score ?? 0), 0);
  const streak = computeStreak(submissions.map((s) => s.createdAt));

  const badges = [
    { key: "first", earned: submissions.length >= 1, label: "Primera entrega", icon: Medal },
    { key: "gold", earned: bestScore >= 90, label: "Ortografia d'or", icon: Trophy },
    { key: "streak", earned: streak >= 3, label: "Ratxa de 3 dies", icon: Flame },
    { key: "ten", earned: submissions.length >= 10, label: "10 dictats fets", icon: Star },
  ];

  return (
    <>
      <DashboardHeader
        title="El meu espai"
        subtitle="Escolta, escriu i puja el teu dictat quan estiguis a punt."
        role="STUDENT"
        userName={session?.user?.name}
        userEmail={session?.user?.email}
      />
      <AssignedNeedsSync
        dyslexiaSupport={needs.dyslexiaSupport}
        highContrast={needs.highContrast}
      />
      <main className="mx-auto max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        {!data.dbAvailable && <DbNotice />}

        {/* El codi només surt mentre l'alumne no té classe: és l'única cosa
            que ha de fer per començar. Un cop hi és, pertany al seu grup i la
            pantalla és només per treballar. Les adaptacions les decideix el
            docent i s'apliquen soles: no són una opció de l'alumne. */}
        {!session?.user?.classGroupId && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Aprèn pel teu compte</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <AutonomousPanel level={learningLevel} hasPending={hasPendingDictation} />

              <div className="space-y-3 border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Si el teu centre fa servir DictatsIA, escriu el codi que t&apos;ha donat
                  el teu/a docent i passaràs a rebre els dictats de la classe.
                </p>
                <Suspense fallback={<div className="h-16" />}>
                  <JoinClass hasGroup={false} />
                </Suspense>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Els meus dictats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dictations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Encara no tens cap dictat. Si encara no ets a cap classe, apunta-t&apos;hi
                amb el codi de més amunt.
              </p>
            ) : (
              dictations.map((d) => (
                <DictationPlayer
                  key={d.id}
                  dictationId={d.id}
                  title={d.title}
                  rawText={d.rawText}
                  audioUrl={d.wantsAudio ? `/api/dictations/${d.id}/audio` : null}
                  personalised={!!d.targetStudentId}
                  sentencesPerChunk={sentencesPerChunk(needs)}
                  playback={parsePlaybackSettings(d.playbackSettings)}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Els meus resultats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {badges.map((b) => (
                <div
                  key={b.key}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center ${
                    b.earned ? "border-primary/40 bg-primary/5" : "opacity-40"
                  }`}
                >
                  <b.icon className={`size-6 ${b.earned ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-xs font-medium">{b.label}</span>
                </div>
              ))}
            </div>

            {streak > 0 && (
              <p className="flex items-center gap-2 text-sm">
                <Flame className="size-4 text-primary" />
                Portes <strong>{streak}</strong> dia(es) seguits fent dictats. Continua així!
              </p>
            )}

            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Encara no has fet cap dictat. Comença&apos;n un aquí a sobre!
              </p>
            ) : (
              <ul className="space-y-2">
                {submissions.slice(0, 8).map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                  >
                    <span>{s.dictation.title}</span>
                    <Badge variant={s.score !== null && s.score >= 70 ? "default" : "secondary"}>
                      {s.score !== null ? `${s.score}%` : "Pendent"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {metrics?.perRule && metrics.perRule.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Com vaig amb cada regla</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {metrics.curriculumProgress && (
                <p className="text-sm text-muted-foreground">
                  Has consolidat{" "}
                  <strong className="text-foreground">
                    {metrics.curriculumProgress.mastered} de {metrics.curriculumProgress.expected}
                  </strong>{" "}
                  regles que et toquen pel teu curs.
                </p>
              )}
              <div className="space-y-2.5">
                {metrics.perRule.map((r) => (
                  <div key={r.rule} className="flex items-center gap-3 text-sm">
                    <span className="w-40 shrink-0 truncate">{ruleLabel(r.rule)}</span>
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
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </>
  );
}
