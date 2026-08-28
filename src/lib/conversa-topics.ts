/**
 * El cataleg de converses guiades.
 *
 * Una conversa es curta i pautada a proposit: tres preguntes, un minut de
 * resposta com a maxim cadascuna. La sessio sencera —escoltar, respondre,
 * resultat— cap en deu minuts, que es el temps real que te un alumne. Una
 * conversa lliure i llarga seria mes cara de processar, mes dificil de
 * repassar per al docent i mes facil d'abandonar a mitges.
 *
 * Els temes son fixos i escrits aqui, no generats: aixi la locucio de cada
 * pregunta es genera UNA vegada i es reutilitza sempre (com el repas de les
 * normes), i el docent pot llegir exactament que se li preguntara a l'alumnat.
 *
 * Aquesta primera llista es provisional: qui sap que es pot preguntar a una
 * criatura de vuit anys perque parli un minut sense encallar-se es qui fa
 * classe. Es canvia aqui i llest.
 */

export type ConversaTopic = {
  id: string;
  titol: string;
  /** Tres preguntes, de mes facil a mes oberta: la primera trenca el gel. */
  preguntes: [string, string, string];
};

type Grup = "inicial" | "mitja" | "superior" | "eso" | "adults" | "domini";

/** De quin grup de temes beu cada nivell. */
export function grupPerNivell(gradeLevel: string | null | undefined): Grup {
  switch (gradeLevel) {
    case "1-primaria":
    case "2-primaria":
      return "inicial";
    case "3-primaria":
    case "4-primaria":
      return "mitja";
    case "5-primaria":
    case "6-primaria":
      return "superior";
    case "1-eso":
    case "2-eso":
    case "3-eso":
    case "4-eso":
      return "eso";
    case "C1":
    case "C2":
      return "domini";
    default:
      // A1-B2 i qualsevol cosa que no reconeguem: adult que apren.
      return "adults";
  }
}

