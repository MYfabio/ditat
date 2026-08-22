import { DICTATS_GRATUITS_AL_MES, PREU_MENSUAL_EUR } from "@/lib/subscription";

/**
 * Dades estructurades per als cercadors.
 *
 * Es el que permet que un resultat de Google surti amb el preu i la valoracio
 * en lloc de nomes un titol i dues linies. Descriu el mateix que ja diu la
 * pagina: si algun dia divergeixen, mana el que veu la persona.
 */
export function StructuredData() {
  const dades = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://www.dictats.cat/#web",
        url: "https://www.dictats.cat/",
        name: "dictats.cat",
        inLanguage: "ca",
        description:
          "Dictats en català adaptats al teu nivell, amb correcció automàtica que explica cada falta.",
      },
      {
        "@type": "WebApplication",
        "@id": "https://www.dictats.cat/#app",
        name: "dictats.cat",
        url: "https://www.dictats.cat/",
        applicationCategory: "EducationalApplication",
        operatingSystem: "Navegador web",
        inLanguage: "ca",
        description:
          "Practica dictats en català del A1 al C2. Escolta, escriu i rep la correcció " +
          "explicada falta per falta. Els dictats següents surten dels teus propis errors.",
        offers: [
          {
            "@type": "Offer",
            name: "Pla gratuït",
            price: "0",
            priceCurrency: "EUR",
            description: `${DICTATS_GRATUITS_AL_MES} dictats al mes`,
          },
          {
            "@type": "Offer",
            name: "Il·limitat",
            price: String(PREU_MENSUAL_EUR),
            priceCurrency: "EUR",
            description: "Dictats sense límit i correcció per foto",
          },
        ],
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // El contingut el generem nosaltres, no ve de fora.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(dades) }}
    />
  );
}
