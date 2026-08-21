/**
 * Topall d'us per persona i dia de les crides que costen diners.
 *
 * Generar un dictat, locutar-lo i corregir una foto es paguen a Google. Sense
 * cap topall, un compte legitim —o un script amb les seves credencials— pot
 * disparar la factura en una tarda sense que ningu se n'adoni fins que arriba.
 *
 * El recompte viu a la memoria del servidor: si es reinicia, torna a zero, i
 * amb mes d'una instancia cadascuna porta el seu compte. No es un control
 * antifrau, es una xarxa perque una errada no costi cent euros. Un topall
 * imperfecte atura el cas real (un bucle, una tecla enganxada, algu provant)
 * molt millor que no tenir-ne cap.
 */

type Finestra = { compte: number; reinicia: number };

const registre = new Map<string, Finestra>();

/** Neteja les entrades caducades perque el mapa no creixi sense fi. */
function purga(ara: number) {
  if (registre.size < 500) return;
  for (const [clau, f] of registre) {
    if (f.reinicia <= ara) registre.delete(clau);
  }
}

export type Limit = { permes: boolean; restants: number; reiniciaEn: number };

/**
 * @param clau     qui fa l'accio i quina (per exemple "dictat:<id d'usuari>")
 * @param maxim    quantes vegades pot fer-la dins de la finestra
 * @param finestraMs durada de la finestra; per defecte un dia
 */
export function comprovaLimit(clau: string, maxim: number, finestraMs = 24 * 60 * 60 * 1000): Limit {
  const ara = Date.now();
  purga(ara);

  const actual = registre.get(clau);
  if (!actual || actual.reinicia <= ara) {
    registre.set(clau, { compte: 1, reinicia: ara + finestraMs });
    return { permes: true, restants: maxim - 1, reiniciaEn: finestraMs };
  }

  if (actual.compte >= maxim) {
    return { permes: false, restants: 0, reiniciaEn: actual.reinicia - ara };
  }

  actual.compte += 1;
  return { permes: true, restants: maxim - actual.compte, reiniciaEn: actual.reinicia - ara };
}

/** Topalls diaris. Molt per sobre d'un us normal d'aula, molt per sota d'un descontrol. */
export const TOPALLS = {
  /** Dictats generats per docent i dia. Una programacio setmanal en son 5 o 6. */
  generarDictat: 60,
  /** Entregues corregides per alumne i dia. Un dictat i uns quants reintents. */
  entregar: 40,
} as const;

/** Hores i minuts que falten, per poder-ho dir en catala a qui s'ha quedat sense. */
export function quantFalta(ms: number) {
  const hores = Math.floor(ms / (60 * 60 * 1000));
  if (hores >= 1) return `${hores} h`;
  const minuts = Math.max(1, Math.round(ms / (60 * 1000)));
  return `${minuts} min`;
}
