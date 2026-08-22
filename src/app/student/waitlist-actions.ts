"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Apunta algu a la llista d'espera de la subscripcio.
 *
 * Mentre no es pugui cobrar, el boto de subscriure's no ha de portar enlloc:
 * o be no hi es, o be serveix per a alguna cosa. Aixo el fa servir per saber
 * quanta gent ho hauria pagat, que es l'unica dada que dira si val la pena
 * donar d'alta l'activitat.
 */
export async function joinWaitlist(): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.email) return { ok: false, error: "Has d'iniciar sessió." };

  try {
    await prisma.waitlistEntry.upsert({
      where: { email: session.user.email.toLowerCase() },
      update: {},
      create: { email: session.user.email.toLowerCase(), userId: session.user.id },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "No s'ha pogut apuntar. Torna-ho a provar." };
  }
}
