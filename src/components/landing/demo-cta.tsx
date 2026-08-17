import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export function DemoCta() {
  return (
    <section id="demo" className="border-b bg-primary py-16 text-primary-foreground">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Porta DictatsIA al teu centre
        </h2>
        <p className="max-w-xl text-primary-foreground/90">
          Escriu-nos i t&apos;ensenyarem com DictatsIA pot estalviar hores de
          correcció al teu equip docent aquest mateix curs.
        </p>
        <Button
          size="lg"
          variant="secondary"
          nativeButton={false}
          render={<a href="mailto:hola@dictatsia.cat?subject=Demana%20de%20demo%20DictatsIA" />}
        >
          <Mail className="size-4" />
          hola@dictatsia.cat
        </Button>
      </div>
    </section>
  );
}
