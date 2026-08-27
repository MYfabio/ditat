import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DbNotice } from "@/components/dashboard/db-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UrlTabs } from "@/components/dashboard/url-tabs";
import { DictationQueue, type DictationForStudent } from "./dictation-queue";
import { Historial, type EntregaHistorial } from "./historial";
import { ajudaObertaPerDefecte, esPrimaria } from "@/lib/rule-help";
import { AssignedNeedsSync } from "./assigned-needs-sync";
import { JoinClass } from "./join-class";
import { AutonomousPanel } from "./autonomous-panel";
import { SubscriptionCard } from "./subscription-card";
import { parseNeedsProfile, sentencesPerChunk, EMPTY_NEEDS_PROFILE, hasAnyAdaptation} from "@/lib/needs-profile";
import { parsePlaybackSettings } from "@/lib/playback-settings";
import { estatDelMes, DICTATS_GRATUITS_AL_MES, PREU_MENSUAL_EUR } from "@/lib/subscription";
import { stripeConfigurat } from "@/lib/stripe";
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
          targetRule: true,
          gradeLevel: true,
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

  // Un dictat ja entregat no es feina pendent: nomes es historial. Separar-ho
  // es el que permet ensenyar-li una sola cosa a fer.
  // Nomes te sentit per a qui no va a través d'un centre.
  const autonom = !!session?.user && !session.user.classGroupId;
  const subscripcio = autonom ? await estatDelMes(session!.user.id) : null;

  // El que el client necessita per ensenyar la correccio i poder repetir.
  const historial: EntregaHistorial[] = submissions.map((s) => {
    const dades = (s.correctedData ?? {}) as {
      feedback?: string;
      errors?: { paraulaOriginal: string; paraulaEscrita: string; explicacio: string }[];
    };
    return {
      id: s.id,
      data: s.createdAt.toLocaleDateString("ca-ES", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      score: s.score,
      escrit: s.ocrText,
      feedback: dades.feedback ?? null,
      errors: dades.errors ?? [],
      dictat: {
        id: s.dictation.id,
        title: s.dictation.title,
        rawText: s.dictation.rawText,
        hasAudio: s.dictation.wantsAudio,
        playback: (s.dictation.playbackSettings ?? undefined) as Record<string, unknown> | undefined,
      },
    };
  });

  // Com li va anant a cada regla, per decidir si el repas s'obre sol.
  const perRegla = new Map<string, { intents: number; suma: number }>();
  for (const s of submissions) {
    const regla = s.dictation.targetRule;
    if (!regla || s.score === null) continue;
    const f = perRegla.get(regla) ?? { intents: 0, suma: 0 };
    f.intents += 1;
    f.suma += s.score;
    perRegla.set(regla, f);
  }
  const teAdaptacions = hasAnyAdaptation(needs);
  const repasActiu = needs.ruleHelp !== false;
  function repasObert(regla: string | null | undefined) {
    if (!regla || !repasActiu) return false;
    const f = perRegla.get(regla);
    return ajudaObertaPerDefecte({
      mitjanaEnAquestaRegla: f && f.intents ? Math.round(f.suma / f.intents) : null,
      intentsEnAquestaRegla: f?.intents ?? 0,
      teAdaptacions,
    });
  }

  const entregats = new Set(submissions.map((s) => s.dictationId));
  const pendents: DictationForStudent[] = dictations
    .filter((d) => !entregats.has(d.id))
    .map((d) => ({
      id: d.id,
      title: d.title,
      rawText: d.rawText,
      hasAudio: d.wantsAudio,
      targetRule: repasActiu ? (d.targetRule ?? undefined) : undefined,
      ajudaOberta: repasObert(d.targetRule),
      ajudaCurta: teAdaptacions,
      esPrimaria: esPrimaria(d.gradeLevel ?? learningLevel),
      personalised: !!d.targetStudentId,
      playback: parsePlaybackSettings(d.playbackSettings),
    }));

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

        {/* Dos espais, no un: el que has de fer ara, i com et va anant. Barrejar
            les dues coses feia que un dictat pendent quedes despres de quatre
            insignies i una llista de notes. */}
        <UrlTabs defaultValue="perfer" className="space-y-6">
          <TabsList>
            <TabsTrigger value="perfer">
              Per fer{pendents.length > 0 ? ` (${pendents.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="progres">Els meus progressos</TabsTrigger>
            {autonom && <TabsTrigger value="compte">El meu compte</TabsTrigger>}
          </TabsList>

          <TabsContent value="perfer" className="space-y-4">
            {/* Qui encara no ha triat nivell no pot rebre res: es l'unica cosa
                que ha de fer, i per tant l'unica que ha de veure. */}
            {autonom && !learningLevel ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Comencem</CardTitle>
                </CardHeader>
                <CardContent>
                  <AutonomousPanel level={learningLevel} hasPending={hasPendingDictation} />
                </CardContent>
              </Card>
            ) : dictations.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Encara no tens cap dictat. Si encara no ets a cap classe,
                apunta-t&apos;hi amb el codi de mes amunt.
              </div>
            ) : (
              <DictationQueue pending={pendents} sentencesPerChunk={sentencesPerChunk(needs)} />
            )}

            {/* L'accio que genera feina va amb la feina, no en una targeta de
                configuracio a part. Una linia, no un bloc. */}
            {autonom && learningLevel && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed p-3">
                <p className="text-xs text-muted-foreground">
                  Nivell {learningLevel}
                  {subscripcio?.actiu
                    ? " · dictats il·limitats"
                    : subscripcio && subscripcio.restants !== null
                      ? ` · ${subscripcio.restants} de ${DICTATS_GRATUITS_AL_MES} dictats gratuits aquest mes`
                      : ""}
                </p>
                <AutonomousPanel level={learningLevel} hasPending={hasPendingDictation} />
              </div>
            )}
          </TabsContent>

          <TabsContent value="progres" className="space-y-6">

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

            <Historial entregues={historial} />
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
        </TabsContent>

          {autonom && (
            <TabsContent value="compte" className="space-y-6">
              {subscripcio && (
                <SubscriptionCard
                  actiu={subscripcio.actiu}
                  restants={subscripcio.restants}
                  gratuitsAlMes={DICTATS_GRATUITS_AL_MES}
                  preuMensual={PREU_MENSUAL_EUR}
                  pagamentsActius={stripeConfigurat()}
                />
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Vas a una classe?</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Si el teu centre fa servir dictats.cat, escriu el codi que t&apos;ha
                    donat el teu/a docent i passaras a rebre els dictats de la classe.
                  </p>
                  <Suspense fallback={<div className="h-16" />}>
                    <JoinClass hasGroup={false} />
                  </Suspense>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </UrlTabs>
      </main>
    </>
  );
}
