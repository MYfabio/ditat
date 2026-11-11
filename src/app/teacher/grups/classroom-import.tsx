"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GRADE_LEVELS } from "@/lib/dictation-rules";
import {
  importaCursClassroom,
  llistaCursosClassroom,
  sincronitzaGrupClassroom,
  type CursClassroom,
  type SyncResult,
} from "./actions";

/**
 * Cursos de Classroom del docent, amb un boto per importar cadascun com a
 * grup (o per tornar a llegir-ne l'alumnat si ja esta importat). Els cursos
 * es llegeixen al vol: aqui no es desa res fins que el docent prem Importa.
 */
export function ClassroomImport() {
  const router = useRouter();
  const [courses, setCourses] = useState<CursClassroom[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, startLoading] = useTransition();

  function carrega() {
    // Tot l'estat es toca dins de la transicio, mai sincronicament a l'efecte.
    startLoading(async () => {
      setError(null);
      const r = await llistaCursosClassroom();
      if (!r.ok) {
        setError(r.error);
        setCourses([]);
      } else if (!r.connected) {
        setError("Classroom no està connectat. Recarrega la pàgina per tornar-lo a connectar.");
        setCourses([]);
      } else {
        setCourses(r.courses);
      }
    });
  }

  // Nomes en obrir la pagina.
  useEffect(() => {
    carrega();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Els teus cursos actius a Google Classroom. Importar-ne un crea el grup i hi posa
          l&apos;alumnat; qui ja existeixi al centre s&apos;hi assigna, i qui no, es dona
          d&apos;alta com a alumne/a.
        </p>
        <Button size="sm" variant="outline" onClick={carrega} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          Torna a llegir
        </Button>
      </div>

      {error && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {courses === null && !error && (
        <p className="text-sm text-muted-foreground">Llegint els cursos de Classroom…</p>
      )}

      {courses !== null && courses.length === 0 && !error && (
        <p className="text-sm text-muted-foreground">
          No tens cap curs actiu a Classroom amb el compte amb què has entrat.
        </p>
      )}

      {courses && courses.length > 0 && (
        <ul className="divide-y rounded-md border">
          {courses.map((c) => (
            <CourseRow key={c.id} course={c} onDone={() => router.refresh()} />
          ))}
        </ul>
      )}
    </div>
  );
}

function CourseRow({ course, onDone }: { course: CursClassroom; onDone: () => void }) {
  const [gradeLevel, setGradeLevel] = useState<string>(GRADE_LEVELS[0].value);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [pending, start] = useTransition();
  const [importedId, setImportedId] = useState<string | null>(course.importedGroupId);

  function run(fn: () => Promise<SyncResult>) {
    start(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok) {
        setImportedId(r.groupId);
        toast.success(
          `${r.groupName}: ${r.creats} alumnes nous, ${r.actualitzats} assignats, ${r.jaHiEren} ja hi eren.`,
        );
        onDone();
      } else {
        toast.error(r.error);
      }
    });
  }

  return (
    <li className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium">
          {course.name}
          {course.section && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">{course.section}</span>
          )}
        </p>
        {result && result.ok && (
          <p className="mt-1 text-xs text-muted-foreground">
            {result.creats} nous · {result.actualitzats} assignats · {result.jaHiEren} ja hi eren
            {result.omesos.length > 0 && ` · ${result.omesos.length} omesos`}
          </p>
        )}
        {result && result.ok && result.omesos.length > 0 && (
          <ul className="mt-1 list-disc pl-4 text-xs text-amber-700 dark:text-amber-400">
            {result.omesos.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {course.bloquejat ? (
          <Badge variant="secondary">Importat per un altre docent</Badge>
        ) : importedId ? (
          <>
            <Badge variant="secondary">Importat</Badge>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => run(() => sincronitzaGrupClassroom(importedId))}
            >
              {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
              Actualitza l&apos;alumnat
            </Button>
            <Button size="sm" variant="ghost" nativeButton={false} render={<Link href={`/teacher/grups/${importedId}`} />}>
              Obre el grup <ExternalLink />
            </Button>
          </>
        ) : (
          <>
            <select
              aria-label={`Curs del grup ${course.name}`}
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className="h-7 rounded-md border border-input bg-background px-2 text-sm"
            >
              {GRADE_LEVELS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={pending}
              onClick={() => run(() => importaCursClassroom(course.id, gradeLevel))}
            >
              {pending ? <Loader2 className="animate-spin" /> : <Download />}
              Importa
            </Button>
          </>
        )}
      </div>
    </li>
  );
}
