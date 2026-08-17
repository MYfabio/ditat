import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DbNotice } from "@/components/dashboard/db-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccessibilityToggles } from "./accessibility-toggles";
import { DictationPlayer } from "./dictation-player";
import { Flame, Star, Trophy, Medal } from "lucide-react";

async function loadStudentData(studentId: string, classGroupId: string | null) {
  try {
    const [dictations, submissions] = await Promise.all([
      classGroupId
        ? prisma.dictation.findMany({ where: { classGroupId }, orderBy: { createdAt: "desc" } })
        : Promise.resolve([]),
      prisma.submission.findMany({
        where: { studentId },
        include: { dictation: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return { dbAvailable: true as const, dictations, submissions };
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
      <main className="mx-auto max-w-4xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        {!data.dbAvailable && <DbNotice />}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Accessibilitat</CardTitle>
          </CardHeader>
          <CardContent>
            <AccessibilityToggles />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Els meus dictats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dictations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Encara no tens cap dictat assignat. Demana al teu/a docent que t&apos;assigni a
                un grup classe.
              </p>
            ) : (
              dictations.map((d) => (
                <DictationPlayer
                  key={d.id}
                  dictationId={d.id}
                  title={d.title}
                  rawText={d.rawText}
                  audioUrl={d.audioUrl}
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
                Portes <strong>{streak}</strong> dia(es) seguits fent dictats. Continua aixi!
              </p>
            )}

            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Encara no has fet cap dictat. Comenca&apos;n un aqui a sobre!
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
      </main>
    </>
  );
}
