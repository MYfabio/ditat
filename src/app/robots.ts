import type { MetadataRoute } from "next";
import { BOTS_CERCA_IA, BOTS_ENTRENAMENT } from "@/lib/bots";
import { URL_PUBLICA } from "@/lib/seo";

/**
 * Que poden mirar els cercadors.
 *
 * Les pantalles de dins queden fora explicitament. No es per amagar-les —ja
 * demanen sessio— sino perque un cercador que hi truca genera errors 401 a
 * cabassos i acaba considerant el web trencat.
 */
const PRIVAT = ["/admin", "/school", "/teacher", "/student", "/dashboard", "/compte", "/api/"];

// Els cercadors i els assistents que citen amb enllac poden entrar a les pagines
// publiques; els bots que copien el web per entrenar models no poden entrar enlloc.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVAT },
      { userAgent: BOTS_CERCA_IA, allow: "/", disallow: PRIVAT },
      { userAgent: BOTS_ENTRENAMENT, disallow: "/" },
    ],
    sitemap: `${URL_PUBLICA}/sitemap.xml`,
    host: URL_PUBLICA,
  };
}
