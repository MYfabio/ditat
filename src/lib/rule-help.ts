/**
 * Que cal saber abans de cada dictat, regla per regla.
 *
 * Aixo NO ho genera la IA, i es a proposit. Les normes ortografiques no
 * canvien mai: generar-les cada cop seria pagar sempre pel mateix i, sobretot,
 * un model que s'inventa una norma l'hi esta ensenyant malament a una criatura
 * i no ho sabria ningu. Escrites aqui son instantanies, no costen res i un
 * docent les pot repassar i corregir.
 *
 * La IA te sentit per al text del dictat, que ha de ser diferent cada vegada.
 * Per a la norma, no.
 *
 * Per aprofundir-hi: https://llengua.gencat.cat/ca/serveis/aprendre_catala/
 */

export type AjudaRegla = {
  /** La norma, en dues o tres frases i sense terminologia innecessaria. */
  norma: string;
  /**
   * La mateixa norma reduida a l'os, per a qui te adaptacions.
   *
   * No es la versio "facil" per a qui li costa: es la versio que es pot llegir
   * d'una tirada. Amb dislexia, el problema es justament llegir un bloc dens
   * de text sobre ortografia; amb TDAH, sostenir l'atencio fins al final. Un
   * paragraf de tres frases no s'arriba a llegir, i llavors l'ajuda no ajuda.
   */
  normaCurta: string;
  /** Exemples curts: es recorden molt millor que la regla. */
  exemples: string[];
  /** El parany tipic, que es on es perden gairebe totes les faltes. */
  parany?: string;
  /**
   * La mateixa norma per a primaria: sense metallenguatge i amb exemples que
   * es puguin veure.
   *
   * A una criatura de set anys, "so sord" o "vocal atona" no li diuen res: es
   * una explicacio que li demana aprendre dues coses en lloc d'una. I a un
   * opositor de C1 li passa el contrari, que la norma basica ja la sap i el
   * que necessita son les excepcions, que son al camp "parany".
   */
  primaria?: { norma: string; exemples: string[] };
};

