import Link from "next/link";
import type { Metadata } from "next";
import { GraduationCap, Clock, PenLine, BookOpenCheck, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/landing/site-footer";

const TITOL = "Com és l'examen del C2 de català";
const DESCRIPCIO =
  "L'estructura real de la prova del certificat de nivell superior (C2) de català: " +
  "les tres àrees amb els seus pesos (57%, 16%, 27%), què cal per ser apte i on puntua " +
  "l'ortografia. Amb dades del model oficial.";

export const metadata: Metadata = {
  title: TITOL,
  description: DESCRIPCIO,
  alternates: { canonical: "/examen-c2" },
  openGraph: { title: TITOL, description: DESCRIPCIO, url: "/examen-c2" },
};

/**
 * Pagina informativa sobre l'examen del C2, la parella de /examen-c1.
 *
 * Mateixa regla: fets del model oficial (que aqui SI que publica els pesos),
 * cap text reproduit, enllac al PDF original. El public d'aquesta pagina ha
 * crescut de cop: des del curs 2025-26 el C2 es requisit per exercir de docent
 * i els examinands s'han quadruplicat en tres anys.
 */
export default function ExamenC2() {
  const dadesEstructurades = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Com s'estructura l'examen del C2 de català i què val cada part?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Tres àrees: comprensió lectora i expressió escrita (3 hores, 57% de la nota), ús de la llengua amb gramàtica i vocabulari (45 minuts, 16%) i comprensió lectora i expressió oral (27%). Per ser apte cal un mínim del 60% a l'àrea 1 i 60 punts globals.",
        },
      },
      {
        "@type": "Question",
        name: "Qui necessita el C2 de català?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Des del curs 2025-26 és requisit per exercir de docent a Catalunya, cosa que ha quadruplicat els inscrits a la prova en tres anys. El 2024 es van emetre gairebé 4.900 certificats C2, un rècord.",
        },
      },
      {
        "@type": "Question",
        name: "L'examen del C2 porta dictat?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. Però l'àrea que més pesa (57%) és l'expressió escrita, on la correcció ortogràfica es valora en cada tasca, i l'àrea d'ús de la llengua examina gramàtica i vocabulari directament. El dictat és entrenament per a totes dues.",
        },
      },
    ],
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
        <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Com és l&apos;examen del <span className="text-primary">C2 de català</span>
          </h1>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            El certificat de nivell superior és, des del curs 2025-26,{" "}
            <strong className="text-foreground">requisit per exercir de docent</strong> a
            Catalunya — i per això els inscrits a la prova s&apos;han quadruplicat en
            tres anys. Aquesta és l&apos;estructura de la prova, amb els pesos que
            publica el model d&apos;examen oficial.
          </p>

          <div className="mt-8 space-y-4">
            <section className="rounded-lg border p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <PenLine className="size-5 text-primary" />
                  Àrea 1 · Comprensió lectora i expressió escrita
                </h2>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                  57%
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-3.5" /> 3 hores · 3 tasques
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Una tasca de transformació, una de síntesi i valoració, i una
                d&apos;argumentació. És més de la meitat de la nota, i{" "}
                <strong className="text-foreground">
                  cal treure-hi un 60% com a mínim per poder ser apte
                </strong>
                , facis el que facis a la resta. La correcció ortogràfica es valora a
                cada tasca.
              </p>
            </section>

            <section className="rounded-lg border p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <BookOpenCheck className="size-5 text-primary" />
                  Àrea 2 · Ús de la llengua
                </h2>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                  16%
                </span>
              </div>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-3.5" /> 45 minuts
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Gramàtica i vocabulari en exercicis tancats. Al nivell superior, els
                detalls que hi cauen són els que gairebé ningú no domina: dièresis,
                geminades, pronoms febles en combinacions difícils.
              </p>
            </section>

            <section className="rounded-lg border p-5">
              <div className="flex items-start justify-between gap-3">
                <h2 className="flex items-center gap-2 text-lg font-semibold">
                  <Mic className="size-5 text-primary" />
                  Àrea 3 · Comprensió lectora i expressió oral
                </h2>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
                  27%
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Un monòleg formal d&apos;uns 8 minuts que prepares en 30 minuts a partir
                d&apos;un dossier, i una interacció breu amb l&apos;examinador o examinadora.
              </p>
            </section>
          </div>

          <div className="mt-8 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="font-medium">Per ser apte:</p>
            <p className="mt-1 text-muted-foreground">
              un mínim del <strong className="text-foreground">60% a l&apos;àrea 1</strong>{" "}
              i una puntuació global de{" "}
              <strong className="text-foreground">60 punts sobre 100</strong>. Els
              detalls de cada convocatòria, sempre a la{" "}
              <a
                href="https://llengua.gencat.cat/ca/serveis/acreditacio_coneixements/certificats_de_catala/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                pàgina oficial
              </a>
              , amb el model de prova complet en PDF.
            </p>
          </div>

          <section className="mt-10">
            <h2 className="text-2xl font-bold tracking-tight">
              On es guanya (i es perd) aquest examen
            </h2>
            <div className="mt-4 space-y-4 text-muted-foreground">
              <p>
                Amb un 57% del pes i un mínim obligatori, l&apos;examen del C2 es decideix
                escrivint. I al nivell superior no et suspenen per no saber escriure:
                et suspenen per la dièresi que falta, el pronom mal col·locat, la
                geminada sense punt volat — errades petites, sistemàtiques i teves.
              </p>
              <p>
                El dictat serveix exactament per a això: fa sortir les errades que no
                saps que fas, i la correcció t&apos;explica la regla de cadascuna. Quan
                les coneixes, les pots vigilar mentre escrius el dia de la prova.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button nativeButton={false} render={<a href="/dictats-c1-c2" />}>
                Fes un dictat de nivell C2 ara
              </Button>
              <Button variant="outline" nativeButton={false} render={<a href="/examen-c1" />}>
                I l&apos;examen del C1, com és?
              </Button>
            </div>
          </section>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}
