"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BookOpenText, Contrast, Timer, Loader2, Check, UserMinus } from "lucide-react";
import { toast } from "sonner";
import { updateStudentNeeds, removeStudentFromGroup, deleteStudent } from "./actions";
import { ConfirmButton } from "@/components/dashboard/confirm-button";
import { hasAnyAdaptation, type NeedsProfile } from "@/lib/needs-profile";

export type RosterStudent = {
  id: string;
  name: string;
  email: string;
  classGroupName: string | null;
  needs: NeedsProfile;
};

export function ClassRoster({ students }: { students: RosterStudent[] }) {
  if (students.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Encara no tens cap alumne/a assignat. Demana a la coordinació del centre que importi
        l&apos;alumnat i l&apos;assigni al teu grup classe.
      </p>
    );
  }

  const byGroup = students.reduce<Record<string, RosterStudent[]>>((acc, s) => {
    const key = s.classGroupName ?? "Sense grup";
    (acc[key] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Activa les adaptacions de cada alumne/a segons el que sàpigues de les seves
        necessitats. S&apos;apliquen automàticament a la seva pantalla i als dictats que se li
        generen.
      </p>

      {Object.entries(byGroup).map(([groupName, groupStudents]) => (
        <Card key={groupName}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              {groupName}
              <Badge variant="secondary">{groupStudents.length} alumnes</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Alumne/a</TableHead>
                  <TableHead className="text-center">
                    <span className="inline-flex items-center gap-1">
                      <BookOpenText className="size-3.5" /> Dislèxia
                    </span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="inline-flex items-center gap-1">
                      <Contrast className="size-3.5" /> Alt contrast
                    </span>
                  </TableHead>
                  <TableHead className="text-center">
                    <span className="inline-flex items-center gap-1">
                      <Timer className="size-3.5" /> Ritme TDAH
                    </span>
                  </TableHead>
                  <TableHead>Nota</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupStudents.map((student) => (
                  <StudentRow key={student.id} student={student} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function StudentRow({ student }: { student: RosterStudent }) {
  const [needs, setNeeds] = useState<NeedsProfile>(student.needs);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty =
    needs.dyslexiaSupport !== student.needs.dyslexiaSupport ||
    needs.highContrast !== student.needs.highContrast ||
    needs.tdahPacing !== student.needs.tdahPacing ||
    (needs.notes ?? "") !== (student.needs.notes ?? "");

  function save() {
    startTransition(async () => {
      try {
        await updateStudentNeeds(student.id, needs);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
        toast.success(`Adaptacions desades per a ${student.name}.`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "No s'han pogut desar.");
      }
    });
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium">{student.name}</span>
          <span className="text-xs text-muted-foreground">{student.email}</span>
        </div>
        {hasAnyAdaptation(student.needs) && (
          <Badge variant="secondary" className="mt-1">
            Amb adaptacions
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-center">
        <Checkbox
          checked={needs.dyslexiaSupport}
          onCheckedChange={(v) => setNeeds((n) => ({ ...n, dyslexiaSupport: Boolean(v) }))}
          aria-label={`Suport dislèxia per a ${student.name}`}
        />
      </TableCell>
      <TableCell className="text-center">
        <Checkbox
          checked={needs.highContrast}
          onCheckedChange={(v) => setNeeds((n) => ({ ...n, highContrast: Boolean(v) }))}
          aria-label={`Alt contrast per a ${student.name}`}
        />
      </TableCell>
      <TableCell className="text-center">
        <Checkbox
          checked={needs.tdahPacing}
          onCheckedChange={(v) => setNeeds((n) => ({ ...n, tdahPacing: Boolean(v) }))}
          aria-label={`Ritme TDAH per a ${student.name}`}
        />
      </TableCell>
      <TableCell>
        <Input
          value={needs.notes ?? ""}
          onChange={(e) => setNeeds((n) => ({ ...n, notes: e.target.value }))}
          placeholder="Indicacions de l'equip d'orientació..."
          aria-label={`Nota sobre ${student.name}`}
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button size="sm" onClick={save} disabled={!dirty || pending}>
            {pending ? <Loader2 className="animate-spin" /> : saved ? <Check /> : null}
            {saved ? "Desat" : "Desar"}
          </Button>
          <form action={removeStudentFromGroup}>
            <input type="hidden" name="studentId" value={student.id} />
            <Button
              type="submit"
              size="icon-sm"
              variant="ghost"
              title="Treure del grup"
              aria-label={`Treure ${student.name} del grup`}
            >
              <UserMinus className="size-4" />
            </Button>
          </form>
          <form action={deleteStudent}>
            <input type="hidden" name="studentId" value={student.id} />
            <ConfirmButton
              size="icon-sm"
              message={`Vols ELIMINAR ${student.name} del tot?\n\nS'esborraran també totes les seves entregues, les correccions i el seu perfil d'aprenentatge. No es pot desfer.\n\nSi només vol canviar de grup, fes servir "Treure del grup".`}
            >
              {""}
            </ConfirmButton>
          </form>
        </div>
      </TableCell>
    </TableRow>
  );
}
