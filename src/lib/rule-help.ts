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
};

export const AJUDES_PER_REGLA: Record<string, AjudaRegla> = {
  "c-qu-g-gu": {
    norma:
      "Per al so de /k/ escrivim c davant de a, o, u, i qu davant de e, i. Per al so de /g/, g davant de a, o, u, i gu davant de e, i.",
    normaCurta:
      "Davant de e, i: qu i gu. Davant de a, o, u: c i g.",
    exemples: ["casa, cosa, cul", "queixa, quilo", "gat, got, gust", "guerra, guitarra"],
    parany: "La u de qu i gu no sona: quilo es diu «kilo», no «kuilo».",
  },
  "h-muda": {
    norma:
      "La h no sona mai, però s'escriu. La duen algunes paraules al principi i unes quantes al mig, i no hi ha cap so que t'avisi: s'aprenen d'una en una.",
    normaCurta:
      "La h no sona, pero s'escriu. S'apren paraula per paraula.",
    exemples: ["home, hivern, hora, humit", "ahir, prohibir", "sense h: os, ou, avui, arbre"],
    parany:
      "Haver sempre du h (he, has, ha, hem, heu, han). A veure (de mirar) no en du cap.",
  },
  "j-g": {
    norma:
      "Per al so de la j escrivim j davant de a, o, u, i g davant de e, i.",
    normaCurta:
      "Davant de e, i: g. Davant de a, o, u: j.",
    exemples: ["jardí, jove, jutge", "gent, girar, gener"],
    parany:
      "Unes quantes paraules porten j davant de e contra la regla: jersei, jeroglífic, majestat, injecció.",
  },
  "s-ss-c-z": {
    norma:
      "So sord (com a «sal»): s al principi o darrere de consonant, ss entre vocals, c davant de e, i, i ç davant de a, o, u. So sonor (com a «casa»): s entre vocals, z al principi o darrere de consonant.",
    normaCurta:
      "Entre vocals: una s sona suau, dues sonen fortes.",
    exemples: ["sal, pensar, passar", "cel, cinc, caça", "casa, camisa", "zona, onze"],
    parany:
      "Entre vocals, una sola s sona sonora i dues sones sordes: «casa» i «cassa» no són la mateixa paraula.",
  },
  "b-v": {
    norma:
      "S'escriu b davant de l i de r, i darrere de m. S'escriu v darrere de n. Les terminacions de l'imperfet dels verbs de la primera conjugació van amb v: -ava, -aves, -avem.",
    normaCurta:
      "b davant de l i r. v darrere de n. Els verbs acabats en -ava sempre amb v.",
    exemples: ["blanc, brau, ambient", "canvi, envestir", "cantava, jugaves, miràvem"],
    parany:
      "Si dubtes, busca una paraula de la mateixa família on se senti: llobató t'indica que és llop, i «bevia» ve de beure.",
  },
  "x-ix": {
    norma:
      "El so de x s'escriu x al principi de paraula i darrere de consonant, i ix darrere de a, e, o, u. El so de tx s'escriu tx entre vocals i al final de paraula.",
    normaCurta:
      "Darrere de a, e, o, u: ix. Al principi: x.",
    exemples: ["xarxa, xocolata, panxa", "caixa, peix, disbauxa", "cotxe, despatx"],
    parany: "A «caixa» la i no és una vocal a part: només marca el so de la x.",
  },
  "l-l": {
    norma:
      "La ela geminada són dues eles amb un punt volat al mig. Es pronuncia una mica més llarga i apareix sobretot en paraules cultes.",
    normaCurta:
      "Son dues eles amb un punt al mig: col·legi.",
    exemples: ["col·legi, intel·ligent", "pel·lícula, novel·la", "síl·laba, il·lusió"],
    parany:
      "El punt va al mig i a mitja alçada (l·l), no és ni un punt final ni un guió. Al teclat: Ctrl i el punt, o copia'l d'aquí.",
  },
  apostrofacio: {
    norma:
      "Els articles el i la, i la preposició de, s'apostrofen davant de paraula que comenci per vocal o per h. L'excepció: la no s'apostrofa davant de i o u àtones.",
    normaCurta:
      "Davant de vocal o h: l'amic, l'home, d'aigua.",
    exemples: ["l'amic, l'home, l'illa", "d'aigua, d'hora", "la idea, la universitat, la humitat"],
    parany:
      "Àtona vol dir que no hi cau l'accent de la paraula: per això és «la idea» però «l'illa», on la i sí que sona forta.",
  },
  accentuacio: {
    norma:
      "L'accent obert (à, è, ò) marca un so ample i el tancat (é, ó) un so estret. Les agudes s'accentuen si acaben en vocal, en vocal + s, o en -en, -in. Les planes, si acaben de qualsevol altra manera. Les esdrúixoles sempre.",
    normaCurta:
      "L'accent obert (à, è, ò) obre la boca; el tancat (é, ó) la tanca.",
    exemples: ["cafè, cançó, també", "arbre (no en du), làmpada", "música, química, història"],
    parany:
      "La a tònica sempre és oberta: mai no veuràs «á» en català.",
  },
  dieresi: {
    norma:
      "La dièresi (¨) fa dues feines: indica que la u de gue, gui, que, qui s'ha de pronunciar, i trenca un diftong per dir que la i o la u van soles.",
    normaCurta:
      "La dieresi diu que aquella lletra sona: pingüí, raïm.",
    exemples: ["qüestió, pingüí, aigües", "raïm, veïna, agraïm"],
    parany:
      "No en duen els infinitius, gerundis, futurs i condicionals acabats en -ir: conduir, conduint, conduirà.",
  },
};

/** L'ajuda d'una regla, si en tenim d'escrita. */
export function ajudaPerRegla(regla: string): AjudaRegla | null {
  return AJUDES_PER_REGLA[regla] ?? null;
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
