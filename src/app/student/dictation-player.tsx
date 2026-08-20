"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  Headphones,
  RotateCcw,
  Eye,
  EyeOff,
  Hourglass,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { DEFAULT_PLAYBACK, SPEED_OPTIONS, type PlaybackSettings } from "@/lib/playback-settings";
import { AnnotatedPhoto } from "@/components/dashboard/annotated-photo";
import type { Annotation } from "@/lib/annotations";
import { toast } from "sonner";

type SubmissionResult = {
  score: number;
  feedback: string;
  /** Que ha millorat respecte dels dictats anteriors, si hi ha res a dir. */
  progress: string | null;
  ocrText: string | null;
  errors: { paraulaOriginal: string; paraulaEscrita: string; explicacio: string }[];
  /** Paraules que l'OCR no ha llegit prou clares i que no s'han comptat. */
  uncertain: number;
  /** Marques per dibuixar sobre la foto: subratllats, titlles i intercalacions. */
  annotations: Annotation[];
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



export function DictationPlayer({
  dictationId,
  title,
  rawText,
  audioUrl,
  personalised = false,
  sentencesPerChunk = 2,
  playback = DEFAULT_PLAYBACK,
}: {
  dictationId: string;
  title: string;
  rawText: string;
  audioUrl: string | null;
  personalised?: boolean;
  /** Amb ritme TDAH n'hi ha prou amb una frase per bloc. */
  sentencesPerChunk?: number;
  /** Velocitat, repeticions i pantalla oculta que ha fixat el docent. */
  playback?: PlaybackSettings;
}) {
  const router = useRouter();
  const chunks = useMemo(
    () => chunkSentences(rawText, sentencesPerChunk),
    [rawText, sentencesPerChunk]
  );
  const [chunkIndex, setChunkIndex] = useState(0);
  const [speed, setSpeed] = useState(playback.defaultSpeed);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Repeticions consumides de la frase actual (només si el docent en posa límit).
  const [plays, setPlays] = useState<Record<number, number>>({});
  const usedPlays = plays[chunkIndex] ?? 0;
  const repetitionsLeft =
    playback.maxRepetitions === null ? null : Math.max(0, playback.maxRepetitions - usedPlays);
  const outOfRepetitions = repetitionsLeft === 0;

  // Segons que falten perquè comenci a llegir. null = no hi ha compte enrere.
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const beepCtx = useRef<AudioContext | null>(null);

  const [showText, setShowText] = useState(false);
  const [noCatalanVoice, setNoCatalanVoice] = useState(false);
  // La locució generada no ha arribat (encara no n'hi ha, o ha fallat el
  // servei de veu): a partir d'aquí es llegeix amb la veu del navegador.
  const [audioUnavailable, setAudioUnavailable] = useState(false);
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

  /**
   * Un pip curt a cada segon del compte enrere. El so importa: en el mode de
   * paper l'alumne està mirant el full, no la pantalla, i no veuria els
   * números. Si el navegador no deixa fer sons, el compte enrere continua
   * igualment de manera visual.
   */
  function beep(frequency: number, seconds: number) {
    try {
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      beepCtx.current ??= new Ctx();
      const ctx = beepCtx.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seconds);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + seconds);
    } catch {
      // Sense so: el compte enrere es veu a la pantalla igualment.
    }
  }

  function stopCountdown() {
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    setCountdown(null);
  }

  // Si el component desapareix enmig del compte enrere, el temporitzador no
  // s'ha de quedar viu intentant fer parlar una frase que ja no hi és.
  useEffect(() => stopCountdown, []);

  function handleListen() {
    if (outOfRepetitions) {
      toast.info("Ja has fet servir totes les repeticions d'aquesta frase.");
      return;
    }
    if (countdown !== null) return;

    // El compte enrere només abans del primer cop de cada frase: qui repeteix
    // ja té el boli a la mà i el que vol és tornar-la a sentir de seguida.
    const firstTime = (plays[chunkIndex] ?? 0) === 0;
    if (firstTime && playback.countdownSeconds > 0) {
      let left = playback.countdownSeconds;
      setCountdown(left);
      beep(660, 0.12);
      // Aprofitem els segons d'espera per baixar la locució: quan el compte
      // arriba a zero ja la tenim i el dictat comença sense pausa.
      if (audioUrl && !audioUnavailable) audioRef.current?.load();
      countdownTimer.current = setInterval(() => {
        left -= 1;
        if (left > 0) {
          setCountdown(left);
          beep(660, 0.12);
          return;
        }
        stopCountdown();
        beep(990, 0.25);
        speakNow();
      }, 1000);
      return;
    }
    speakNow();
  }

  function speakNow() {
    // Les repeticions es compten quan la frase sona de debò: un compte enrere
    // cancel·lat a mitges no li ha de gastar cap intent a l'alumne.
    setPlays((p) => ({ ...p, [chunkIndex]: (p[chunkIndex] ?? 0) + 1 }));

    if (audioUrl && !audioUnavailable && audioRef.current) {
      const el = audioRef.current;
      el.playbackRate = speed;
      setSpeaking(true);
      el.play().catch(() => {
        // El servidor no té locució per a aquest dictat (204) o no s'ha pogut
        // baixar. No és cap error per a l'alumne: ho llegeix el navegador.
        setAudioUnavailable(true);
        setSpeaking(false);
        speakWithBrowser();
      });
      return;
    }
    speakWithBrowser();
  }

  function speakWithBrowser() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      toast.error("El teu navegador no permet la lectura en veu alta.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
    utterance.lang = "ca-ES";
    utterance.rate = speed;

    // Sense triar la veu explícitament, alguns navegadors llegeixen el català
    // amb la veu per defecte del sistema. En un dictat això és greu: una
    // pronúncia castellana o anglesa faria escriure malament l'alumne.
    const catalanVoice = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.toLowerCase().startsWith("ca"));
    if (catalanVoice) utterance.voice = catalanVoice;
    setNoCatalanVoice(!catalanVoice);

    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function handlePause() {
    stopCountdown();
    if (audioUrl && !audioUnavailable && audioRef.current) {
      audioRef.current.pause();
      setSpeaking(false);
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
        progress: data.progress ?? null,
        ocrText: data.submission.ocrText,
        errors: data.submission.correctedData?.errors ?? [],
        uncertain: data.uncertain ?? 0,
        annotations: data.annotations ?? [],
      });
      toast.success("Dictat corregit!");
      setShowText(true);
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
          {repetitionsLeft !== null && !result && (
            <Badge variant={outOfRepetitions ? "outline" : "secondary"}>
              {repetitionsLeft} repeticions
            </Badge>
          )}
          <Badge variant="outline">
            Frase {chunkIndex + 1} / {chunks.length}
          </Badge>
        </div>
      </div>

      {/* Un dictat s'escolta, no es llegeix: el text no es mostra si no es
          demana explícitament com a ajuda. */}
      {countdown !== null ? (
        <div
          className="flex flex-col items-center gap-2 rounded-md border-2 border-primary/40 bg-primary/5 p-6 text-center"
          role="status"
          aria-live="assertive"
        >
          <Hourglass className="size-6 text-primary" />
          <span className="text-6xl font-bold tabular-nums text-primary">{countdown}</span>
          <p className="text-sm font-medium">
            Prepara&apos;t: agafa el boli o posa les mans al teclat.
          </p>
        </div>
      ) : showText ? (
        <p className="rounded-md bg-muted/40 p-4 text-lg leading-relaxed">{chunks[chunkIndex]}</p>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-md bg-muted/40 p-6 text-center">
          <Headphones className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Escolta la frase i escriu-la. El text apareixerà quan hagis enviat el dictat.
            {playback.countdownSeconds > 0 &&
              ` Tindràs ${playback.countdownSeconds} segons per preparar-te abans de començar.`}
            {playback.forceHiddenScreen && " El teu/a docent ha demanat fer-lo només d'oïda."}
          </p>
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={speaking || countdown !== null ? handlePause : handleListen}
          disabled={!speaking && countdown === null && outOfRepetitions}
          aria-label={
            countdown !== null
              ? "Cancel·la el compte enrere"
              : speaking
                ? "Atura la lectura"
                : "Escolta la frase"
          }
        >
          {speaking || countdown !== null ? (
            <Pause className="size-5" />
          ) : (
            <Play className="size-5" />
          )}
          {countdown !== null ? "Cancel·lar" : speaking ? "Aturar" : "Escoltar"}
        </Button>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="flex items-center gap-1">
            <Button
              size="icon-sm"
              variant="outline"
              disabled={chunkIndex === 0}
              onClick={() => {
                stopCountdown();
                setChunkIndex((i) => Math.max(0, i - 1));
              }}
              aria-label="Frase anterior"
              title="Frase anterior"
            >
              <ChevronLeft />
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={handleListen}
              aria-label="Repeteix la frase"
              title="Repeteix la frase"
            >
              <RotateCcw />
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              disabled={chunkIndex === chunks.length - 1}
              onClick={() => {
                stopCountdown();
                setChunkIndex((i) => Math.min(chunks.length - 1, i + 1));
              }}
              aria-label="Frase següent"
              title="Frase següent"
            >
              <ChevronRight />
            </Button>
          </div>

          <div className="flex items-center gap-1" role="group" aria-label="Velocitat de lectura">
            {SPEED_OPTIONS.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={speed === s ? "default" : "outline"}
                onClick={() => setPlaybackSpeed(s)}
                aria-label={`Velocitat ${s}x`}
                aria-pressed={speed === s}
              >
                {s}x
              </Button>
            ))}
          </div>

          {!playback.forceHiddenScreen && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowText((v) => !v)}
              aria-pressed={showText}
            >
              {showText ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              {showText ? "Amaga el text" : "Veure el text (ajuda)"}
            </Button>
          )}
        </div>
      </div>

      {audioUrl && !audioUnavailable && (
        <audio
          ref={audioRef}
          src={audioUrl}
          // No es baixa fins que l'alumne vol escoltar: obrir la pàgina no ha
          // de descarregar la veu de tots els dictats del curs.
          preload="none"
          className="hidden"
          onPlay={() => setSpeaking(true)}
          onEnded={() => setSpeaking(false)}
          onPause={() => setSpeaking(false)}
          onError={() => {
            setAudioUnavailable(true);
            setSpeaking(false);
          }}
        />
      )}
      {(!audioUrl || audioUnavailable) && !noCatalanVoice && (
        <p className="text-center text-xs text-muted-foreground">
          Es fa servir la veu del navegador per llegir el dictat.
        </p>
      )}
      {(!audioUrl || audioUnavailable) && noCatalanVoice && (
        <p className="rounded-md border border-dashed border-amber-400/60 bg-amber-50 p-2 text-center text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Aquest dispositiu no té cap veu catalana instal·lada, així que la pronúncia pot no
          ser correcta. Comenta-ho al teu/a docent.
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
                {result.progress && (
                  <p className="mt-1 font-medium text-primary">{result.progress}</p>
                )}
              </div>
            </div>

            {photoPreview && (
              <div className="rounded-md border p-4">
                <p className="mb-1 text-sm font-medium">El teu dictat corregit</p>
                <p className="mb-3 text-xs text-muted-foreground">
                  {result.annotations.length > 0
                    ? "Les paraules subratllades s'escriuen com diu el text vermell, i el ganxo marca una paraula que hi falta." +
                      (result.uncertain > 0
                        ? " El traç discontinu és una paraula que no s'ha pogut llegir bé: no compta com a errada."
                        : "")
                    : "No s'han pogut situar les correccions sobre la foto; les tens a la taula de sota."}
                </p>
                <AnnotatedPhoto src={photoPreview} annotations={result.annotations} />
              </div>
            )}

            <div className="rounded-md border p-4">
              <p className="mb-3 text-sm font-medium">Autocorregeix el teu dictat</p>
              <div className="grid gap-4 sm:grid-cols-2">
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
