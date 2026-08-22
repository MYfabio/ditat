import { prisma } from "@/lib/prisma";

/**
 * Pla gratuït i subscripció de qui aprèn pel seu compte.
 *
 * Els alumnes d'un centre no hi passen mai: el seu accés el paga el centre i
 * els dictats els posa el seu docent. Això només val per a qui s'ha donat
 * d'alta sol per preparar-se un nivell.
 */

/** Dictats que es pot demanar un mateix cada mes sense pagar. */
export const DICTATS_GRATUITS_AL_MES = 4;

/** Preu de la subscripció, en euros al mes. */
export const PREU_MENSUAL_EUR = 5;

/**
 * Edat mínima per donar-se d'alta sol.
 *
 * A l'Estat espanyol l'edat de consentiment digital son 14 anys (LOPDGDD,
 * article 7). Per sota, qui ha de consentir es qui té la pàtria potestat, i
 * això no es pot resoldre amb una casella: per a menors de 14, la via es el
 * seu centre educatiu.
 */
export const EDAT_MINIMA = 14;

export function edatSuficient(anyNaixement: number, ara = new Date()): boolean {
  // S'aproxima per any: no demanem el dia i el mes, que serien mes dades
  // personals de les necessaries per a una comprovacio d'edat.
  return ara.getFullYear() - anyNaixement >= EDAT_MINIMA;
}

export type EstatSubscripcio = {
  actiu: boolean;
  usatsAquestMes: number;
  restants: number | null;
};

/** Cert mentre el que ha pagat encara li val. */
export function subscripcioActiva(user: {
  subscriptionStatus: string | null;
  subscriptionEndsAt: Date | null;
}): boolean {
  if (user.subscriptionStatus === "active" || user.subscriptionStatus === "trialing") {
    return true;
  }
  // Qui es dona de baixa a mitja mes conserva l'accés fins al dia que ja tenia
  // pagat: ha pagat el mes sencer i no se li talla abans d'hora.
  return !!user.subscriptionEndsAt && user.subscriptionEndsAt > new Date();
}

function inicioDelMes(ara = new Date()) {
  return new Date(ara.getFullYear(), ara.getMonth(), 1);
}

/**
 * Quants dictats s'ha demanat aquest mes i quants li'n queden.
 *
 * Es compten els dictats dirigits a ell, que son els que es genera sol. Els
 * que li posa un docent no compten: no els ha demanat ell i no els paga ell.
 */
export async function estatDelMes(userId: string): Promise<EstatSubscripcio> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true, subscriptionEndsAt: true },
  });
  if (!user) return { actiu: false, usatsAquestMes: 0, restants: 0 };

  const actiu = subscripcioActiva(user);
  if (actiu) return { actiu: true, usatsAquestMes: 0, restants: null };

  const usatsAquestMes = await prisma.dictation.count({
    where: { targetStudentId: userId, createdAt: { gte: inicioDelMes() } },
  });

  return {
    actiu: false,
    usatsAquestMes,
    restants: Math.max(0, DICTATS_GRATUITS_AL_MES - usatsAquestMes),
  };
}

/** Quan tornarà a tenir dictats gratuïts, per poder-l'hi dir. */
export function properMes(ara = new Date()) {
  return new Date(ara.getFullYear(), ara.getMonth() + 1, 1);
}
