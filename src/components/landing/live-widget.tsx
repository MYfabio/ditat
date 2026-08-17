"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { GRADE_LEVELS, ORTHOGRAPHIC_RULES } from "@/lib/dictation-rules";

export function LiveWidget() {
  const [gradeLevel, setGradeLevel] = useState<string>(GRADE_LEVELS[3].value);
  const [targetRule, setTargetRule] = useState<string>(ORTHOGRAPHIC_RULES[0].value);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ title: string; text: string; mocked: boolean } | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dictations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeLevel, targetRule, preview: true }),
      });
      if (!res.ok) throw new Error("No s'ha pogut generar el dictat.");
      const data = await res.json();
      setResult(data);
    } catch {
      setError("Hi ha hagut un problema generant el dictat. Torna-ho a provar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="provador" className="border-b py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Prova el generador ara mateix
          </h2>
          <p className="mt-3 text-muted-foreground">
            Tria un curs i una regla ortografica: la IA et proposara un dictat de
            mostra a l&apos;instant.
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Curs
                </label>
                <Select value={gradeLevel} onValueChange={(v) => v && setGradeLevel(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADE_LEVELS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Regla ortografica
                </label>
                <Select value={targetRule} onValueChange={(v) => v && setTargetRule(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORTHOGRAPHIC_RULES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleGenerate} disabled={loading} className="w-full sm:w-auto">
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Wand2 className="size-4" />
                  )}
                  Generar
                </Button>
              </div>
            </div>

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

            {result && (
              <div className="mt-6 rounded-lg border bg-muted/40 p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Sparkles className="size-4 text-primary" />
                    {result.title}
                  </div>
                  {result.mocked && (
                    <Badge variant="secondary">Mostra simulada (sense clau IA)</Badge>
                  )}
                </div>
                <p className="text-pretty leading-relaxed">{result.text}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
