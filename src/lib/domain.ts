/**
 * El domini d'un centre s'ha de desar net ("escola.cat"), perquè s'hi compara
 * la part dreta del correu de qui inicia sessió. Si s'hi cola una arrova, una
 * adreça sencera o una URL, l'emparellament per domini no lliga mai i el
 * centre es queda sense cap usuari, sense cap error visible enlloc.
 */
export function normaliseDomain(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "") // https://escola.cat
    .replace(/^www\./, "")
    .split("@")
    .pop()! // @escola.cat  o  algu@escola.cat
    .split("/")[0] // escola.cat/alguna-cosa
    .trim();
}
