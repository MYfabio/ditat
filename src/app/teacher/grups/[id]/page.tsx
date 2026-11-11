import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, UserMinus } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ConfirmButton } from "@/components/dashboard/confirm-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { GRADE_LEVELS, gradeLabel } from "@/lib/dictation-rules";
import { hasAnyAdaptation, parseNeedsProfile } from "@/lib/needs-profile";
import { JoinCodeCard } from "../../join-code-card";
import { addStudentToOwnGroup, deleteClassGroup, removeStudentFromGroup } from "../../actions";
import { actualitzaGrup } from "../actions";
import { SyncButton } from "../sync-button";

/**
 * Fitxa d'un grup: dades, codi de classe, Classroom si en ve, i l'alumnat amb
 * les accions de cadascu. Les adaptacions NEE es continuen tocant al panell
 * («La classe i el repàs»), que es on el docent ja les te.
 */
export default async function GrupPage(props: PageProps<"/teacher/grups/[id]">) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/teacher/grups");

  const { id } = await props.params;
  const group = await prisma.classGroup
    .findUnique({
      where: { id },
      include: {
        students: {
          select: { id: true, name: true, email: true, needsProfile: true },
          orderBy: { name: "asc" },
        },
      },
    })
    .catch(() => null);
  if (!group) notFound();
  if (group.teacherId !== session.user.id && session.user.role !== "SUPERADMIN") {
    redirect("/teacher/grups");
  }

  // Alumnat del centre que no es en aquest grup: per afegir-lo a ma.
  const candidats = await prisma.user
    .findMany({
      where: {
        role: "STUDENT",
        schoolId: group.schoolId,
        OR: [{ classGroupId: null }, { classGroupId: { not: group.id } }],
      },
      select: { id: true, name: true, email: true, classGroup: { select: { name: true } } },
      orderBy: { name: "asc" },
    })
    .catch(() => []);

  const sincronitzat = group.classroomSyncedAt
    ? group.classroomSyncedAt.toLocaleString("ca-ES", { dateStyle: "short", timeStyle: "short" })
    : null;

  return (
    <>
      <DashboardHeader
        title={group.name}
        subtitle={`${gradeLabel(group.gradeLevel)} · ${group.students.length} alumnes`}
        role="TEACHER"
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <main className="mx-auto max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        <Button variant="ghost" nativeButton={false} render={<Link href="/teacher/grups" />}>
          <ArrowLeft className="size-4" />
          Tots els grups
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dades del grup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={actualitzaGrup} className="grid gap-4 sm:grid-cols-[2fr_1fr_auto]">
              <input type="hidden" name="classGroupId" value={group.id} />
              <div className="grid gap-1.5">
                <Label htmlFor="name">Nom del grup</Label>
                <Input id="name" name="name" defaultValue={group.name} required maxLength={80} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="gradeLevel">Curs</Label>
                <select
                  id="gradeLevel"
                  name="gradeLevel"
                  defaultValue={group.gradeLevel}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  required
                >
                  {GRADE_LEVELS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" variant="outline" className="w-full">
                  Desa
                </Button>
              </div>
            </form>

            {group.googleClassroomId && (
              <div className="space-y-2 rounded-md border bg-muted/30 p-3 text-sm">
                <p>
                  <Badge variant="secondary">Google Classroom</Badge>{" "}
                  <span className="text-muted-foreground">
                    Ve del curs «{group.googleCourseName ?? group.name}».{" "}
                    {sincronitzat
                      ? `Alumnat actualitzat el ${sincronitzat}.`
                      : "Encara no se n'ha llegit l'alumnat."}
                  </span>
                </p>
                <SyncButton classGroupId={group.id} />
                <p className="text-xs text-muted-foreground">
                  Qui ja no surt a Classroom no es treu del grup automàticament: ho fas tu des
                  de la llista de sota.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <JoinCodeCard
          groups={[
            {
              id: group.id,
              name: group.name,
              gradeLevel: group.gradeLevel,
              joinCode: group.joinCode,
              students: group.students.length,
            },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Alumnat
              <Badge variant="secondary">{group.students.length} alumnes</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {group.students.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">
                Encara no hi ha ningú. Importa l&apos;alumnat de Classroom, comparteix el codi de
                classe o afegeix-lo a mà aquí sota.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Alumne/a</TableHead>
                      <TableHead>Correu</TableHead>
                      <TableHead>Adaptacions</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.students.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{s.email}</TableCell>
                        <TableCell>
                          {hasAnyAdaptation(parseNeedsProfile(s.needsProfile)) ? (
                            <Badge variant="secondary">Amb adaptacions</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Cap</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <form action={removeStudentFromGroup} className="inline">
                            <input type="hidden" name="studentId" value={s.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              title="Treure del grup (no s'esborra)"
                              aria-label={`Treure ${s.name || s.email} del grup`}
                            >
                              <UserMinus className="size-4" />
                              Treure
                            </Button>
                          </form>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Afegir un alumne/a del centre</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addStudentToOwnGroup} className="grid gap-4 sm:grid-cols-[3fr_auto]">
              <input type="hidden" name="classGroupId" value={group.id} />
              <div className="grid gap-1.5">
                <Label htmlFor="studentId">Alumne/a</Label>
                <select
                  id="studentId"
                  name="studentId"
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  required
                  disabled={candidats.length === 0}
                >
                  {candidats.length === 0 ? (
                    <option value="">Cap alumne/a disponible</option>
                  ) : (
                    candidats.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.email}
                        {s.classGroup ? ` — ara a ${s.classGroup.name}` : ""}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" variant="outline" className="w-full" disabled={candidats.length === 0}>
                  Afegir
                </Button>
              </div>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              Només alumnat que ja és del centre. Qui no hi sigui, entra amb el codi de classe o
              s&apos;importa de Classroom.
            </p>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base">Eliminar el grup</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              L&apos;alumnat no s&apos;esborra: es queda sense grup. Els dictats es conserven.
              {group.googleClassroomId && " El curs es podrà tornar a importar de Classroom."}
            </p>
            <form action={deleteClassGroup}>
              <input type="hidden" name="classGroupId" value={group.id} />
              <ConfirmButton
                message={`Vols eliminar el grup "${group.name}"?\n\nEls ${group.students.length} alumnes no s'esborren: es quedaran sense grup i deixaran de rebre els dictats d'aquesta classe.`}
              >
                Eliminar el grup
              </ConfirmButton>
            </form>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