export const AJUDES_PER_REGLA: Record<string, AjudaRegla> = {
  "c-qu-g-gu": {
    norma:
      "Per al so de /k/ escrivim c davant de a, o, u, i qu davant de e, i. Per al so de /g/, g davant de a, o, u, i gu davant de e, i.",
    normaCurta:
      "Davant de e, i: qu i gu. Davant de a, o, u: c i g.",
    exemples: ["casa, cosa, cul", "queixa, quilo", "gat, got, gust", "guerra, guitarra"],
    parany: "La u de qu i gu no sona: quilo es diu «kilo», no «kuilo».",
    primaria: {
      norma:
        "Davant de la e i de la i, la c es torna qu i la g es torna gu. Davant de la a, la o i la u, es queden com son.",
      exemples: ["casa → queixa", "gat → guerra"],
    }
  },
  "h-muda": {
    norma:
      "La h no sona mai, però s'escriu. La duen algunes paraules al principi i unes quantes al mig, i no hi ha cap so que t'avisi: s'aprenen d'una en una.",
    normaCurta:
      "La h no sona, pero s'escriu. S'apren paraula per paraula.",
    exemples: ["home, hivern, hora, humit", "ahir, prohibir", "sense h: os, ou, avui, arbre"],
    parany:
      "Haver sempre du h (he, has, ha, hem, heu, han). A veure (de mirar) no en du cap.",
    primaria: {
      norma:
        "La h no es sent gens, pero hi ha paraules que la porten. No hi ha cap truc: t'has de fixar quan les llegeixes.",
      exemples: ["home, hora, hivern", "os, ou, avui (sense h)"],
    }
  },
  "j-g": {
    norma:
      "Per al so de la j escrivim j davant de a, o, u, i g davant de e, i.",
    normaCurta:
      "Davant de e, i: g. Davant de a, o, u: j.",
    exemples: ["jardí, jove, jutge", "gent, girar, gener"],
    parany:
      "Unes quantes paraules porten j davant de e contra la regla: jersei, jeroglífic, majestat, injecció.",
    primaria: {
      norma:
        "Davant de la e i de la i escrivim g. Davant de la a, la o i la u escrivim j.",
      exemples: ["gent, girar", "jardí, jove, jugar"],
    }
  },
  "s-ss-c-z": {
    norma:
      "So sord (com a «sal»): s al principi o darrere de consonant, ss entre vocals, c davant de e, i, i ç davant de a, o, u. So sonor (com a «casa»): s entre vocals, z al principi o darrere de consonant.",
    normaCurta:
      "Entre vocals: una s sona suau, dues sonen fortes.",
    exemples: ["sal, pensar, passar", "cel, cinc, caça", "casa, camisa", "zona, onze"],
    parany:
      "Entre vocals, una sola s sona sonora i dues sones sordes: «casa» i «cassa» no són la mateixa paraula.",
    primaria: {
      norma:
        "Entre dues vocals, una sola s sona fluixeta i dues s sonen fortes.",
      exemples: ["casa (fluixeta)", "passar (forta)"],
    }
  },
  "b-v": {
    norma:
      "S'escriu b davant de l i de r, i darrere de m. S'escriu v darrere de n. Les terminacions de l'imperfet dels verbs de la primera conjugació van amb v: -ava, -aves, -avem.",
    normaCurta:
      "b davant de l i r. v darrere de n. Els verbs acabats en -ava sempre amb v.",
    exemples: ["blanc, brau, ambient", "canvi, envestir", "cantava, jugaves, miràvem"],
    parany:
      "Si dubtes, busca una paraula de la mateixa família on se senti: llobató t'indica que és llop, i «bevia» ve de beure.",
    primaria: {
      norma:
        "Sempre b davant de la l i de la r. I els verbs que acaben en -ava sempre van amb v.",
      exemples: ["blanc, brau", "cantava, jugava"],
    }
  },
  "x-ix": {
    norma:
      "El so de x s'escriu x al principi de paraula i darrere de consonant, i ix darrere de a, e, o, u. El so de tx s'escriu tx entre vocals i al final de paraula.",
    normaCurta:
      "Darrere de a, e, o, u: ix. Al principi: x.",
    exemples: ["xarxa, xocolata, panxa", "caixa, peix, disbauxa", "cotxe, despatx"],
    parany: "A «caixa» la i no és una vocal a part: només marca el so de la x.",
    primaria: {
      norma:
        "Darrere de la a, la e, la o i la u escrivim ix. Al comencament de paraula, x tota sola.",
      exemples: ["caixa, peix", "xarxa, xocolata"],
    }
  },
  "l-l": {
    norma:
      "La ela geminada són dues eles amb un punt volat al mig. Es pronuncia una mica més llarga i apareix sobretot en paraules cultes.",
    normaCurta:
      "Son dues eles amb un punt al mig: col·legi.",
    exemples: ["col·legi, intel·ligent", "pel·lícula, novel·la", "síl·laba, il·lusió"],
    parany:
      "El punt va al mig i a mitja alçada (l·l), no és ni un punt final ni un guió. Al teclat: Ctrl i el punt, o copia'l d'aquí.",
    primaria: {
      norma:
        "Son dues eles amb un puntet al mig. Es una sola lletra que es diu una mica mes llarga.",
      exemples: ["col·legi", "pel·lícula"],
    }
  },
  apostrofacio: {
    norma:
      "Els articles el i la, i la preposició de, s'apostrofen davant de paraula que comenci per vocal o per h. L'excepció: la no s'apostrofa davant de i o u àtones.",
    normaCurta:
      "Davant de vocal o h: l'amic, l'home, d'aigua.",
    exemples: ["l'amic, l'home, l'illa", "d'aigua, d'hora", "la idea, la universitat, la humitat"],
    parany:
      "Àtona vol dir que no hi cau l'accent de la paraula: per això és «la idea» però «l'illa», on la i sí que sona forta.",
    primaria: {
      norma:
        "Quan la paraula seguent comenca per vocal o per h, l'article es menja la lletra i posa un apostrof.",
      exemples: ["el amic → l'amic", "de aigua → d'aigua"],
    }
  },
  accentuacio: {
    norma:
      "L'accent obert (à, è, ò) marca un so ample i el tancat (é, ó) un so estret. Les agudes s'accentuen si acaben en vocal, en vocal + s, o en -en, -in. Les planes, si acaben de qualsevol altra manera. Les esdrúixoles sempre.",
    normaCurta:
      "L'accent obert (à, è, ò) obre la boca; el tancat (é, ó) la tanca.",
    exemples: ["cafè, cançó, també", "arbre (no en du), làmpada", "música, química, història"],
    parany:
      "La a tònica sempre és oberta: mai no veuràs «á» en català.",
    primaria: {
      norma:
        "L'accent obert (à, è, ò) fa obrir molt la boca. El tancat (é, ó) la deixa mig tancada.",
      exemples: ["cafè (obert)", "camió (tancat)"],
    }
  },
  dieresi: {
    norma:
      "La dièresi (¨) fa dues feines: indica que la u de gue, gui, que, qui s'ha de pronunciar, i trenca un diftong per dir que la i o la u van soles.",
    normaCurta:
      "La dieresi diu que aquella lletra sona: pingüí, raïm.",
    exemples: ["qüestió, pingüí, aigües", "raïm, veïna, agraïm"],
    parany:
      "No en duen els infinitius, gerundis, futurs i condicionals acabats en -ir: conduir, conduint, conduirà.",
    primaria: {
      norma:
        "Els dos puntets volen dir que aquella lletra si que es diu.",
      exemples: ["pingüí", "raïm"],
    }
  },
};

