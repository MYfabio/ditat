import Link from "next/link";
import { GraduationCap } from "lucide-react";
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
          DictatsIA
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
            Iniciar sessio
          </Button>
          <Button nativeButton={false} render={<a href="#demo" />}>
            Demana Demo
          </Button>
        </div>
      </div>
    </header>
  );
}
