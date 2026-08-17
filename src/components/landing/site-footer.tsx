import Link from "next/link";
import { GraduationCap } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <GraduationCap className="size-5 text-primary" />
          DictatsIA
        </Link>
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} DictatsIA. Fet a Catalunya per a escoles catalanes.
        </p>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/privacitat" className="hover:text-foreground">
            Privadesa
          </Link>
          <Link href="/login" className="hover:text-foreground">
            Iniciar sessió
          </Link>
        </div>
      </div>
    </footer>
  );
}
