import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Users, GraduationCap, FileText, ScanLine } from "lucide-react";
import { ruleLabel } from "@/lib/dictation-rules";

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Superadministrador",
  SCHOOL_COORD: "Coordinació",
  TEACHER: "Docent",
  STUDENT: "Alumne/a",
};

/**
 * Fitxa d'un centre concret per al superadministrador: qui hi ha, com estan
 * organitzats i com els va. És la manera de veure les mètriques d'un centre
 * sense haver d'entrar amb el compte de ningú.
 */
export default async function SchoolDetailPage(props: PageProps<"/admin/centre/[id]">) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPERADMIN") redirect("/dashboard");

  const { id } = await props.params;

  const school = await prisma.school.findUnique({
    where: { id },
    include: {
      users: { orderBy: [{ role: "asc" }, { name: "asc" }] },
      classGroups: {
        include: { teacher: true, _count: { select: { students: true } } },
        orderBy: { name: "asc" },
      },
    },
  });
  if (!school) notFound();

  const teacherIds = school.users.filter((u) => u.role === "TEACHER").map((u) => u.id);
  const studentIds = school.users.filter((u) => u.role === "STUDENT").map((u) => u.id);

  const [dictationCount, submissions] = await Promise.all([
    prisma.dictation.count({ where: { teacherId: { in: teacherIds } } }),
    prisma.submission.findMany({
      where: { studentId: { in: studentIds } },
      include: { dictation: { select: { targetRule: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const scored = submissions.filter((s) => s.score !== null);
  const avgScore = scored.length
    ? Math.round(scored.reduce((sum, s) => sum + (s.score ?? 0), 0) / scored.length)
    : null;

  // Regles amb pitjor resultat al centre: on cal reforçar.
  const perRule = new Map<string, { total: number; count: number }>();
  for (const s of scored) {
    const rule = s.dictation.targetRule;
    const acc = perRule.get(rule) ?? { total: 0, count: 0 };
    acc.total += s.score ?? 0;
    acc.count += 1;
    perRule.set(rule, acc);
  }
  const weakest = [...perRule.entries()]
    .map(([rule, a]) => ({ rule, avg: Math.round(a.total / a.count), attempts: a.count }))
    .sort((a, b) => a.avg - b.avg)
    .slice(0, 6);

  const counts = {
    teachers: teacherIds.length,
    students: studentIds.length,
    groups: school.classGroups.length,
    dictations: dictationCount,
    submissions: submissions.length,
  };

  return (
    <>
      <DashboardHeader
        title={school.name}
        subtitle={`Centre · ${school.domain}`}
        role="SUPERADMIN"
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <main className="mx-auto max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        <Button variant="ghost" nativeButton={false} render={<Link href="/admin" />}>
          <ArrowLeft className="size-4" />
          Tornar a tots els centres
        </Button>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric icon={Users} label="Docents" value={counts.teachers} />
          <Metric icon={GraduationCap} label="Alumnat" value={counts.students} />
          <Metric icon={FileText} label="Dictats creats" value={counts.dictations} />
          <Metric
            icon={ScanLine}
            label="Entregues corregides"
            value={counts.submissions}
            hint={avgScore !== null ? `${avgScore}% de mitjana` : undefined}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grups classe</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grup</TableHead>
                    <TableHead>Curs</TableHead>
                    <TableHead>Tutor/a</TableHead>
                    <TableHead>Alumnat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {school.classGroups.length > 0 ? (
                    school.classGroups.map((cg) => (
                      <TableRow key={cg.id}>
                        <TableCell className="font-medium">{cg.name}</TableCell>
                        <TableCell>{cg.gradeLevel}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {cg.teacher?.name || cg.teacher?.email || "Sense assignar"}
                        </TableCell>
                        <TableCell>{cg._count.students}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Aquest centre encara no té cap grup classe.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Regles amb pitjor resultat</CardTitle>
          </CardHeader>
          <CardContent>
            {weakest.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Encara no hi ha prou entregues corregides en aquest centre.
              </p>
            ) : (
              <div className="space-y-2.5">
                {weakest.map((r) => (
                  <div key={r.rule} className="flex items-center gap-3 text-sm">
                    <span className="w-52 shrink-0 truncate">{ruleLabel(r.rule)}</span>
                    <div className="h-2 flex-1 rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${r.avg}%` }} />
                    </div>
                    <span className="w-12 shrink-0 text-right tabular-nums text-muted-foreground">
                      {r.avg}%
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Persones del centre</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Persona</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Grup</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {school.users.length > 0 ? (
                    school.users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{u.name || "—"}</span>
                            <span className="text-xs text-muted-foreground">{u.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {school.classGroups.find((c) => c.id === u.classGroupId)?.name ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Encara no hi ha ningú en aquest centre.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none tabular-nums">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
