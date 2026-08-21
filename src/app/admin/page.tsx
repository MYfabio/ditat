import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DbNotice } from "@/components/dashboard/db-notice";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { School, Users, FileText, ScanLine, ShieldCheck } from "lucide-react";
import { createSchool, updateUserRole, deleteSchool, deleteUser } from "./actions";
import { ConfirmButton } from "@/components/dashboard/confirm-button";
import { FilterBar } from "@/components/dashboard/filter-bar";

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Superadministrador",
  SCHOOL_COORD: "Coordinació d'escola",
  TEACHER: "Docent",
  STUDENT: "Alumne/a",
};

const PLAN_LABELS: Record<string, string> = {
  AULA: "Pla Aula",
  ESCOLA: "Pla Escola",
  XARXA: "Pla Xarxa / Municipal",
};

async function loadAdminData(filters: { schoolId?: string; q?: string }) {
  // Filtre per centre i cerca per nom o correu. Amb uns quants centres i
  // desenes d'usuaris, una llista sencera deixa de ser utilitzable.
  const schoolFilter =
    filters.schoolId === "cap"
      ? { schoolId: null }
      : filters.schoolId
        ? { schoolId: filters.schoolId }
        : {};

  const search = filters.q?.trim();
  const searchFilter = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  try {
    const [schools, users, userCount, dictationCount, submissionCount, recentDictations, recentSubmissions] =
      await Promise.all([
        prisma.school.findMany({
          include: { _count: { select: { users: true, classGroups: true } } },
          orderBy: { createdAt: "desc" },
        }),
        prisma.user.findMany({
          where: { ...schoolFilter, ...searchFilter },
          select: { id: true, name: true, email: true, role: true, schoolId: true },
          orderBy: [{ role: "asc" }, { email: "asc" }],
        }),
        prisma.user.count(),
        prisma.dictation.count(),
        prisma.submission.count(),
        prisma.dictation.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { teacher: { select: { name: true, email: true } } },
        }),
        prisma.submission.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: { student: { select: { name: true, email: true } } },
        }),
      ]);

    const activity = [
      ...recentDictations.map((d) => ({
        id: `dictation-${d.id}`,
        type: "Dictat generat" as const,
        // Sense docent vol dir que se'l va generar qui aprèn pel seu compte.
        actor: d.teacher ? d.teacher.name || d.teacher.email : "Aprenentatge autònom",
        detail: d.title,
        date: d.createdAt,
      })),
      ...recentSubmissions.map((s) => ({
        id: `submission-${s.id}`,
        type: "Entrega corregida" as const,
        actor: s.student.name || s.student.email,
        detail: `Puntuació: ${s.score ?? "-"}`,
        date: s.createdAt,
      })),
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return {
      dbAvailable: true as const,
      schools,
      users,
      userCount,
      dictationCount,
      submissionCount,
      activity,
    };
  } catch {
    return { dbAvailable: false as const };
  }
}

