import Link from "next/link";
import { GraduationCap } from "lucide-react";

export const metadata = {
  title: "Política de privadesa | DictatsIA",
};

export default function PrivacitatPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col gap-6 px-4 py-16 sm:px-6">
      <Link href="/" className="flex items-center gap-2 font-bold">
        <GraduationCap className="size-6 text-primary" />
        DictatsIA
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Política de privadesa</h1>
      <p className="text-muted-foreground">
        DictatsIA es una plataforma educativa dissenyada perquè els centres
        escolars mantinguin el control de les dades del seu alumnat, conforme al
        Reglament General de Protecció de Dades (RGPD) i a la normativa educativa
        catalana.
      </p>
      <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          <strong className="text-foreground">Dades que tractem:</strong> nom,
          correu electrònic institucional, escola i classe assignada, dictats
          generats, fotografies de dictats manuscrits pujades per a la seva
          correcció, i resultats academics derivats d&apos;aquestes correccions.
        </p>
        <p>
          <strong className="text-foreground">Finalitat:</strong> generar
          dictats adaptats al currículum, corregir automàticament les entregues
          fotografiades de l&apos;alumnat i oferir al professorat un diagnòstic
          agregat dels errors ortogràfics més freqüents.
        </p>
        <p>
          <strong className="text-foreground">Responsable:</strong> el centre
          educatiu que contracta DictatsIA es el responsable del tractament de
          les dades del seu alumnat. DictatsIA actua com a encarregat del
          tractament, sota les instruccions del centre.
        </p>
        <p>
          <strong className="text-foreground">Conservació:</strong> les dades
          es conserven mentre el centre mantingui el servei actiu, i s&apos;
          eliminen a petició del centre o en finalitzar la relació contractual.
        </p>
        <p>
          <strong className="text-foreground">Drets:</strong> les families i
          l&apos;alumnat poden exercir els drets d&apos;accés, rectificació,
          supressió i oposició adrecant-se a la coordinació del seu centre
          educatiu.
        </p>
      </div>
    </main>
  );
}
