import Link from "next/link";
import { GraduationCap, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "#funcionalitats", label: "Funcionalitats" },
  { href: "#provador", label: "Provador" },
  { href: "#preus", label: "Preus" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <GraduationCap className="size-6 text-primary" />
          dictats.cat
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
            Iniciar sessió
          </Button>
          <Button className="hidden sm:inline-flex" nativeButton={false} render={<a href="#demo" />}>
            Demana Demo
          </Button>
          {/* En mobil, la navegacio d'ancoratges desapareixia sense cap
              substitut: Preus o FAQ no es podien obrir directament. Un details
              natiu fa de menu sense cap javascript. */}
          <details className="relative md:hidden">
            <summary
              className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md border [&::-webkit-details-marker]:hidden"
              aria-label="Menú"
            >
              <Menu className="size-5" />
            </summary>
            <nav className="absolute right-0 top-12 z-50 flex w-44 flex-col rounded-md border bg-background py-1 shadow-lg">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2.5 text-sm hover:bg-muted"
                >
                  {link.label}
                </a>
              ))}
              <a href="#demo" className="border-t px-4 py-2.5 text-sm font-medium hover:bg-muted">
                Demana Demo
              </a>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
