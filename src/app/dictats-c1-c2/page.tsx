import Link from "next/link";
import type { Metadata } from "next";
import { GraduationCap, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/landing/site-footer";
import { SampleDictation } from "./sample";
import { DICTATS_GRATUITS_AL_MES, PREU_MENSUAL_EUR } from "@/lib/subscription";

const TITOL = "Dictats de nivell C1 i C2 en català";
const DESCRIPCIO =
  "Practica dictats de nivell C1 i C2 en català per preparar el certificat de suficiència " +
  "o de superior. Fes-ne un ara mateix sense registrar-te: l'escoltes, l'escrius i et diem " +
  "cada falta i per què.";

export const metadata: Metadata = {
  title: TITOL,
  description: DESCRIPCIO,
  alternates: { canonical: "/dictats-c1-c2" },
  openGraph: { title: TITOL, description: DESCRIPCIO, url: "/dictats-c1-c2" },
};

/**
 * Pagina d'entrada per a qui es prepara un certificat.
 *
 * Qui cerca "dictats en català" pot ser qualsevol; qui cerca "dictat C1" te un
 * examen amb data. Es poca gent, pero es qui te un motiu real per practicar
 * cada dia, i gairebe ningu li parla.
 *
 * Aqui no es promet material d'examen ni cap relacio amb qui els convoca: es
 * prometen dictats de practica del nivell, que es el que fem de debo.
 */
export default function DictatsC1C2() {
  const dadesEstructurades = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    name: TITOL,
    description: DESCRIPCIO,
    url: "https://www.dictats.cat/dictats-c1-c2",
    learningResourceType: "Exercici de dictat",
    educationalLevel: "C1-C2 (MECR)",
    inLanguage: "ca",
    isAccessibleForFree: true,
    teaches: "Ortografia catalana de nivell superior",
    provider: {
      "@type": "Organization",
      name: "dictats.cat",
      url: "https://www.dictats.cat",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(dadesEstructurades) }}
      />

      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <GraduationCap className="size-6 text-primary" />
            dictats.cat
          </Link>
          <Button variant="outline" size="sm" nativeButton={false} render={<a href="/login" />}>
            Entrar
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="border-b bg-linear-to-b from-accent/40 to-background">
          <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 md:py-20">
            <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
              Dictats de nivell <span className="text-primary">C1 i C2</span> en català
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
              Prepara el certificat de suficiència o el de superior practicant el que més
              puntua i més costa: escriure sense faltes. Fes un dictat ara mateix, sense
              registrar-te.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <SampleDictation nivell="C1" />
        </section>

        <section className="border-y bg-muted/30">
          <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
            <h2 className="text-2xl font-bold tracking-tight">
              Per què practicar amb dictats i no amb tests
            </h2>
            <div className="mt-6 space-y-4 text-muted-foreground">
              <p>
                En un test de resposta múltiple pots encertar per descart. En un dictat, o
                escrius <em>haver-hi</em> bé o no. Per això és el que millor mesura on ets
                de veritat.
              </p>
              <p>
                El problema de practicar sol és que corregir-te a tu mateix comparant dos
                textos cansa i se t&apos;escapen precisament les faltes que no saps que fas.
                Aquí la correcció és automàtica i t&apos;explica <strong>per què</strong> una
                paraula va d&apos;una manera i no d&apos;una altra.
              </p>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {[
                "Textos de la llargada i el registre d'un C1 o C2",
                "Correcció que explica cada falta, no només la marca",
                "Els següents insisteixen en el que has fallat",
                "També pots escriure a mà i fer-ne una foto",
                `${DICTATS_GRATUITS_AL_MES} dictats al mes gratis`,
                "Veu catalana per escoltar-los",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">
            Comença gratis, paga només si t&apos;ajuda
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            {DICTATS_GRATUITS_AL_MES} dictats al mes sense pagar res. Si en vols sense
            límit, {PREU_MENSUAL_EUR} € al mes i pots donar-te de baixa quan vulguis.
          </p>
          <Button size="lg" className="mt-6" nativeButton={false} render={<a href="/login" />}>
            Crear el compte gratis
          </Button>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
