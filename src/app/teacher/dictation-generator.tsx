"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Wand2, Loader2, Sparkles, Ruler } from "lucide-react";
import { toast } from "sonner";
import { GRADE_LEVELS, ORTHOGRAPHIC_RULES, lengthForGrade, countWords } from "@/lib/dictation-rules";
import { SPEED_OPTIONS } from "@/lib/playback-settings";

const NEE_OPTIONS = [
  { value: "cap", label: "Cap adaptació específica" },
  { value: "tdah", label: "Ritme TDAH (frases curtes)" },
  { value: "dislexia", label: "Suport dislèxia (vocabulari senzill)" },
];

export function DictationGenerator({
  classGroups,
}: {
  classGroups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [gradeLevel, setGradeLevel] = useState(GRADE_LEVELS[3].value);
  const [targetRule, setTargetRule] = useState(ORTHOGRAPHIC_RULES[0].value);
  const [neeAdaptation, setNeeAdaptation] = useState("cap");
  const [classGroupId, setClassGroupId] = useState<string>("none");
  const [withAudio, setWithAudio] = useState(false);
  const [speed, setSpeed] = useState<number>(1);
  const [repetitions, setRepetitions] = useState<string>("unlimited");
  const [hiddenScreen, setHiddenScreen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ title: string; text: string; mocked: boolean } | null>(
    null
  );

  const length = lengthForGrade(gradeLevel);

  async function handleGenerate() {
    setLoading(true);
    setPreview(null);
    try {
      const res = await fetch("/api/dictations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradeLevel,
          targetRule,
          neeAdaptation,
          classGroupId: classGroupId === "none" ? undefined : classGroupId,
          withAudio,
          playback: {
            defaultSpeed: speed,
            maxRepetitions: repetitions === "unlimited" ? null : Number(repetitions),
            forceHiddenScreen: hiddenScreen,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No s'ha pogut generar el dictat.");
        if (data.preview) setPreview(data.preview);
        return;
      }
      toast.success("Dictat generat i desat correctament.");
      setPreview({ title: data.dictation.title, text: data.dictation.rawText, mocked: data.mocked });
      router.refresh();
    } catch {
      toast.error("Error de xarxa generant el dictat.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Curs">
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
          </Field>
          <Field label="Regla ortogràfica">
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
          </Field>
          <Field label="Adaptació NEE">
            <Select value={neeAdaptation} onValueChange={(v) => v && setNeeAdaptation(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NEE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Grup classe">
            <Select value={classGroupId} onValueChange={(v) => v && setClassGroupId(v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sense grup</SelectItem>
                {classGroups.map((cg) => (
                  <SelectItem key={cg.id} value={cg.id}>
                    {cg.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
          <Ruler className="mt-0.5 size-4 shrink-0" />
          <span>
            <strong className="text-foreground">{length.cycle}</strong> ({length.ages}):{" "}
            el dictat tindrà entre <strong className="text-foreground">{length.min} i {length.max} paraules</strong>.{" "}
            {length.guidance}
          </span>
        </div>

        <div className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">Com ho escoltarà l&apos;alumnat</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Velocitat inicial">
              <Select value={String(speed)} onValueChange={(v) => v && setSpeed(Number(v))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SPEED_OPTIONS.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s}x
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Repeticions per frase">
              <Select value={repetitions} onValueChange={(v) => v && setRepetitions(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">Sense límit</SelectItem>
                  {[1, 2, 3, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={hiddenScreen}
                  onChange={(e) => setHiddenScreen(e.target.checked)}
                />
                Pantalla oculta obligatòria
              </label>
            </div>
          </div>
          {hiddenScreen && (
            <p className="text-xs text-muted-foreground">
              L&apos;alumnat no podrà destapar el text mentre escriu: el dictat es farà només
              d&apos;oïda.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="size-4"
              checked={withAudio}
              onChange={(e) => setWithAudio(e.target.checked)}
            />
            Generar també àudio (TTS)
          </label>
          <Button onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Wand2 className="size-4" />}
            Generar dictat
          </Button>
        </div>

        {preview && (
          <div className="rounded-lg border bg-muted/40 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="size-4 text-primary" />
                {preview.title}
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  const w = countWords(preview.text);
                  const inRange = w >= length.min && w <= length.max;
                  return (
                    <Badge variant={inRange ? "secondary" : "outline"}>
                      {w} paraules{inRange ? "" : ` (fora de ${length.min}-${length.max})`}
                    </Badge>
                  );
                })()}
                {preview.mocked && <Badge variant="secondary">Text simulat (sense clau IA)</Badge>}
              </div>
            </div>
            <p className="text-sm leading-relaxed">{preview.text}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
