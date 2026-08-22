import { Button } from "@/components/ui/button";
import { ShieldCheck, BookOpenCheck, KeyRound } from "lucide-react";

const BADGES = [
  { icon: BookOpenCheck, label: "100% Currículum de Catalunya" },
  { icon: ShieldCheck, label: "RGPD Educatiu" },
  { icon: KeyRound, label: "Sense targeta per començar" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b bg-linear-to-b from-accent/40 to-background">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Millora la teva ortografia catalana,{" "}
            <span className="text-primary">un dictat cada dia</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            Dictats fets a la teva mida, del A1 al C2. Els escoltes, els escrius
            —al teclat o a mà i en fas una foto— i te&apos;ls corregim explicant-te
            cada falta. Els següents surten dels errors que has comès.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<a href="/login" />}
            >
              Comença gratis
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
              nativeButton={false}
              render={<a href="/dictats-c1-c2" />}
            >
              Et prepares un C1 o C2?
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {BADGES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground"
              >
                <Icon className="size-4 text-primary" />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