/** L'ajuda d'una regla, si en tenim d'escrita. */
export function ajudaPerRegla(regla: string): AjudaRegla | null {
  return AJUDES_PER_REGLA[regla] ?? null;
}

/** Cert per als cursos de primaria, que son els que volen l'altra explicacio. */
export function esPrimaria(gradeLevel: string | null | undefined) {
  return !!gradeLevel && gradeLevel.endsWith("-primaria");
}

/**
 * El text que toca segons qui llegeix.
 *
 * Tres coses manen, en aquest ordre: si es primaria, si te adaptacions, i si
 * no, la versio completa. A batxillerat i a qui prepara un C1 o un C2 se'ls
 * dona la completa amb el parany: la norma basica ja la saben i el que els
 * cal son justament les excepcions.
 */
export function textAjuda(
  ajuda: AjudaRegla,
  { primaria, curta }: { primaria: boolean; curta: boolean }
): { norma: string; exemples: string[]; parany?: string } {
  if (primaria && ajuda.primaria) {
    return {
      norma: curta ? ajuda.normaCurta : ajuda.primaria.norma,
      exemples: ajuda.primaria.exemples,
    };
  }
  if (curta) return { norma: ajuda.normaCurta, exemples: ajuda.exemples.slice(0, 2) };
  return { norma: ajuda.norma, exemples: ajuda.exemples, parany: ajuda.parany };
}

/**
 * Si l'ajuda s'ha de veure oberta o darrere d'un boto.
 *
 * A qui li va be, un recordatori que s'obre sol cada vegada acaba sent una
 * pantalla que es tanca sense llegir. A qui ho necessita, en canvi, deixar-la
 * amagada darrere d'un boto es deixar-la sense fer servir, perque justament qui
 * mes falla es qui menys demana ajuda.
 */
export function ajudaObertaPerDefecte({
  mitjanaEnAquestaRegla,
  intentsEnAquestaRegla,
  teAdaptacions,
}: {
  mitjanaEnAquestaRegla: number | null;
  intentsEnAquestaRegla: number;
  teAdaptacions: boolean;
}) {
  if (teAdaptacions) return true;
  // Amb un sol intent fluix encara no se'n pot dir res: pot haver estat un dia
  // dolent. A partir del segon, si la mitjana no puja, la norma no s'ha entes.
  if (intentsEnAquestaRegla >= 2 && mitjanaEnAquestaRegla !== null && mitjanaEnAquestaRegla < 70) {
    return true;
  }
  return false;
}
