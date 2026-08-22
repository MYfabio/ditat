import { prisma } from "@/lib/prisma";

/**
 * L'embut: de qui entra al web a qui pagaria.
 *
 * Gairebe tot surt de dades que ja teniem —altes, entregues, llista d'espera—
 * i nomes calia comptar les visites. Es per aixo que no cal cap servei de fora
 * per saber si el producte funciona.
 */
export type Embut = {
  visites: number;
  altes: number;
  hanFetUnDictat: number;
  llistaEspera: number;
  perDia: { dia: string; visites: number; altes: number }[];
};

export async function carregaEmbut(dies = 30): Promise<Embut> {
  const desde = new Date();
  desde.setUTCHours(0, 0, 0, 0);
  desde.setUTCDate(desde.getUTCDate() - (dies - 1));

  const [visitesPerDia, altesRecents, totalAltes, ambEntrega, llistaEspera] = await Promise.all([
    prisma.pageView.findMany({
      where: { day: { gte: desde } },
      select: { day: true, count: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: desde }, classGroupId: null },
      select: { createdAt: true },
    }),
    // Nomes qui s'ha donat d'alta pel seu compte: l'alumnat que ve d'un centre
    // no diu res sobre si el producte s'aguanta sol.
    prisma.user.count({ where: { classGroupId: null, role: "STUDENT" } }),
    prisma.user.count({
      where: { classGroupId: null, role: "STUDENT", submissions: { some: {} } },
    }),
    prisma.waitlistEntry.count(),
  ]);

  const perDiaMap = new Map<string, { visites: number; altes: number }>();
  for (let i = 0; i < dies; i++) {
    const d = new Date(desde);
    d.setUTCDate(desde.getUTCDate() + i);
    perDiaMap.set(d.toISOString().slice(0, 10), { visites: 0, altes: 0 });
  }
  for (const v of visitesPerDia) {
    const clau = v.day.toISOString().slice(0, 10);
    const fila = perDiaMap.get(clau);
    if (fila) fila.visites += v.count;
  }
  for (const u of altesRecents) {
    const clau = u.createdAt.toISOString().slice(0, 10);
    const fila = perDiaMap.get(clau);
    if (fila) fila.altes += 1;
  }

  return {
    visites: visitesPerDia.reduce((t, v) => t + v.count, 0),
    altes: totalAltes,
    hanFetUnDictat: ambEntrega,
    llistaEspera,
    perDia: [...perDiaMap.entries()].map(([dia, v]) => ({ dia, ...v })),
  };
}
