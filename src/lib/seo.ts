import type { Metadata } from "next";

/**
 * Adreça pública canònica. Les URL canòniques, l'og:url, el robots.txt i el
 * sitemap en depenen. És fixa (no ve de cap variable d'entorn) perquè el
 * domini tècnic de Railway no s'anunciï mai als cercadors com a adreça bona.
 */
export const URL_PUBLICA = "https://www.dictats.cat";

export const NOM_WEB = "dictats.cat";

export const DESCRIPCIO_PORTADA =
  "Practica dictats en català adaptats al teu nivell, del A1 al C2. Els escoltes, els " +
  "escrius i te'ls corregim explicant-te cada falta. Els següents surten dels teus errors. " +
  "Quatre dictats al mes gratis.";

/**
 * Metadades d'una pàgina pública: canònica, Open Graph i targeta de X/Twitter.
 *
 * Next.js substitueix (no fusiona) l'objecte openGraph del layout quan una
 * pàgina en defineix un; per això cada pàgina el rep sencer des d'aquí. El
 * layout no en posa cap, perquè les pàgines privades (panells, compte, entrar)
 * no heretin una canònica ni un og:url que apuntin a la portada.
 *
 * No hi ha imatge per compartir: de moment el web no en té cap d'adequada.
 */
export function metadadesPublica({
  titol,
  descripcio,
  cami,
  titolAbsolut = false,
}: {
  titol: string;
  descripcio: string;
  cami: string;
  titolAbsolut?: boolean;
}): Metadata {
  return {
    title: titolAbsolut ? { absolute: titol } : titol,
    description: descripcio,
    alternates: { canonical: cami },
    openGraph: {
      type: "website",
      locale: "ca_ES",
      url: cami,
      siteName: NOM_WEB,
      title: titol,
      description: descripcio,
    },
    twitter: { card: "summary", title: titol, description: descripcio },
  };
}

/** JSON-LD dins un <script> sense risc d'injecció d'HTML. */
export const jsonLdSegur = (dades: unknown) => JSON.stringify(dades).replace(/</g, "\\u003c");
