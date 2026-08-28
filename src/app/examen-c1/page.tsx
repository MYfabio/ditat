import Link from "next/link";
import type { Metadata } from "next";
import { GraduationCap, Clock, PenLine, BookOpenCheck, Mic, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/landing/site-footer";

const TITOL = "Com és l'examen del C1 de català";
const DESCRIPCIO =
  "L'estructura real de la prova del certificat de nivell de suficiència (C1) de català: " +
  "les tres àrees, quant duren, què s'hi demana i on es juga la nota l'ortografia. " +
  "Amb dades oficials i sense mites.";

export const metadata: Metadata = {
  title: TITOL,
  description: DESCRIPCIO,
  alternates: { canonical: "/examen-c1" },
  openGraph: { title: TITOL, description: DESCRIPCIO, url: "/examen-c1" },
};

/**
 * Pagina informativa sobre l'examen del C1.
 *
 * Tot el que s'hi afirma surt del model de prova oficial de la DGPL o de dades
 * publicades: l'estructura d'un examen son FETS, i els fets no tenen drets
 * d'autor. El que NO es fa es reproduir cap text, tasca ni exercici del model:
 * per aixo s'enllaça el PDF oficial en lloc de copiar-lo.
 *
 * El proposit es doble: es la cerca que fa un opositor abans de preparar-se
 * ("com es l'examen C1"), i es el lloc honest per explicar que hi pinta un
 * dictat en un examen que no en porta: l'ortografia puntua dins l'expressio
 * escrita, i el dictat es l'entrenament, no la prova.
 */
export default function ExamenC1() {
  const dadesEstructurades = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "L'examen del C1 de català porta dictat?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. La prova actual del certificat de nivell de suficiència (C1) no inclou cap dictat. Ara bé, la correcció ortogràfica es valora explícitament dins de l'expressió escrita, i l'àrea d'ús de la llengua examina les regles d'ortografia i gramàtica. El dictat és una manera d'entrenar aquestes dues coses, no una part de la prova.",
        },
      },
      {
        "@type": "Question",
        name: "Quant dura l'examen del C1?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "La part escrita dura 3 hores: unes 2 h 15 min per a les dues tasques d'expressió escrita i uns 45 minuts recomanats per a l'àrea d'ús de la llengua. La prova oral es fa a part i inclou un monòleg de 3-4 minuts preparat a partir d'un àudio i un diàleg de 4-5 minuts.",
        },
      },
      {
        "@type": "Question",
        name: "Quanta gent aprova el C1 de català?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "En la convocatòria del 2023 de la Direcció General de Política Lingüística, només un 41,3% dels presentats al C1 va obtenir l'apte. És el nivell amb més suspesos de tots els certificats de català.",
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
            Com és l&apos;examen del <span className="text-primary">C1 de català</span>
          </h1>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">
            El certificat de nivell de suficiència és el que demanen la majoria
            d&apos;oposicions a Catalunya. També és el que més gent suspèn:{" "}
            <strong className="text-foreground">
              el 2023 només el va aprovar un 41,3% dels presentats
            </strong>
            . Això és el que hi trobaràs el dia de la prova, tret del model
            d&apos;examen oficial.
          </p>

          <div className="mt-8 space-y-4">
            <section className="rounded-lg border p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <PenLine className="size-5 text-primary" />
                Àrea 1 · Comprensió lectora i expressió escrita
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-3.5" /> 2 h 15 min de les 3 h de la part escrita
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Dues tasques d&apos;escriptura a partir de documentació que t&apos;has de
                llegir: una redacció d&apos;1 hora i una segona d&apos;1 h 15 min (per
                exemple, un article d&apos;opinió de 240-260 paraules). Es valora la
                coherència, l&apos;adequació al que es demana, els recursos lèxics i
                sintàctics <strong className="text-foreground">i la correcció ortogràfica</strong>.
                Aquí és on una falta et costa punts encara que el text sigui bo.
              </p>
            </section>

            <section className="rounded-lg border p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <BookOpenCheck className="size-5 text-primary" />
                Àrea 2 · Ús de la llengua
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-3.5" /> uns 45 min recomanats
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Exercicis tancats de gramàtica, ortografia i lèxic: triar el context
                adequat, completar, transformar. És l&apos;àrea que examina directament
                les regles — accentuació, pronoms febles, b/v, dièresi — que a
                l&apos;àrea 1 se&apos;t descompten quan les falles escrivint.
              </p>
            </section>

            <section className="rounded-lg border p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Mic className="size-5 text-primary" />
                Àrea 3 · Expressió oral
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-3.5" /> es fa a part de la prova escrita
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Un monòleg de 3-4 minuts que prepares en 10 minuts a partir d&apos;un
                àudio d&apos;uns 5 minuts que sents dues vegades, i un diàleg de 4-5
                minuts amb l&apos;examinador o examinadora a partir d&apos;un material donat.
              </p>
            </section>
          </div>

          <div className="mt-8 flex items-start gap-3 rounded-lg border border-amber-400/40 bg-amber-50/50 p-4 text-sm dark:bg-amber-900/10">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-muted-foreground">
              Els pesos exactes de cada àrea i les condicions d&apos;apte poden variar
              segons la convocatòria: comprova-ho sempre a la{" "}
              <a
                href="https://llengua.gencat.cat/ca/serveis/acreditacio_coneixements/certificats_de_catala/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2"
              >
                pàgina oficial dels certificats
              </a>
              , on també hi ha el model de prova complet en PDF.
            </p>
          </div>

          <section className="mt-10">
            <h2 className="text-2xl font-bold tracking-tight">
              I el dictat, on és? No hi és — i per això serveix
            </h2>
            <div className="mt-4 space-y-4 text-muted-foreground">
              <p>
                La prova actual del C1 <strong className="text-foreground">no porta cap dictat</strong>.
                El que sí que porta és una àrea sencera d&apos;ús de la llengua i una
                correcció ortogràfica que et resta punts a cada redacció.
              </p>
              <p>
                El dictat és l&apos;entrenament d&apos;aquestes dues coses alhora: t&apos;obliga
                a escriure de pressa, sense temps de consultar res, exactament com el
                dia de l&apos;examen — i la correcció et diu quines regles falles de
                manera sistemàtica, que són les que et convé treballar abans de la
                convocatòria.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button nativeButton={false} render={<a href="/dictats-c1-c2" />}>
                Fes un dictat de nivell C1 ara
              </Button>
              <Button variant="outline" nativeButton={false} render={<a href="/examen-c2" />}>
                I l&apos;examen del C2, com és?
              </Button>
            </div>
          </section>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}
