import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

/** Alta de centre centralitzada a aulaia.cat: el formulari es el mateix per a totes les apps. */
const ALTA_URL = "https://www.aulaia.cat/alta?app=dictats";

export function DemoCta() {
  return (
    <section id="demo" className="border-b bg-primary py-16 text-primary-foreground">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Porta dictats.cat al teu centre
        </h2>
        <p className="max-w-xl text-primary-foreground/90">
          Explica&apos;ns qui sou i us preparem l&apos;accés. Et respondrem amb els
          passos per començar aquest mateix curs.
        </p>
        <Button
          size="lg"
          variant="secondary"
          nativeButton={false}
          render={<a href={ALTA_URL} />}
        >
          Sol·licita accés per al teu centre
          <ArrowRight className="size-4" />
        </Button>
        <p className="text-sm text-primary-foreground/70">
          Prefereixes escriure&apos;ns directament?{" "}
          <a
            className="underline underline-offset-4"
            href="mailto:hola@dictats.cat?subject=Demanda%20de%20demo%20-%20dictats.cat"
          >
            hola@dictats.cat
          </a>
        </p>
      </div>
    </section>
  );
}
