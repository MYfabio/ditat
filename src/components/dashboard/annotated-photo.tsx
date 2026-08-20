"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import type { Annotation } from "@/lib/annotations";

/**
 * La foto del dictat amb les correccions dibuixades a sobre, com si el mestre
 * hi hagués passat el bolígraf vermell.
 *
 * El `viewBox` del SVG pren la proporció real de la foto i les coordenades
 * relatives de l'OCR s'hi escalen: si es deixés quadrat i s'estirés per
 * encaixar-hi, la lletra de les correccions sortiria aixafada.
 */
export function AnnotatedPhoto({
  src,
  annotations,
  alt = "Foto del dictat amb les correccions",
}: {
  src: string;
  annotations: Annotation[];
  alt?: string;
}) {
  const [showMarks, setShowMarks] = useState(true);
  // Proporció de la foto (amplada / alçada). Es descobreix quan carrega; fins
  // llavors no es dibuixa res, per no col·locar cap marca fora de lloc.
  const [aspect, setAspect] = useState<number | null>(null);
  // Les fotos velles s'esborren un cop corregides (prune-submission-photos):
  // quan ja no hi es, val mes dir-ho que deixar-hi una imatge trencada.
  const [missing, setMissing] = useState(false);

  // Les coordenades de l'OCR van de 0 a 1 en tots dos eixos; aquí l'eix
  // horitzontal passa a mesurar-se en alçades de foto, com el viewBox.
  const scaled = aspect
    ? annotations.map((a) => ({ ...a, x: a.x * aspect, width: a.width * aspect }))
    : [];

  if (missing) {
    return (
      <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        La foto d&apos;aquest dictat ja s&apos;ha esborrat. La correcció es conserva sencera
        més avall.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-md border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="block h-auto w-full"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalHeight > 0) setAspect(img.naturalWidth / img.naturalHeight);
          }}
          onError={() => setMissing(true)}
        />
        {showMarks && scaled.length > 0 && aspect && (
          <svg
            viewBox={`0 0 ${aspect} 1`}
            className="pointer-events-none absolute inset-0 size-full"
            aria-hidden="true"
          >
            {scaled.map((mark, i) => (
              <AnnotationMark key={i} mark={mark} />
            ))}
          </svg>
        )}
      </div>

      {annotations.length > 0 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {annotations.length} marca(es) sobre la teva lletra.
          </p>
          <Button variant="ghost" size="sm" onClick={() => setShowMarks((v) => !v)}>
            {showMarks ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {showMarks ? "Amaga les marques" : "Mostra les marques"}
          </Button>
        </div>
      )}
    </div>
  );
}

// Vermell fix i no un color del tema: la marca ha de llegir-se sobre el paper
// de la foto, que no canvia amb el mode clar o fosc de l'aplicació.
const INK = "#dc2626";

function AnnotationMark({ mark }: { mark: Annotation }) {
  // El gruix i la lletra es mesuren amb l'alçada de la paraula, perquè les
  // marques creixin igual que la cal·ligrafia de la foto.
  const stroke = Math.max(mark.height * 0.08, 0.002);
  const fontSize = Math.max(mark.height * 0.75, 0.012);
  const baseline = mark.y + mark.height;

  if (mark.kind === "insert") {
    // Ganxo d'intercalació: la punta assenyala el forat entre dues paraules.
    const tip = mark.x;
    const wing = Math.max(mark.width * 0.25, 0.008);
    return (
      <g>
        <path
          d={`M ${tip - wing} ${baseline} L ${tip} ${baseline - mark.height * 0.55} L ${tip + wing} ${baseline}`}
          fill="none"
          stroke={INK}
          strokeWidth={stroke}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <Label text={mark.label} x={tip} y={mark.y - mark.height * 0.2} size={fontSize} />
      </g>
    );
  }

  if (mark.kind === "review") {
    // Traç discontinu, que es llegeix com un dubte i no com una correcció.
    return (
      <g>
        <line
          x1={mark.x}
          y1={baseline + mark.height * 0.08}
          x2={mark.x + mark.width}
          y2={baseline + mark.height * 0.08}
          stroke={INK}
          strokeWidth={stroke}
          strokeDasharray={`${mark.height * 0.12} ${mark.height * 0.12}`}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <Label
          text="?"
          x={mark.x + mark.width / 2}
          y={mark.y - mark.height * 0.15}
          size={fontSize}
        />
      </g>
    );
  }

  if (mark.kind === "accent") {
    // Titlla dibuixada just damunt de la vocal que li toca.
    const centre = mark.x + mark.width / 2;
    const top = mark.y - mark.height * 0.1;
    return (
      <g>
        <line
          x1={centre - mark.width * 0.35}
          y1={top}
          x2={centre + mark.width * 0.35}
          y2={top - mark.height * 0.25}
          stroke={INK}
          strokeWidth={stroke}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <Label text={mark.label} x={centre} y={top - mark.height * 0.45} size={fontSize} />
      </g>
    );
  }

  return (
    <g>
      <line
        x1={mark.x}
        y1={baseline + mark.height * 0.08}
        x2={mark.x + mark.width}
        y2={baseline + mark.height * 0.08}
        stroke={INK}
        strokeWidth={stroke}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
      <Label
        text={mark.label}
        x={mark.x + mark.width / 2}
        y={mark.y - mark.height * 0.15}
        size={fontSize}
      />
    </g>
  );
}

/**
 * La forma correcta escrita a sobre. Va dins d'un `<text>` amb contorn blanc
 * perquè es llegeixi encara que caigui damunt d'una línia escrita.
 */
function Label({ text, x, y, size }: { text: string; x: number; y: number; size: number }) {
  return (
    <text
      x={x}
      y={Math.max(y, size)}
      fill={INK}
      fontSize={size}
      fontWeight="600"
      textAnchor="middle"
      stroke="white"
      strokeWidth={size * 0.18}
      paintOrder="stroke"
      style={{ fontFamily: "system-ui, sans-serif" }}
    >
      {text}
    </text>
  );
}
