import Link from "next/link";
import { GraduationCap } from "lucide-react";

export const metadata = {
  title: "Politica de privadesa | DictatsIA",
};

export default function PrivacitatPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-6 px-4 py-16 sm:px-6">
      <Link href="/" className="flex items-center gap-2 font-bold">
        <GraduationCap className="size-6 text-primary" />
        DictatsIA
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Politica de privadesa</h1>
      <p className="text-muted-foreground">
        DictatsIA es una plataforma educativa dissenyada perque els centres
        escolars mantinguin el control de les dades del seu alumnat, conforme al
        Reglament General de Proteccio de Dades (RGPD) i a la normativa educativa
        catalana.
      </p>
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          <strong className="text-foreground">Dades que tractem:</strong> nom,
          correu electronic institucional, escola i classe assignada, dictats
          generats, fotografies de dictats manuscrits pujades per a la seva
          correccio, i resultats academics derivats d&apos;aquestes correccions.
        </p>
        <p>
          <strong className="text-foreground">Finalitat:</strong> generar
          dictats adaptats al curriculum, corregir automaticament les entregues
          fotografiades de l&apos;alumnat i oferir al professorat un diagnostic
          agregat dels errors ortografics mes frequents.
        </p>
        <p>
          <strong className="text-foreground">Responsable:</strong> el centre
          educatiu que contracta DictatsIA es el responsable del tractament de
          les dades del seu alumnat. DictatsIA actua com a encarregat del
          tractament, sota les instruccions del centre.
        </p>
        <p>
          <strong className="text-foreground">Conservacio:</strong> les dades
          es conserven mentre el centre mantingui el servei actiu, i s&apos;
          eliminen a peticio del centre o en finalitzar la relacio contractual.
        </p>
        <p>
          <strong className="text-foreground">Drets:</strong> les families i
          l&apos;alumnat poden exercir els drets d&apos;acces, rectificacio,
          supressio i oposicio adrecant-se a la coordinacio del seu centre
          educatiu.
        </p>
      </div>
    </main>
  );
}
