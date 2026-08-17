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
import { Checkbox } from "@/components/ui/checkbox";
import { CsvImportForm } from "./csv-import-form";
import { createClassGroup, assignStudentToClass, updateNeePresets } from "./actions";
import { GRADE_LEVELS } from "@/lib/dictation-rules";

type NeePresets = {
  dyslexicFontDefault?: boolean;
  highContrastDefault?: boolean;
  tdahPacingDefault?: boolean;
};

async function loadSchoolData(schoolId: string) {
  try {
    const [school, teachers, students, classGroups] = await Promise.all([
      prisma.school.findUnique({ where: { id: schoolId } }),
      prisma.user.findMany({ where: { schoolId, role: "TEACHER" }, orderBy: { name: "asc" } }),
      prisma.user.findMany({ where: { schoolId, role: "STUDENT" }, orderBy: { name: "asc" } }),
      prisma.classGroup.findMany({
        where: { schoolId },
        include: { teacher: true, _count: { select: { students: true } } },
        orderBy: { name: "asc" },
      }),
    ]);
    return { dbAvailable: true as const, school, teachers, students, classGroups };
  } catch {
    return { dbAvailable: false as const };
  }
}

export default async function SchoolPage() {
  const session = await auth();
  const schoolId = session?.user?.schoolId;
  const data = schoolId ? await loadSchoolData(schoolId) : { dbAvailable: false as const };
  const neePresets = (data.dbAvailable ? data.school?.neePresets : null) as NeePresets | null;

  return (
    <>
      <DashboardHeader
        title="Panell de Coordinacio d'Escola"
        subtitle="Importacio d'usuaris, grups classe i adaptacions NEE del centre."
        role="SCHOOL_COORD"
        userName={session?.user?.name}
        userEmail={session?.user?.email}
      />
      <main className="mx-auto max-w-6xl flex-1 space-y-6 px-4 py-8 sm:px-6">
        {!data.dbAvailable && <DbNotice />}
        {data.dbAvailable && !schoolId && (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            El teu usuari encara no te cap escola assignada. Demana al superadministrador que
            registri el domini del teu centre.
          </div>
        )}

        {schoolId && (
          <Tabs defaultValue="importar">
            <TabsList>
              <TabsTrigger value="importar">Importar usuaris</TabsTrigger>
              <TabsTrigger value="grups">Grups classe</TabsTrigger>
              <TabsTrigger value="nee">Adaptacions NEE</TabsTrigger>
            </TabsList>

            <TabsContent value="importar">
              <Card>
                <CardHeader>
                  <CardTitle>Importacio massiva per CSV</CardTitle>
                </CardHeader>
                <CardContent>
                  <CsvImportForm />
                </CardContent>
              </Card>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <UsersTable title="Docents" users={data.dbAvailable ? data.teachers : []} />
                <UsersTable title="Alumnat" users={data.dbAvailable ? data.students : []} />
              </div>
            </TabsContent>

            <TabsContent value="grups" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Crear un grup classe</CardTitle>
                </CardHeader>
                <CardContent>
                  <form action={createClassGroup} className="grid gap-4 sm:grid-cols-[2fr_1fr_2fr_auto]">
                    <div className="grid gap-1.5">
                      <Label htmlFor="name">Nom del grup</Label>
                      <Input id="name" name="name" placeholder="4t A" required />
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
                    <div className="grid gap-1.5">
                      <Label htmlFor="teacherId">Docent tutor</Label>
                      <select
                        id="teacherId"
                        name="teacherId"
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        defaultValue=""
                      >
                        <option value="">Sense assignar</option>
                        {data.dbAvailable &&
                          data.teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name || t.email}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" className="w-full">
                        Crear
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Grups classe del centre</CardTitle>
                </CardHeader>
                <CardContent>
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
                      {data.dbAvailable && data.classGroups.length > 0 ? (
                        data.classGroups.map((cg) => (
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
                            Encara no hi ha grups classe.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Assignar alumne/a a un grup</CardTitle>
                </CardHeader>
                <CardContent>
                  <form
                    action={assignStudentToClass}
                    className="grid gap-4 sm:grid-cols-[2fr_2fr_auto]"
                  >
                    <div className="grid gap-1.5">
                      <Label htmlFor="studentId">Alumne/a</Label>
                      <select
                        id="studentId"
                        name="studentId"
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        required
                      >
                        {data.dbAvailable &&
                          data.students.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name || s.email}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="classGroupId">Grup classe</Label>
                      <select
                        id="classGroupId"
                        name="classGroupId"
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        required
                      >
                        {data.dbAvailable &&
                          data.classGroups.map((cg) => (
                            <option key={cg.id} value={cg.id}>
                              {cg.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" className="w-full">
                        Assignar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="nee">
              <Card>
                <CardHeader>
                  <CardTitle>Preajustos globals d&apos;adaptacio NEE</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Aquests preajustos s&apos;apliquen per defecte a l&apos;alumnat nou del
                    centre. Cada alumne pot desactivar-los individualment des del seu perfil.
                  </p>
                  <form action={updateNeePresets} className="space-y-4">
                    <label className="flex items-center gap-3 text-sm">
                      <Checkbox
                        name="dyslexicFontDefault"
                        defaultChecked={neePresets?.dyslexicFontDefault}
                      />
                      Activar tipografia OpenDyslexic per defecte
                    </label>
                    <label className="flex items-center gap-3 text-sm">
                      <Checkbox
                        name="highContrastDefault"
                        defaultChecked={neePresets?.highContrastDefault}
                      />
                      Activar mode d&apos;alt contrast per defecte
                    </label>
                    <label className="flex items-center gap-3 text-sm">
                      <Checkbox
                        name="tdahPacingDefault"
                        defaultChecked={neePresets?.tdahPacingDefault}
                      />
                      Fragmentar els dictats en blocs curts (ritme TDAH) per defecte
                    </label>
                    <Button type="submit">Desar preajustos</Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </main>
    </>
  );
}

function UsersTable({
  title,
  users,
}: {
  title: string;
  users: { id: string; name: string | null; email: string }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          {title}
          <Badge variant="secondary">{users.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5 text-sm">
          {users.length > 0 ? (
            users.map((u) => (
              <li key={u.id} className="flex justify-between border-b py-1.5 last:border-0">
                <span>{u.name || "-"}</span>
                <span className="text-muted-foreground">{u.email}</span>
              </li>
            ))
          ) : (
            <li className="text-muted-foreground">Cap usuari encara.</li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
