"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs } from "@/components/ui/tabs";

/**
 * Pestanyes que viuen a l'URL (?tab=).
 *
 * Sense aixo, recarregar la pagina et torna a la primera pestanya i no es pot
 * enllacar cap pestanya concreta: un "mira les analitiques" per correu no te
 * on apuntar. Amb l'URL com a font de veritat, recarregar et deixa on eres i
 * cada pestanya es un enllac que es pot compartir.
 */
export function UrlTabs({
  defaultValue,
  children,
  ...props
}: React.ComponentProps<typeof Tabs> & { defaultValue: string }) {
  const router = useRouter();
  const cami = usePathname();
  const params = useSearchParams();

  const activa = params.get("tab") ?? defaultValue;

  function canvia(valor: unknown) {
    if (typeof valor !== "string") return;
    const nous = new URLSearchParams(params);
    nous.set("tab", valor);
    // replace i no push: canviar de pestanya no es "una pagina nova" i el boto
    // enrere ha de sortir de la pantalla, no desfer cada clic de pestanya.
    router.replace(`${cami}?${nous.toString()}`, { scroll: false });
  }

  return (
    <Tabs value={activa} onValueChange={canvia} {...props}>
      {children}
    </Tabs>
  );
}
