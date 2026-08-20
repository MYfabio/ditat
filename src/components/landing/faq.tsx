import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    question: "Les dades de l'alumnat estan protegides segons el RGPD?",
    answer:
      "Sí. dictats.cat es dissenya seguint els principis del RGPD educatiu: minimització de dades, control per part del centre i cap ús de dades de l'alumnat per entrenar models d'IA de tercers.",
  },
  {
    question: "Com funciona la correcció per foto?",
    answer:
      "L'alumnat fotografia el dictat fet a mà amb el mòbil o una tauleta. El sistema fa servir OCR per transcriure el text i després una IA el compara amb el text original per detectar errors ortogràfics i generar una explicació pedagògica.",
  },
  {
    question: "Es pot fer servir sense compte de Google o Microsoft?",
    answer:
      "Si el centre no fa servir Google Workspace ni Microsoft 365, es pot configurar un altre mètode d'accés. Contacta'ns per estudiar el cas del teu centre.",
  },
  {
    question: "Quines adaptacions NEE inclou la plataforma?",
    answer:
      "Tipografia OpenDyslexic, mode d'alt contrast, lectura de l'àudio amb control de velocitat i fragmentació del text en blocs curts per facilitar el ritme de lectura a l'alumnat amb TDAH.",
  },
  {
    question: "Puc provar-ho abans de contractar-ho per a tot el centre?",
    answer:
      "Sí, el Pla Aula està pensat perquè un sol docent el provi amb la seva classe abans d'ampliar-ho a tot el centre amb el Pla Escola.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Preguntes freqüents
          </h2>
        </div>
        <Accordion className="w-full">
          {FAQS.map((faq, i) => (
            <AccordionItem key={faq.question} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