export const CONVERSA_TOPICS: Record<Grup, ConversaTopic[]> = {
  inicial: [
    {
      id: "ini-familia",
      titol: "La meva família",
      preguntes: [
        "Amb qui vius a casa teva?",
        "Què fas amb la teva família els caps de setmana?",
        "Quina és la cosa que més t'agrada fer amb algú de casa?",
      ],
    },
    {
      id: "ini-escola",
      titol: "L'escola",
      preguntes: [
        "Com es diu la teva escola i la teva classe?",
        "Què has fet avui a l'escola?",
        "Què és el que més t'agrada de l'escola? I per què?",
      ],
    },
    {
      id: "ini-animals",
      titol: "Els animals",
      preguntes: [
        "Tens cap animal a casa? Com és?",
        "Quin és el teu animal preferit?",
        "Si poguessis tenir qualsevol animal, quin triaries i per què?",
      ],
    },
  ],
  mitja: [
    {
      id: "mit-amics",
      titol: "Els amics",
      preguntes: [
        "Com es diuen els teus millors amics o amigues?",
        "A què jugueu quan sortiu al pati?",
        "Explica'm una cosa divertida que hàgiu fet junts.",
      ],
    },
    {
      id: "mit-temps-lliure",
      titol: "El temps lliure",
      preguntes: [
        "Què fas quan surts de l'escola?",
        "Fas cap esport o activitat? Explica-me-la.",
        "Si demà no hi hagués escola, què faries tot el dia?",
      ],
    },
    {
      id: "mit-menjar",
      titol: "El menjar",
      preguntes: [
        "Quin és el teu plat preferit?",
        "Què vas sopar ahir?",
        "Si haguessis de cuinar per a la teva família, què faries?",
      ],
    },
  ],
  superior: [
    {
      id: "sup-viatge",
      titol: "Un viatge",
      preguntes: [
        "Quin és el lloc més bonic on has estat?",
        "Explica'm què hi vas fer i amb qui hi vas anar.",
        "Si poguessis viatjar a qualsevol lloc del món, on aniries i per què?",
      ],
    },
    {
      id: "sup-pantalles",
      titol: "Pantalles i jocs",
      preguntes: [
        "Quins jocs o aplicacions fas servir més?",
        "Quanta estona hi passes cada dia? Et sembla bé?",
        "Què creus que passaria si una setmana no hi hagués pantalles?",
      ],
    },
    {
      id: "sup-futur",
      titol: "Quan sigui gran",
      preguntes: [
        "Què t'agradaria fer quan siguis gran?",
        "Per què t'agrada aquesta feina o activitat?",
        "Què creus que has de fer per aconseguir-ho?",
      ],
    },
  ],
  eso: [
    {
      id: "eso-musica",
      titol: "Música i sèries",
      preguntes: [
        "Quina música escoltes últimament?",
        "Recomana'm una sèrie o pel·lícula i digues per què val la pena.",
        "Creus que la música que escoltem diu com som? Per què?",
      ],
    },
    {
      id: "eso-xarxes",
      titol: "Xarxes socials",
      preguntes: [
        "Quines xarxes fas servir i per a què?",
        "Què és el millor i el pitjor de les xarxes socials?",
        "Creus que hi hauria d'haver una edat mínima? Defensa la teva resposta.",
      ],
    },
    {
      id: "eso-canvi",
      titol: "Una cosa que canviaries",
      preguntes: [
        "Què canviaries del teu institut si poguessis?",
        "Per què creus que això milloraria les coses?",
        "Com convenceries la direcció perquè t'escoltés?",
      ],
    },
  ],
  adults: [
    {
      id: "adu-dia",
      titol: "El dia a dia",
      preguntes: [
        "Com és un dia normal per a tu, de bon matí fins al vespre?",
        "Què fas per desconnectar quan acabes la feina o els estudis?",
        "Què canviaries de la teva rutina si poguessis?",
      ],
    },
    {
      id: "adu-catala",
      titol: "El català i tu",
      preguntes: [
        "On i quan fas servir el català en el teu dia a dia?",
        "Què és el que et costa més de la llengua?",
        "Per què has decidit aprendre'l o millorar-lo?",
      ],
    },
    {
      id: "adu-lloc",
      titol: "El lloc on vius",
      preguntes: [
        "Com és el barri o el poble on vius?",
        "Què hi recomanaries a algú que hi ve per primer cop?",
        "Què hi trobes a faltar?",
      ],
    },
  ],
  domini: [
    {
      id: "dom-teletreball",
      titol: "Teletreball i presencialitat",
      preguntes: [
        "Quins avantatges i inconvenients hi veus, al teletreball?",
        "Creus que les administracions haurien de poder exigir presencialitat? Argumenta-ho.",
        "Com creus que serà la feina d'aquí a vint anys?",
      ],
    },
    {
      id: "dom-llengua",
      titol: "El futur del català",
      preguntes: [
        "Com veus la salut del català entre la gent jove?",
        "Quines mesures creus que funcionarien de debò per reforçar-lo?",
        "Hi ha qui diu que les llengües no es poden imposar. Què hi respondries?",
      ],
    },
    {
      id: "dom-ia",
      titol: "Intel·ligència artificial",
      preguntes: [
        "En què fas servir o has vist fer servir la intel·ligència artificial?",
        "Quins riscos et preocupen més? Per què?",
        "Creus que hauria d'estar més regulada? Argumenta la teva posició.",
      ],
    },
  ],
};

/**
 * Tria el tema que toca: el que fa mes temps que no s'ha fet.
 *
 * Sense atzar: amb atzar, dos dies seguits poden repetir tema i sembla que
 * l'aplicacio no te res mes a dir.
 */
export function triaTopic(gradeLevel: string | null | undefined, jaFets: string[]): ConversaTopic {
  const grup = CONVERSA_TOPICS[grupPerNivell(gradeLevel)];
  const noFets = grup.filter((t) => !jaFets.includes(t.id));
  if (noFets.length > 0) return noFets[0];
  // Tots fets: es torna a comencar pel que fa mes temps (el primer de la
  // llista de fets es el mes antic, perque la consulta ve ordenada).
  const mesAntic = jaFets.find((id) => grup.some((t) => t.id === id));
  return grup.find((t) => t.id === mesAntic) ?? grup[0];
}

/** Busca un tema per id, vingui del grup que vingui. */
export function topicPerId(id: string): ConversaTopic | null {
  for (const grup of Object.values(CONVERSA_TOPICS)) {
    const t = grup.find((x) => x.id === id);
    if (t) return t;
  }
  return null;
}
