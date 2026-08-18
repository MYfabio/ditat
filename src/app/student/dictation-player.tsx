"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Camera,
  Loader2,
  PartyPopper,
  CheckCircle2,
  Sparkles,
  Keyboard,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type SubmissionResult = {
  score: number;
  feedback: string;
  ocrText: string | null;
  errors: { paraulaOriginal: string; paraulaEscrita: string; explicacio: string }[];
};

function chunkSentences(text: string, size = 2) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  for (let i = 0; i < sentences.length; i += size) {
    chunks.push(sentences.slice(i, i + size).join(" "));
  }
  return chunks.length ? chunks : [text];
}

const SPEEDS = [0.75, 1, 1.25, 1.5];

export function DictationPlayer({
  dictationId,
  title,
  rawText,
  audioUrl,
  personalised = false,
}: {
  dictationId: string;
  title: string;
  rawText: string;
  audioUrl: string | null;
  personalised?: boolean;
}) {
  const router = useRouter();
  const chunks = useMemo(() => chunkSentences(rawText), [rawText]);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [mode, setMode] = useState<"keyboard" | "photo">("keyboard");
  const [typedText, setTypedText] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function setPlaybackSpeed(rate: number) {
    setSpeed(rate);
    if (audioRef.current) audioRef.current.playbackRate = rate;
  }

  function handleListen() {
    if (audioUrl && audioRef.current) {
      audioRef.current.playbackRate = speed;
      audioRef.current.play();
      return;
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("El teu navegador no permet la lectura en veu alta.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
    utterance.lang = "ca-ES";
    utterance.rate = speed;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function handlePause() {
    if (audioUrl && audioRef.current) {
      audioRef.current.pause();
    } else if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }

  function handleFileChange(file: File) {
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
    setResult(null);
  }

  async function handleSubmit() {
    const isTyped = mode === "keyboard";
    if (isTyped ? !typedText.trim() : !photoPreview) return;

    setUploading(true);
    try {
      const res = await fetch("/api/submissions/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isTyped
            ? { dictationId, typedText }
            : { dictationId, photoDataUrl: photoPreview }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No s'ha pogut corregir el dictat.");
        return;
      }
      setResult({
        score: data.submission.score,
        feedback: data.submission.correctedData?.feedback ?? "",
        ocrText: data.submission.ocrText,
        errors: data.submission.correctedData?.errors ?? [],
      });
      toast.success("Dictat corregit!");
      router.refresh();
    } catch {
      toast.error("Error de xarxa enviant el dictat.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          {personalised && (
            <Badge>
              <Sparkles className="size-3" />
              Fet per a tu
            </Badge>
          )}
          <Badge variant="outline">
            Frase {chunkIndex + 1} / {chunks.length}
          </Badge>
        </div>
      </div>

      <p className="rounded-md bg-muted/40 p-4 text-lg leading-relaxed">{chunks[chunkIndex]}</p>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            size="icon-sm"
            variant="outline"
            disabled={chunkIndex === 0}
            onClick={() => setChunkIndex((i) => Math.max(0, i - 1))}
          >
            <ChevronLeft />
          </Button>
          {speaking ? (
            <Button size="icon-sm" variant="outline" onClick={handlePause}>
              <Pause />
            </Button>
          ) : (
            <Button size="icon-sm" variant="outline" onClick={handleListen}>
              <Play />
            </Button>
          )}
          <Button
            size="icon-sm"
            variant="outline"
            disabled={chunkIndex === chunks.length - 1}
            onClick={() => setChunkIndex((i) => Math.min(chunks.length - 1, i + 1))}
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {SPEEDS.map((s) => (
            <Button
              key={s}
              size="sm"
              variant={speed === s ? "default" : "outline"}
              onClick={() => setPlaybackSpeed(s)}
            >
              {s}x
            </Button>
          ))}
        </div>
      </div>

      {audioUrl && <audio ref={audioRef} src={audioUrl} className="hidden" />}
      {!audioUrl && (
        <p className="text-xs text-muted-foreground">
          Sense àudio generat (OPENAI_API_KEY no configurada): es fa servir la veu del
          navegador.
        </p>
      )}

      <div className="border-t pt-4">
        <p className="mb-3 text-sm font-medium">Com vols fer el dictat?</p>

        {!result && (
          <>
            <div className="mb-3 inline-flex rounded-lg border p-1">
              <Button
                type="button"
                size="sm"
                variant={mode === "keyboard" ? "default" : "ghost"}
                onClick={() => setMode("keyboard")}
              >
                <Keyboard className="size-4" />
                Escriure amb el teclat
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "photo" ? "default" : "ghost"}
                onClick={() => setMode("photo")}
              >
                <Camera className="size-4" />
                Fer una foto
              </Button>
            </div>

            {mode === "keyboard" ? (
              <div className="space-y-3">
                <Textarea
                  value={typedText}
                  onChange={(e) => setTypedText(e.target.value)}
                  placeholder="Escriu aquí el dictat mentre l'escoltes..."
                  rows={5}
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="off"
                  className="text-base leading-relaxed"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={uploading || !typedText.trim()}
                  >
                    {uploading && <Loader2 className="animate-spin" />}
                    Enviar per correcció
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    El corrector del navegador està desactivat perquè el dictat sigui teu.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="size-4" />
                    Fer foto / pujar imatge
                  </Button>
                  {photoPreview && (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview}
                        alt="Previsualització del dictat"
                        className="h-16 w-16 rounded-md border object-cover"
                      />
                      <Button type="button" onClick={handleSubmit} disabled={uploading}>
                        {uploading && <Loader2 className="animate-spin" />}
                        Enviar per correcció
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {result && (
          <div className="mt-4 space-y-4">
            <div className="flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
              <PartyPopper className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="font-medium">Puntuació: {result.score}%</p>
                <p className="text-muted-foreground">{result.feedback}</p>
              </div>
            </div>

            <div className="rounded-md border p-4">
              <p className="mb-3 text-sm font-medium">Autocorregeix el teu dictat</p>
              <div
                className={`grid gap-4 ${
                  photoPreview ? "sm:grid-cols-[auto_1fr_1fr]" : "sm:grid-cols-2"
                }`}
              >
                {photoPreview && (
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">La teva foto</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoPreview}
                      alt="Foto que has enviat"
                      className="h-32 w-32 rounded-md border object-cover"
                    />
                  </div>
                )}
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">Text original del dictat</p>
                  <p className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed">{rawText}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">El que has escrit</p>
                  <p className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
                    {result.ocrText || "Sense text detectat."}
                  </p>
                </div>
              </div>

              {result.errors.length > 0 ? (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Paraules per revisar
                  </p>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ho havies d&apos;escriure</TableHead>
                        <TableHead>Ho vas escriure</TableHead>
                        <TableHead>Per què</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((err, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{err.paraulaOriginal}</TableCell>
                          <TableCell className="text-destructive">{err.paraulaEscrita}</TableCell>
                          <TableCell className="text-muted-foreground">{err.explicacio}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 text-sm text-primary">
                  <CheckCircle2 className="size-4" />
                  Cap error detectat, ho has escrit tot correctament!
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
