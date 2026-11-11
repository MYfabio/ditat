import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Plug, Unplug } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DbNotice } from "@/components/dashboard/db-notice";
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
import {
  CLASSROOM_SCOPES,
  classroomConfigured,
  grantedScopes,
  isConnected,
} from "@/lib/classroom";
import { createOwnClassGroup } from "../actions";
import { desconnectaClassroom } from "./actions";
import { ClassroomImport } from "./classroom-import";

/** Que ha passat en tornar de Google. Cap motiu porta dades personals. */
const MISSATGES: Record<string, { to: "ok" | "avis" | "error"; text: string }> = {
  ok: { to: "ok", text: "Google Classroom connectat. Ja pots importar els teus cursos." },
  "sense-correus": {
    to: "avis",
    text: "Classroom connectat, però sense permís per llegir els correus de l'alumnat: es poden importar els cursos, però no lligar cap alumne/a al seu compte. Desconnecta i torna a connectar acceptant tots els permisos.",
  },
  denegat: { to: "avis", text: "Has cancel·lat la connexió amb Google Classroom." },
  permisos: {
    to: "error",
    text: "Cal acceptar els permisos de lectura de cursos i d'alumnat perquè la connexió serveixi. Torna-ho a provar.",
  },
  "compte-diferent": {
    to: "error",
    text: "Has autoritzat un compte de Google diferent del que fas servir a dictats.cat. Torna-ho a provar amb el mateix compte.",
  },
  "no-config": { to: "error", text: "Aquest desplegament no té configurat l'accés amb Google." },
  error: {
    to: "error",
    text: "No s'ha pogut completar la connexió amb Google Classroom. Torna-ho a provar.",
  },
};

const ESTIL: Record<"ok" | "avis" | "error", string> = {
  ok: "border-primary/40 bg-primary/5 text-foreground",
  avis: "border-amber-400/60 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  error: "border-destructive/40 bg-destructive/10 text-destructive",
};

export default async function GrupsPage(props: PageProps<"/teacher/grups">) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/teacher/grups");

  const params = await props.searchParams;
  const estat = typeof params.classroom === "string" ? MISSATGES[params.classroom] : undefined;

  const groups = await prisma.classGroup
    .findMany({
      where: { teacherId: session.user.id },
      include: { _count: { select: { students: true } } },
      orderBy: { name: "asc" },
    })
    .catch(() => null);

  const configured = classroomConfigured();
  const connected = configured && (await isConnected(session.user.id));
  const scopes = connected ? await grantedScopes(session.user.id).catch(() => []) : [];
  const senseCorreus = connected && !scopes.includes(CLASSROOM_SCOPES[2]);
  const senseCentre = !session.user.schoolId;

  return (
    <>
      <DashboardHeader
        title="Els meus grups"
        subtitle="Crea grups, importa'ls de Google Classroom i gestiona l'alumnat de cadascun."
        role="TEACHER"
        userName={session.user.name}
        userEmail={session.user.email}
      />
      <main className="mx-auto max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        <Button variant="ghost" nativeButton={false} render={<Link href="/teacher" />}>
          <ArrowLeft className="size-4" />
          Tornar al panell
        </Button>

        {groups === null && <DbNotice />}

        {estat && (
          <p role="status" className={`rounded-md border p-3 text-sm ${ESTIL[estat.to]}`}>
            {estat.text}
          </p>
        )}

        {senseCentre && (
          <p className="rounded-md border border-amber-400/60 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            Encara no tens cap centre assignat, i els grups són sempre d&apos;un centre. Demana a
            la coordinació (o a qui administra dictats.cat) que t&apos;hi assigni.
          </p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Google Classroom</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!configured ? (
              <p className="text-sm text-muted-foreground">
                Aquest desplegament no té configurat l&apos;accés amb Google, així que no es pot
                connectar Classroom.
              </p>
            ) : !connected ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Connecta el teu Google Classroom per importar els cursos com a grups i
                  portar-ne l&apos;alumnat d&apos;un cop. Només demanem permís de{" "}
                  <strong className="text-foreground">lectura</strong> de cursos i alumnat:
                  dictats.cat no escriu mai res a Classroom. Pots desconnectar-lo quan vulguis.
                </p>
                <Button nativeButton={false} render={<a href="/api/classroom/connect" />}>
                  <Plug className="size-4" />
                  Connecta amb Google Classroom
                </Button>
              </>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm">
                    <Badge>Connectat</Badge>
                    <span className="text-muted-foreground">
                      amb el compte {session.user.email}
                    </span>
                  </p>
                  <form action={desconnectaClassroom}>
                    <Button type="submit" size="sm" variant="ghost">
                      <Unplug className="size-4" />
                      Desconnecta
                    </Button>
                  </form>
                </div>
                {senseCorreus && (
                  <p className="rounded-md border border-amber-400/60 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                    La connexió no té permís per llegir els correus de l&apos;alumnat, i sense
                    correu no es pot lligar cap alumne/a al seu compte. Desconnecta i torna a
                    connectar acceptant tots els permisos.
                  </p>
                )}
                {senseCentre ? (
                  <p className="text-sm text-muted-foreground">
                    Podràs importar cursos quan tinguis un centre assignat.
                  </p>
                ) : (
                  <ClassroomImport />
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Crear un grup a mà</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createOwnClassGroup} className="grid gap-4 sm:grid-cols-[2fr_1fr_auto]">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Nom del grup</Label>
                <Input id="name" name="name" placeholder="4t A" required maxLength={80} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="gradeLevel">Curs</Label>
                <select
                  id="gradeLevel"
                  name="gradeLevel"
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
                <Button type="submit" className="w-full" disabled={senseCentre}>
                  Crear
                </Button>
              </div>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              El grup surt amb un codi de classe: l&apos;alumnat del centre s&apos;hi apunta sol.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Grups</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Grup</TableHead>
                    <TableHead>Curs</TableHead>
                    <TableHead>Alumnat</TableHead>
                    <TableHead>Codi</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups && groups.length > 0 ? (
                    groups.map((g) => (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">
                          <Link href={`/teacher/grups/${g.id}`} className="hover:underline">
                            {g.name}
                          </Link>
                        </TableCell>
                        <TableCell>{gradeLabel(g.gradeLevel)}</TableCell>
                        <TableCell>{g._count.students}</TableCell>
                        <TableCell className="font-mono tracking-widest">{g.joinCode ?? "—"}</TableCell>
                        <TableCell>
                          {g.googleClassroomId ? (
                            <Badge variant="secondary" title={g.googleCourseName ?? undefined}>
                              Classroom
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">A mà</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            nativeButton={false}
                            render={<Link href={`/teacher/grups/${g.id}`} />}
                          >
                            Obre <ArrowRight className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Encara no tens cap grup. Importa&apos;n un de Classroom o crea&apos;l a mà.
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
