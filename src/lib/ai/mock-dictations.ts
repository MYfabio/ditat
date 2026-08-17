import type { GradeLevelValue, OrthographicRuleValue } from "@/lib/dictation-rules";

// Banc de dictats simulats (mode sense clau d'API). Un text base per regla
// ortogràfica; es retalla per als cursos més baixos de primaria.
const MOCK_BANK: Record<OrthographicRuleValue, string> = {
  "l-l": `L'Anna estudia al col·legi del poble i li agrada molt la lectura. Aquesta tarda ha començat una novel·la sobre una il·lustradora que viatja en paral·lel per tot el món. El seu germà petit, en canvi, prefereix jugar amb la pilota al carrer.`,
  "b-v": `En Bernat viu en un poble petit a la vora del riu. Cada dia porta el seu cavall blau fins al camp on l'espera l'avi. Avui, però, ha decidit anar caminant perquè fa un dia molt bo per passejar.`,
  dieresi: `La Laia té un pingüí de peluix que li va regalar la seva veïna. Li encanten els estudis de lingüística i somia poder investigar les llengües del món. Quan plou, li agrada escoltar el soroll de l'aigua a les canonades.`,
  "h-muda": `A l'hivern, la Marta i l'Hugo van a l'hort de l'avi cada diumenge. Allà hi ha un vehicle vell que ja no funciona, però que fa servir per jugar-hi. Està prohibit tocar les eines sense permís, això sí.`,
  accentuacio: `El meu germà va comprar un cafè ben calent abans d'agafar el camino cap a l'institut. Va dir que, tot i el fred, li agradava molt caminar pels carrers del barri. Al final, va arribar amb el número just per entrar a classe.`,
  "c-qu-g-gu": `Quan va comencar la guerra dels jocs, tothom va agafar la guitarra i van cantar quatre cançons. La Queralt va explicar que aquell joc li recordava els estius amb els seus cosins. Tots plegats van riure molta estona.`,
  "x-ix": `Dins la caixa de fusta hi havia un cotxe vermell i un peix de plàstic. Van jugar al pati fins que va comencar el partit de matx entre les dues classes. La mestra els va dir que guardessin les coses abans de marxar.`,
  "j-g": `Al jardí de l'escola hi ha geranis de colors molt vius i una girafa de fusta pintada. La Judit va portar una joguina nova per ensenyar-la als companys durant el pati. Tots van voler jugar-hi una estona abans d'entrar a classe.`,
  "s-ss-c-z": `A la plaça del poble hi havia una zebra de cartró per a la festa major. Els nens anaven de caça pel bosc mentre feien un passeig amb els mestres. Al final del dia, tots estaven una mica cansats però contents.`,
  apostrofacio: `L'escola organitza cada any una sortida a la muntanya per veure l'aigua dels rius de la comarca. L'amic de la Laura va portar l'esmorzar per a tot el grup. Durant l'hivern, sempre acaben la jornada amb una xocolata calenta.`,
};

const LOWER_GRADES = new Set(["1-primaria", "2-primaria", "3-primaria"]);

export function getMockDictationText(
  targetRule: OrthographicRuleValue | string,
  gradeLevel: GradeLevelValue | string
): string {
  const base =
    MOCK_BANK[targetRule as OrthographicRuleValue] ??
    `L'escola de Sabadell prepara cada setmana un dictat nou perquè l'alumnat practiqui l'ortografia catalana amb frases properes a la seva realitat quotidiana.`;

  if (LOWER_GRADES.has(gradeLevel)) {
    const sentences = base.split(". ").slice(0, 2);
    return sentences.join(". ").trim().replace(/\.?$/, ".");
  }
  return base;
}
