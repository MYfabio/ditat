import {
  countWords,
  lengthForGrade,
  type GradeLevelValue,
  type OrthographicRuleValue,
} from "@/lib/dictation-rules";

// Banc de dictats simulats (mode sense clau d'API). Cada text base és prou
// llarg per cobrir el rang de secundària; per als cursos inferiors es retalla
// per frases fins a encaixar amb la llargada recomanada del cicle.
const MOCK_BANK: Record<OrthographicRuleValue, string> = {
  "l-l": `L'Anna estudia al col·legi del poble i li agrada molt la lectura. Aquesta tarda ha començat una novel·la sobre una il·lustradora que viatja en paral·lel per tot el món. El seu germà petit, en canvi, prefereix jugar amb la pilota al carrer. La novel·la explica la història d'una col·lecció de dibuixos que ningú no havia vist mai. La protagonista treballa amb molta il·lusió i intel·ligència per recuperar-los un per un. Al final del llibre, tots els dibuixos s'exposen en una sala il·luminada del museu de la ciutat. L'Anna diu que la lectura l'ajuda a imaginar mons nous i que li agradaria ser novel·lista. La seva mestra li ha proposat escriure un relat curt per al concurs literari de l'escola. El curs passat ja va escriure un conte que va agradar molt als seus companys. Ara vol millorar-lo i afegir-hi un capítol nou amb més personatges.`,

  "b-v": `En Bernat viu en un poble petit a la vora del riu. Cada dia porta el seu cavall blau fins al camp on l'espera l'avi. Avui, però, ha decidit anar caminant perquè fa un dia molt bo per passejar. Pel camí ha vist una bandada d'ocells que volaven cap al bosc veí. L'avi li havia explicat que aquells ocells arriben cada primavera des de molt lluny. En Bernat vol escriure un llibre sobre els animals que viuen a la vall. Ja ha començat a dibuixar-los en una llibreta que va comprar al mercat del divendres. Quan torna a casa, la seva mare li prepara un got de llet i unes torrades amb melmelada. Al vespre, tots dos revisen junts els dibuixos i n'escullen els millors. En Bernat diu que algun dia voldria ser biòleg i estudiar la vida del riu.`,

  dieresi: `La Laia té un pingüí de peluix que li va regalar la seva veïna. Li encanten els estudis de lingüística i somia poder investigar les llengües del món. Quan plou, li agrada escoltar el soroll de l'aigua a les canonades. Diu que cada llengua guarda una manera diferent de mirar les coses. A l'estiu va fer un curs on va aprendre paraules ambigües i qüestions de gramàtica. La seva família creu que algun dia serà una gran investigadora. Ella, mentrestant, continua omplint llibretes amb paraules que li semblen boniques. Els diumenges passeja amb la seva cosina i totes dues parlen de les seves il·lusions. De vegades apunta frases senceres que sent al carrer o a la ràdio. La seva llibreta ja és plena de paraules estranyes i de preguntes sense resposta encara.`,

  "h-muda": `A l'hivern, la Marta i l'Hugo van a l'hort de l'avi cada diumenge. Allà hi ha un vehicle vell que ja no funciona, però que fa servir per jugar-hi. Està prohibit tocar les eines sense permís, això sí. L'avi els explica històries d'abans, quan encara no hi havia ni llum ni aigua corrent. Ells l'escolten amb atenció mentre berenen pa amb oli i un rajolí de mel. De vegades hi ha tanta humitat que la terra queda enfangada i costa caminar. Aleshores es queden a la caseta i dibuixen les herbes que han recollit. Quan es fa fosc, tornen cap a casa amb una cistella plena de verdures. L'àvia els espera amb el sopar a punt i els pregunta què han fet durant tot el dia. Ells expliquen les seves aventures amb molt d'entusiasme i moltes rialles.`,

  accentuacio: `El meu germà va comprar un cafè ben calent abans d'agafar el camí cap a l'institut. Va dir que, tot i el fred, li agradava molt caminar pels carrers del barri. Al final, va arribar amb el número just per entrar a classe. Aquell matí tenia un examen de matemàtiques que li feia molt de respecte. La professora els havia avisat que hi hauria problemes de lògica i de càlcul. Ell havia estudiat molt durant tota la setmana i se sentia bastant preparat. Quan va sortir, va telefonar a la mare per explicar-li com havia anat. Diu que la propera vegada sortirà de casa una mica més d'hora. També ha decidit repassar els apunts cada tarda en comptes de deixar-ho tot per al final. La mare li ha dit que està molt orgullosa del seu esforç constant.`,

  "c-qu-g-gu": `Quan va començar la guerra dels jocs, tothom va agafar la guitarra i van cantar quatre cançons. La Queralt va explicar que aquell joc li recordava els estius amb els seus cosins. Tots plegats van riure molta estona. Després van preparar una gimcana amb proves de córrer, saltar i endevinar paraules. El guanyador rebia un quadern i una capsa de colors per dibuixar. La Queralt va quedar segona i va dir que l'any que ve tornaria a competir. Al capvespre van encendre un foc petit i van menjar castanyes calentes. Va ser una jornada que tots recordarien durant molt de temps. Abans de marxar van recollir tots els papers i les capses que havien quedat escampades. La Queralt va proposar tornar-hi el mes que ve amb més companys de classe.`,

  "x-ix": `Dins la caixa de fusta hi havia un cotxe vermell i un peix de plàstic. Van jugar al pati fins que va començar el partit de matx entre les dues classes. La mestra els va dir que guardessin les coses abans de marxar. El partit va ser molt igualat i tothom cridava des de les grades. Al final va guanyar l'equip que duia les samarretes de color taronja. En Xavier, que era el porter, va aturar dos xuts molt difícils. Els companys el van felicitar i li van fer una fotografia amb la copa. Aquella tarda va deixar un bon record a tota l'escola. El dilluns següent van penjar la fotografia al suro de l'entrada de l'escola. Molts alumnes s'aturaven a mirar-la i comentaven les millors jugades del partit.`,

  "j-g": `Al jardí de l'escola hi ha geranis de colors molt vius i una girafa de fusta pintada. La Judit va portar una joguina nova per ensenyar-la als companys durant el pati. Tots van voler jugar-hi una estona abans d'entrar a classe. El jardiner del centre els va explicar com s'han de regar les plantes. També els va ensenyar a distingir les fulles joves de les que ja són velles. La Gemma va apuntar-ho tot en un quadern per no oblidar-se'n. El dijous següent van plantar llavors de gira-sol en uns testos petits. Cada grup es va comprometre a tenir-ne cura fins al final del curs. Al juny, quan les plantes ja havien crescut, van fer una petita exposició al pati. Les famílies van venir a veure-la i van felicitar els alumnes per la feina feta.`,

  "s-ss-c-z": `A la plaça del poble hi havia una zebra de cartró per a la festa major. Els nens anaven de caça pel bosc mentre feien un passeig amb els mestres. Al final del dia, tots estaven una mica cansats però contents. La comissió de festes havia preparat una cercavila amb música i danses. Els veïns van sortir als balcons per veure passar la comitiva. A la nit hi va haver un castell de focs que va sorprendre tothom. Els més petits miraven el cel amb els ulls ben oberts. L'endemà, la plaça va quedar neta gràcies a la feina de molts voluntaris. L'alcaldessa va agrair públicament la col·laboració de totes les associacions del poble. Molts van dir que havia estat la millor festa major dels últims anys.`,

  apostrofacio: `L'escola organitza cada any una sortida a la muntanya per veure l'aigua dels rius de la comarca. L'amic de la Laura va portar l'esmorzar per a tot el grup. Durant l'hivern, sempre acaben la jornada amb una xocolata calenta. Enguany han pujat fins a l'ermita que hi ha a dalt de tot del turó. Des d'allà es veu l'horitzó i, els dies clars, fins i tot el mar. L'Òscar va explicar la llegenda d'un pastor que vivia en aquella muntanya. Tothom el va escoltar en silenci mentre s'acabaven l'entrepà. A la tornada, l'autocar anava ple de cançons i de ganes de repetir-ho. L'endemà, a classe, cadascú va escriure un text explicant el que més li havia agradat. La mestra els va recollir tots per fer-ne un àlbum de records del curs.`,
};

