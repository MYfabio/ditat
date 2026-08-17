"use client";

import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Camera,
  Loader2,
  PartyPopper,
} from "lucide-react";
import { toast } from "sonner";

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
}: {
  dictationId: string;
  title: string;
  rawText: string;
  audioUrl: string | null;
}) {
  const chunks = useMemo(() => chunkSentences(rawText), [rawText]);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ score: number; feedback: string } | null>(null);
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

  async function handleUpload() {
    if (!photoPreview) return;
    setUploading(true);
    try {
      const res = await fetch("/api/submissions/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dictationId, photoDataUrl: photoPreview }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No s'ha pogut corregir la foto.");
        return;
      }
      setResult({
        score: data.submission.score,
        feedback: data.submission.correctedData?.feedback ?? "",
      });
      toast.success("Dictat corregit!");
    } catch {
      toast.error("Error de xarxa pujant la foto.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{title}</h3>
        <Badge variant="outline">
          Frase {chunkIndex + 1} / {chunks.length}
        </Badge>
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
          Sense audio generat (OPENAI_API_KEY no configurada): es fa servir la veu del
          navegador.
        </p>
      )}

      <div className="border-t pt-4">
        <p className="mb-2 text-sm font-medium">Puja una foto del dictat fet a ma</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Camera className="size-4" />
            Fer foto / pujar imatge
          </Button>
          {photoPreview && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoPreview}
                alt="Previsualitzacio del dictat"
                className="h-16 w-16 rounded-md border object-cover"
              />
              <Button type="button" onClick={handleUpload} disabled={uploading}>
                {uploading && <Loader2 className="animate-spin" />}
                Enviar per correccio
              </Button>
            </>
          )}
        </div>

        {result && (
          <div className="mt-4 flex items-start gap-3 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
            <PartyPopper className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="font-medium">Puntuacio: {result.score}%</p>
              <p className="text-muted-foreground">{result.feedback}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
