/**
 * Evolucio setmanal d'un alumne, comparada amb la mitjana setmanal del seu grup.
 *
 * Com la resta de l'analitica del docent, es mira la persona i el seu grup, mai
 * un ranking: el que el docent necessita saber es si l'alumne va per sobre o
 * per sota del grup ara mateix, no qui es el millor.
 *
 * Cada alumne pesa igual dins del grup: qui ha fet quaranta dictats no ha
 * d'estirar la mitjana del grup cap a la seva banda.
 */

/** Diferencia (en punts) a partir de la qual es diu que va per sobre o per sota. */
const MARGE_PUNTS = 5;

/** Setmanes que es mostren i sobre les quals es calcula la posicio. */
const SETMANES_VISTES = 6;

export type EntregaPuntuada = { data: Date; score: number };

export type ComparacioGrup = {
  /** Les ultimes setmanes amb dictats de l'alumne, amb la mitjana del grup a la mateixa setmana. */
  setmanes: { setmana: string; alumne: number; grup: number }[];
  posicio: "per-sobre" | "a-la-par" | "per-sota" | null;
};

/**
 * Clau ISO de la setmana ("2026-W43"). Ordenada alfabeticament, va en ordre de
 * temps, i dos dictats de la mateixa setmana cauen a la mateixa clau.
 */
export function clauSetmana(data: Date): string {
  const d = new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
  const dia = d.getUTCDay() || 7; // dilluns = 1 ... diumenge = 7
  // El dijous de la setmana ISO determina a quin any i quina setmana pertany.
  d.setUTCDate(d.getUTCDate() + 4 - dia);
  const inici = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const setmana = Math.ceil(((d.getTime() - inici.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(setmana).padStart(2, "0")}`;
}

/** Puntuacio mitjana de cada setmana en que l'alumne ha fet dictats. */
export function mitjanaSetmanal(entregues: EntregaPuntuada[]): Map<string, number> {
  const acumulat = new Map<string, { total: number; n: number }>();
  for (const e of entregues) {
    const clau = clauSetmana(e.data);
    const acc = acumulat.get(clau) ?? { total: 0, n: 0 };
    acc.total += e.score;
    acc.n += 1;
    acumulat.set(clau, acc);
  }
  return new Map(
    [...acumulat].map(([setmana, { total, n }]): [string, number] => [setmana, total / n])
  );
}

/**
 * Mitjana setmanal del grup: la mitjana de cada alumne compta igual, i una
 * setmana sense dictats d'un alumne no el compta com a zero.
 */
export function mitjanaDelGrup(alumnes: Map<string, number>[]): Map<string, number> {
  const acumulat = new Map<string, { total: number; n: number }>();
  for (const setmanes of alumnes) {
    for (const [setmana, mitjana] of setmanes) {
      const acc = acumulat.get(setmana) ?? { total: 0, n: 0 };
      acc.total += mitjana;
      acc.n += 1;
      acumulat.set(setmana, acc);
    }
  }
  return new Map(
    [...acumulat].map(([setmana, { total, n }]): [string, number] => [setmana, total / n])
  );
}

/**
 * Posa l'evolucio de l'alumne al costat de la del grup, setmana a setmana.
 *
 * La posicio es la diferencia mitjana en les ultimes setmanes. Amb una sola
 * setmana no es pot dir res: una nota no fa una tendencia.
 */
export function comparaAmbGrup(
  alumne: Map<string, number>,
  grup: Map<string, number>
): ComparacioGrup {
  const setmanes = [...alumne.keys()]
    .sort()
    .slice(-SETMANES_VISTES)
    .map((setmana) => ({
      setmana,
      alumne: Math.round(alumne.get(setmana) ?? 0),
      grup: Math.round(grup.get(setmana) ?? 0),
    }));

  if (setmanes.length < 2) return { setmanes, posicio: null };

  const diferencia =
    setmanes.reduce((total, s) => total + (s.alumne - s.grup), 0) / setmanes.length;
  const posicio =
    diferencia >= MARGE_PUNTS ? "per-sobre" : diferencia <= -MARGE_PUNTS ? "per-sota" : "a-la-par";
  return { setmanes, posicio };
}
