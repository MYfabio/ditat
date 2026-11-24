import { DICTATS_GRATUITS_AL_MES } from "@/lib/subscription";
import { URL_PUBLICA, jsonLdSegur } from "@/lib/seo";
import { FAQS } from "@/components/landing/faq";

/**
 * Dades estructurades per als cercadors.
 *
 * Es el que permet que un resultat de Google surti amb el preu i la valoracio
 * en lloc de nomes un titol i dues linies. Descriu el mateix que ja diu la
 * pagina: si algun dia divergeixen, mana el que veu la persona. Les preguntes
 * frequents surten de la mateixa llista que es veu a la portada.
 */
export function StructuredData() {
  const dades = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${URL_PUBLICA}/#web`,
        url: `${URL_PUBLICA}/`,
        name: "dictats.cat",
        inLanguage: "ca",
        description:
          "Dictats en català adaptats al teu nivell, amb correcció automàtica que explica cada falta.",
        publisher: { "@id": "https://www.aulaia.cat/#organitzacio" },
      },
      {
        "@type": "WebApplication",
        "@id": `${URL_PUBLICA}/#app`,
        name: "dictats.cat",
        url: `${URL_PUBLICA}/`,
        applicationCategory: "EducationalApplication",
        operatingSystem: "Web",
        inLanguage: "ca",
        description:
          "Practica dictats en català del A1 al C2. Escolta, escriu i rep la correcció " +
          "explicada falta per falta. Els dictats següents surten dels teus propis errors.",
        // El que diu la portada: nivells A1-C2 i docents de Primària, ESO, acollida i adults.
        educationalLevel: ["A1", "A2", "B1", "B2", "C1", "C2", "Educació Primària", "ESO", "Educació d'adults"],
        audience: { "@type": "EducationalAudience", educationalRole: "teacher" },
        // Sense isAccessibleForFree: hi ha pla gratuït, però amb límit mensual i un pla de
        // pagament per a qui en vulgui més (vegeu /dictats-c1-c2). L'oferta gratuïta ja va a offers.
        provider: {
          "@type": "Organization",
          "@id": "https://www.aulaia.cat/#organitzacio",
          name: "aulaia.cat",
          url: "https://www.aulaia.cat/",
        },
        offers: [
          {
            "@type": "Offer",
            name: "Pla gratuït",
            price: "0",
            priceCurrency: "EUR",
            description: `${DICTATS_GRATUITS_AL_MES} dictats al mes`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${URL_PUBLICA}/#faq`,
        inLanguage: "ca",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      // El contingut el generem nosaltres, no ve de fora.
      dangerouslySetInnerHTML={{ __html: jsonLdSegur(dades) }}
    />
  );
}
