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
import { Wand2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { GRADE_LEVELS, ORTHOGRAPHIC_RULES } from "@/lib/dictation-rules";

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
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ title: string; text: string; mocked: boolean } | null>(
    null
  );

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
              {preview.mocked && <Badge variant="secondary">Text simulat (sense clau IA)</Badge>}
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