export default async function AdminPage(props: PageProps<"/admin">) {
  const session = await auth();
  const params = await props.searchParams;
  const schoolId = typeof params.centre === "string" ? params.centre : "";
  const q = typeof params.q === "string" ? params.q : "";
  const data = await loadAdminData({ schoolId, q });

  return (
    <>
      <DashboardHeader
        title="Panell de Superadministrador"
        subtitle="Gestió d'escoles, mètriques d'ús i auditoria RGPD."
        role="SUPERADMIN"
        userName={session?.user?.name}
        userEmail={session?.user?.email}
      />
      <main className="mx-auto max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        {!data.dbAvailable && <DbNotice />}

        {/* El filtre s'envia per GET i recarrega la pàgina: si no, es tornaria
            sempre a la primera pestanya i es perdria el que s'estava mirant. */}
        <Tabs defaultValue={schoolId || q ? "usuaris" : "escoles"}>
          <TabsList>
            <TabsTrigger value="escoles">Escoles</TabsTrigger>
            <TabsTrigger value="usuaris">Usuaris i rols</TabsTrigger>
            <TabsTrigger value="metriques">Mètriques</TabsTrigger>
            <TabsTrigger value="auditoria">Auditoria RGPD</TabsTrigger>
          </TabsList>

          <TabsContent value="usuaris">
            <Card>
              <CardHeader>
                <CardTitle>Usuaris i rols</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  Qui entra amb Google o Microsoft es crea sempre com a alumne/a. Des d&apos;aquí
                  se li dona el rol que li toca: la coordinació del centre i el professorat
                  s&apos;han d&apos;assignar en aquesta taula.
                </p>

                <FilterBar
                  action="/admin"
                  q={q}
                  placeholder="Nom o correu…"
                  resultCount={data.dbAvailable ? data.users.length : undefined}
                  selects={[
                    {
                      name: "centre",
                      label: "Centre",
                      value: schoolId,
                      options: [
                        { value: "", label: "Tots els centres" },
                        { value: "cap", label: "Sense centre assignat" },
                        ...(data.dbAvailable
                          ? data.schools.map((s) => ({ value: s.id, label: s.name }))
                          : []),
                      ],
                    },
                  ]}
                />

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Persona</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Centre</TableHead>
                      <TableHead />
                                         <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.dbAvailable && data.users.length > 0 ? (
                      data.users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{u.name || "—"}</span>
                              <span className="text-xs text-muted-foreground">{u.email}</span>
                            </div>
                          </TableCell>
                          <TableCell colSpan={3} className="p-0">
                            <form action={updateUserRole} className="flex flex-wrap items-center gap-2 p-2">
                              <input type="hidden" name="userId" value={u.id} />
                              <select
                                name="role"
                                defaultValue={u.role}
                                aria-label={`Rol de ${u.name || u.email}`}
                                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                              >
                                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                  <option key={value} value={value}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                              <select
                                name="schoolId"
                                defaultValue={u.schoolId ?? "cap"}
                                aria-label={`Centre de ${u.name || u.email}`}
                                className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                              >
                                <option value="cap">Sense centre</option>
                                {data.schools.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                              <Button type="submit" size="sm" variant="outline">
                                Desar
                              </Button>
                            </form>
                          </TableCell>
                          <TableCell className="text-right">
                            {/* Treure algu d'un centre el deixa existint sense escola.
                                Esborrar-lo de debo nomes es pot fer des d'aqui, i cal
                                per al dret de supressio del RGPD.

                                A la propia fila no hi surt: el servidor rebutja que
                                algu s'esborri a si mateix, i un boto que sembla que
                                hi es pero no fa res sembla una avaria. */}
                            {u.id !== session?.user?.id && (
                              <form action={deleteUser}>
                                <input type="hidden" name="userId" value={u.id} />
                                <ConfirmButton
                                  size="icon-sm"
                                  label={`Esborrar ${u.name || u.email}`}
                                  message={`Vols esborrar ${u.name || u.email} del tot?

S'esborren el seu compte, les seves entregues i els seus informes. Els dictats que hagi fet per a una classe es conserven. Aixo no es pot desfer.`}
                                >
                                  {""}
                                </ConfirmButton>
                              </form>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          Encara no hi ha cap usuari. Han d&apos;entrar un cop amb el seu compte.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="escoles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Alta d&apos;una nova escola</CardTitle>
              </CardHeader>
              <CardContent>
                <form action={createSchool} className="grid gap-4 sm:grid-cols-[2fr_2fr_1fr_auto]">
                  <div className="grid gap-1.5">
                    <Label htmlFor="name">Nom del centre</Label>
                    <Input id="name" name="name" placeholder="Institut Escola Industrial" required />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="domain">Domini de correu</Label>
                    <Input id="domain" name="domain" placeholder="escola.cat" required />
                    <p className="text-xs text-muted-foreground">
                      Només el domini, sense arrova: el tros que va després de la @ dels
                      correus del centre.
                    </p>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="planType">Pla</Label>
                    <select
                      id="planType"
                      name="planType"
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                      defaultValue="AULA"
                    >
                      <option value="AULA">Aula</option>
                      <option value="ESCOLA">Escola</option>
                      <option value="XARXA">Xarxa / Municipal</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button type="submit" className="w-full">
                      Afegir
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Escoles donades d&apos;alta</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Centre</TableHead>
                      <TableHead>Domini</TableHead>
                      <TableHead>Pla</TableHead>
                      <TableHead>Usuaris</TableHead>
                      <TableHead>Grups</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.dbAvailable && data.schools.length > 0 ? (
                      data.schools.map((school) => (
                        <TableRow key={school.id}>
                          <TableCell className="font-medium">
                            <Link
                              href={`/admin/centre/${school.id}`}
                              className="underline underline-offset-2 hover:text-primary"
                            >
                              {school.name}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{school.domain}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{PLAN_LABELS[school.planType]}</Badge>
                          </TableCell>
                          <TableCell>{school._count.users}</TableCell>
                          <TableCell>{school._count.classGroups}</TableCell>
                          <TableCell className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              nativeButton={false}
                              render={<Link href={`/admin/centre/${school.id}`} />}
                            >
                              Veure
                            </Button>
                            <form action={deleteSchool}>
                              <input type="hidden" name="schoolId" value={school.id} />
                              <ConfirmButton
                                message={`Segur que vols eliminar "${school.name}"?\n\nS'esborraran els seus ${school._count.classGroups} grup(s) classe i tots els dictats i entregues que hi pengen.\n\nEls ${school._count.users} usuaris no s'esborren, però es quedaran sense centre.\n\nAquesta acció no es pot desfer.`}
                              >
                                Eliminar
                              </ConfirmButton>
                            </form>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          Encara no hi ha cap escola donada d&apos;alta.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="metriques">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={School}
                label="Escoles actives"
                value={data.dbAvailable ? data.schools.length : "-"}
              />
              <MetricCard
                icon={Users}
                label="Usuaris totals"
                value={data.dbAvailable ? data.userCount : "-"}
              />
              <MetricCard
                icon={FileText}
                label="Dictats generats"
                value={data.dbAvailable ? data.dictationCount : "-"}
              />
              <MetricCard
                icon={ScanLine}
                label="Entregues corregides"
                value={data.dbAvailable ? data.submissionCount : "-"}
              />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              El consum detallat de tokens d&apos;IA per escola requereix connectar la
              facturació d&apos;Anthropic / OpenAI; de moment es mostren comptadors d&apos;ús
              reals de la plataforma.
            </p>
          </TabsContent>

          <TabsContent value="auditoria">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" />
                  Activitat recent (dades personals tractades)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Esdeveniment</TableHead>
                      <TableHead>Usuari</TableHead>
                      <TableHead>Detall</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.dbAvailable && data.activity.length > 0 ? (
                      data.activity.map((event) => (
                        <TableRow key={event.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">
                            {event.date.toLocaleString("ca-ES")}
                          </TableCell>
                          <TableCell>{event.type}</TableCell>
                          <TableCell>{event.actor}</TableCell>
                          <TableCell className="text-muted-foreground">{event.detail}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          Encara no hi ha activitat registrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof School;
  label: string;
  value: number | string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 pt-6">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
