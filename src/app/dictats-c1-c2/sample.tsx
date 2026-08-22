"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Pause, Eye, RotateCcw, Wand2 } from "lucide-react";

/**
 * Un dictat de nivell C1 o C2, jugable sense registrar-se.
 *
 * Ensenyar val mes que explicar: qui l'escolta i s'hi equivoca ja sap si li
 * serveix, i llavors el boto de crear compte te sentit. Per aixo el text es
 * genera de debo i la veu sona, encara que la correccio automatica —que es el
 * que es paga— queda per a qui entri.
 */
export function SampleDictation({ nivell }: { nivell: "C1" | "C2" }) {
  const [text, setText] = useState<string | null>(null);
  const [titol, setTitol] = useState("");
  const [carregant, setCarregant] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [escrit, setEscrit] = useState("");
  const [mostraText, setMostraText] = useState(false);
  const [parlant, setParlant] = useState(false);
  const [senseVeu, setSenseVeu] = useState(false);
  const iniciat = useRef(false);

  const frases = useMemo(
    () => (text ? text.split(/(?<=[.!?])\s+/).filter(Boolean) : []),
    [text]
  );

  async function genera() {
    setCarregant(true);
    setError(null);
    setMostraText(false);
    setEscrit("");
    try {
      const res = await fetch("/api/dictations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeLevel: nivell, targetRule: "b-v", preview: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No s'ha pogut preparar el dictat.");
        return;
      }
      setText(data.text);
      setTitol(data.title ?? `Dictat de nivell ${nivell}`);
      iniciat.current = true;
    } catch {
      setError("Error de xarxa. Torna-ho a provar.");
    } finally {
      setCarregant(false);
    }
  }

  function escolta() {
    if (!text || typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSenseVeu(true);
      return;
    }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ca-ES";
    u.rate = 0.85;
    const veu = window.speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("ca"));
    if (veu) u.voice = veu;
    setSenseVeu(!veu);
    u.onstart = () => setParlant(true);
    u.onend = () => setParlant(false);
    window.speechSynthesis.speak(u);
  }

  function atura() {
    window.speechSynthesis.cancel();
    setParlant(false);
  }

  if (!text) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center">
        <p className="mb-1 font-medium">Fes un dictat de nivell {nivell} ara mateix</p>
        <p className="mb-4 text-sm text-muted-foreground">
          Sense registrar-te i sense donar cap dada.
        </p>
        <Button size="lg" onClick={genera} disabled={carregant}>
          {carregant ? <Loader2 className="animate-spin" /> : <Wand2 className="size-4" />}
          Preparar el meu dictat
        </Button>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{titol}</h3>
        <Badge variant="secondary">
          {frases.length} frases · nivell {nivell}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={parlant ? atura : escolta}>
          {parlant ? <Pause className="size-4" /> : <Play className="size-4" />}
          {parlant ? "Aturar" : "Escoltar el dictat"}
        </Button>
        <Button variant="outline" onClick={genera} disabled={carregant}>
          {carregant ? <Loader2 className="animate-spin" /> : <RotateCcw className="size-4" />}
          Un altre
        </Button>
      </div>

      {senseVeu && (
        <p className="rounded-md border border-dashed border-amber-400/60 bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Aquest dispositiu no té cap veu catalana instal·lada i la pronúncia pot no ser
          correcta. Dins de dictats.cat el dictat el llegeix una veu catalana de veritat.
        </p>
      )}

      <Textarea
        value={escrit}
        onChange={(e) => setEscrit(e.target.value)}
        placeholder="Escriu aquí el que sentis…"
        rows={5}
        spellCheck={false}
        autoCorrect="off"
        className="text-base leading-relaxed"
      />

      {mostraText ? (
        <div className="rounded-md bg-muted/50 p-4">
          <p className="mb-1 text-xs font-medium text-muted-foreground">Text original</p>
          <p className="text-sm leading-relaxed">{text}</p>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setMostraText(true)}>
          <Eye className="size-4" />
          Veure el text per corregir-me jo mateix
        </Button>
      )}

      {mostraText && (
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
          <p className="text-sm">
            <strong>Comparar-ho a ull cansa i se t&apos;escapen faltes.</strong> Dins de
            dictats.cat la correcció és automàtica: et diu quina paraula has fallat, per què,
            i el dictat següent insisteix justament en allò que t&apos;ha costat.
          </p>
          <Button className="mt-3" nativeButton={false} render={<a href="/login" />}>
            Crear el compte gratis
          </Button>
        </div>
      )}
    </div>
  );
}
