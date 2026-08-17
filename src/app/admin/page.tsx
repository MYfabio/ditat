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
import { School, Users, FileText, ScanLine, ShieldCheck } from "lucide-react";
import { createSchool } from "./actions";

const PLAN_LABELS: Record<string, string> = {
  AULA: "Pla Aula",
  ESCOLA: "Pla Escola",
  XARXA: "Pla Xarxa / Municipal",
};

async function loadAdminData() {
  try {
    const [schools, userCount, dictationCount, submissionCount, recentDictations, recentSubmissions] =
      await Promise.all([
        prisma.school.findMany({
          include: { _count: { select: { users: true, classGroups: true } } },
          orderBy: { createdAt: "desc" },
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
        actor: d.teacher.name || d.teacher.email,
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
      userCount,
      dictationCount,
      submissionCount,
      activity,
    };
  } catch {
    return { dbAvailable: false as const };
  }
}

export default async function AdminPage() {
  const session = await auth();
  const data = await loadAdminData();

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

        <Tabs defaultValue="escoles">
          <TabsList>
            <TabsTrigger value="escoles">Escoles</TabsTrigger>
            <TabsTrigger value="metriques">Mètriques</TabsTrigger>
            <TabsTrigger value="auditoria">Auditoria RGPD</TabsTrigger>
          </TabsList>

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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.dbAvailable && data.schools.length > 0 ? (
                      data.schools.map((school) => (
                        <TableRow key={school.id}>
                          <TableCell className="font-medium">{school.name}</TableCell>
                          <TableCell className="text-muted-foreground">{school.domain}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{PLAN_LABELS[school.planType]}</Badge>
                          </TableCell>
                          <TableCell>{school._count.users}</TableCell>
                          <TableCell>{school._count.classGroups}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
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
