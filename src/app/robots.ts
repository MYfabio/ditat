import type { MetadataRoute } from "next";

/**
 * Que poden mirar els cercadors.
 *
 * Les pantalles de dins queden fora explicitament. No es per amagar-les —ja
 * demanen sessio— sino perque un cercador que hi truca genera errors 401 a
 * cabassos i acaba considerant el web trencat.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/school", "/teacher", "/student", "/dashboard", "/api/"],
    },
    sitemap: "https://www.dictats.cat/sitemap.xml",
    host: "https://www.dictats.cat",
  };
}