const FALLBACK = `L'escola de Sabadell prepara cada setmana un dictat nou perquè l'alumnat practiqui l'ortografia catalana amb frases properes a la seva realitat quotidiana. Els mestres trien una regla concreta i la treballen durant uns quants dies. Després, cada alumne escriu el text i el compara amb l'original per veure què ha de millorar. D'aquesta manera l'error deixa de ser un càstig i es converteix en una eina d'aprenentatge. Al final del trimestre, cada alumne pot veure tot el camí que ha recorregut.`;

function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Retalla el text base per frases senceres fins a encaixar amb la llargada
 * recomanada del cicle. Mai no talla una frase pel mig: val més quedar-se una
 * mica curt que deixar un dictat sense acabar.
 */
export function getMockDictationText(
  targetRule: OrthographicRuleValue | string,
  gradeLevel: GradeLevelValue | string
): string {
  const base = MOCK_BANK[targetRule as OrthographicRuleValue] ?? FALLBACK;
  const { min, max } = lengthForGrade(gradeLevel);

  const sentences = splitSentences(base);
  const picked: string[] = [];
  let words = 0;

  for (const sentence of sentences) {
    const next = words + countWords(sentence);
    // Afegir aquesta frase passaria del màxim i ja tenim prou text: parem.
    if (next > max && words >= min) break;
    picked.push(sentence);
    words = next;
    if (words >= min && words <= max) continue;
  }

  return picked.join(" ").trim() || sentences[0];
}
