"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Volume2, Loader2, MessageCircle, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const SEGONS_MAXIM = 60;

type Resultat = {
  puntuacio: number;
  resum: string;
  millores: { que: string; exemple: string }[];
  transcripcions: string[];
  restants: number | null;
};

/**
 * La conversa guiada: la IA pregunta amb veu, tu respons parlant.
 *
 * Tres preguntes, un minut de resposta com a màxim cadascuna. És curta a
 * proposta: la sessió sencera cap en deu minuts, i una conversa pautada és més
 * fàcil de començar (i d'acabar) que una xerrada oberta.
 *
 * La gravació de la teva veu s'analitza i es descarta: no es desa mai. El que
 * queda és la transcripció i la valoració.
 */
export function ConversaGuiada({
  topicId,
  titol,
  preguntes,
  fetesAquestMes,
  limitMensual,
}: {
  topicId: string;
  titol: string;
  preguntes: string[];
  fetesAquestMes: number;
  limitMensual: number | null;
}) {
  const [fase, setFase] = useState<"tancada" | "activa" | "enviant" | "resultat">("tancada");
  const [pregunta, setPregunta] = useState(0);
  const [gravant, setGravant] = useState(false);
  const [segons, setSegons] = useState(0);
  const [sonant, setSonant] = useState(false);
  const [resultat, setResultat] = useState<Resultat | null>(null);

  const recorder = useRef<MediaRecorder | null>(null);
  const trossos = useRef<Blob[]>([]);
  const respostes = useRef<Blob[]>([]);
  const rellotge = useRef<ReturnType<typeof setInterval> | null>(null);

  // El microfon es tanca sempre en sortir: deixar-lo obert es deixar el
  // llum vermell del navegador encès sense motiu.
  useEffect(() => {
    return () => {
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
      if (rellotge.current) clearInterval(rellotge.current);
    };
  }, []);

  const potFer = limitMensual === null || fetesAquestMes < limitMensual;

  async function escoltaPregunta(index: number) {
    setSonant(true);
    try {
      const r = await fetch(
        `/api/conversa/audio?topic=${encodeURIComponent(topicId)}&q=${index}`
      );
      if (r.ok && r.status !== 204) {
        const so = new Audio(URL.createObjectURL(await r.blob()));
        so.onended = () => setSonant(false);
        await so.play();
        return;
      }
    } catch {
      // veu del navegador com a xarxa de seguretat
    }
    if (window.speechSynthesis) {
      const frase = new SpeechSynthesisUtterance(preguntes[index]);
      frase.lang = "ca-ES";
      frase.onend = () => setSonant(false);
      window.speechSynthesis.speak(frase);
    } else {
      setSonant(false);
    }
  }

  async function comenca() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      recorder.current = new MediaRecorder(stream, { mimeType: mime });
      respostes.current = [];
      setPregunta(0);
      setResultat(null);
      setFase("activa");
      void escoltaPregunta(0);
    } catch {
      toast.error("Cal permetre el micròfon per poder conversar.");
    }
  }

  function comencaGravacio() {
    const r = recorder.current;
    if (!r || gravant) return;
    trossos.current = [];
    r.ondataavailable = (e) => e.data.size > 0 && trossos.current.push(e.data);
    r.onstop = () => {
      respostes.current[pregunta] = new Blob(trossos.current, { type: r.mimeType });
      seguent();
    };
    r.start();
    setGravant(true);
    setSegons(0);
    rellotge.current = setInterval(() => {
      setSegons((s) => {
        if (s + 1 >= SEGONS_MAXIM) atura();
        return s + 1;
      });
    }, 1000);
  }

  function atura() {
    if (rellotge.current) clearInterval(rellotge.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
    setGravant(false);
  }

  function seguent() {
    if (pregunta + 1 < preguntes.length) {
      const nova = pregunta + 1;
      setPregunta(nova);
      void escoltaPregunta(nova);
    } else {
      void envia();
    }
  }

  async function envia() {
    setFase("enviant");
    recorder.current?.stream.getTracks().forEach((t) => t.stop());
    try {
      const form = new FormData();
      form.set("topicId", topicId);
      respostes.current.forEach((blob, i) =>
        form.set(`resposta${i}`, new File([blob], `resposta${i}.webm`, { type: blob.type }))
      );
      const r = await fetch("/api/conversa", { method: "POST", body: form });
      const dades = await r.json();
      if (!r.ok) throw new Error(dades.error ?? "No s'ha pogut analitzar.");
      setResultat(dades);
      setFase("resultat");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No s'ha pogut enviar la conversa.");
      setFase("tancada");
    }
  }

  if (fase === "tancada") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageCircle className="size-5 text-primary" />
            Conversa: {titol}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Tres preguntes amb veu, i tu respons parlant — un minut per resposta com a
            màxim. Quan acabis, t&apos;escoltem i et diem què has fet bé i què pots
            millorar. La teva veu no es desa: només la transcripció.
          </p>
          {potFer ? (
            <Button onClick={comenca}>
              <Mic className="mr-2 size-4" />
              Començar la conversa
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Ja has fet totes les converses d&apos;aquest mes. El mes que ve en tindràs
              més.
            </p>
          )}
          {limitMensual !== null && potFer && (
            <p className="text-xs text-muted-foreground">
              {limitMensual - fetesAquestMes} de {limitMensual} converses disponibles
              aquest mes.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  if (fase === "enviant") {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-8">
          <Loader2 className="size-5 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            T&apos;estem escoltant amb atenció… uns segons.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (fase === "resultat" && resultat) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Com ha anat la conversa</span>
            <Badge variant={resultat.puntuacio >= 70 ? "default" : "secondary"}>
              {resultat.puntuacio}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{resultat.resum}</p>

          {resultat.millores.length > 0 && (
            <ul className="space-y-2">
              {resultat.millores.map((m, i) => (
                <li key={i} className="rounded-md border px-3 py-2 text-sm">
                  <p className="font-medium">{m.que}</p>
                  {m.exemple && (
                    <p className="mt-0.5 text-muted-foreground">
                      Per exemple: <em>{m.exemple}</em>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <details className="rounded-md border">
            <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm font-medium">
              El que has dit, per escrit
              <ChevronDown className="size-4 text-muted-foreground" />
            </summary>
            <div className="space-y-3 border-t p-3 text-sm">
              {preguntes.map((p, i) => (
                <div key={i}>
                  <p className="text-xs font-medium text-muted-foreground">{p}</p>
                  <p className="mt-1">{resultat.transcripcions[i] ?? "—"}</p>
                </div>
              ))}
            </div>
          </details>

          {resultat.restants !== null && (
            <p className="text-xs text-muted-foreground">
              Et queden {resultat.restants} converses aquest mes.
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // fase activa: una pregunta a la vegada, res mes a la pantalla
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Pregunta {pregunta + 1} de {preguntes.length}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-lg font-medium leading-relaxed">{preguntes[pregunta]}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => escoltaPregunta(pregunta)}
            disabled={sonant}
            aria-label="Torna a escoltar la pregunta"
          >
            {sonant ? <Loader2 className="size-4 animate-spin" /> : <Volume2 className="size-4" />}
          </Button>
        </div>

        {gravant ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="relative flex size-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60" />
                <span className="relative inline-flex size-3 rounded-full bg-red-500" />
              </span>
              <span className="text-sm font-medium tabular-nums">
                {segons}s / {SEGONS_MAXIM}s
              </span>
            </div>
            <Button variant="destructive" size="lg" className="w-full" onClick={atura}>
              <Square className="mr-2 size-4" />
              Ja he acabat de respondre
            </Button>
          </div>
        ) : (
          <Button size="lg" className="w-full" onClick={comencaGravacio}>
            <Mic className="mr-2 size-4" />
            Respondre parlant
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
