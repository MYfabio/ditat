"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const VALID_INTENTS = new Set(["teacher", "student"]);

/**
 * Desa la intencio declarada en el primer acces (tria-perfil.tsx a /login).
 * Nomes val la primera vegada: si l'usuari ja en te una de desada, es
 * conserva. No toca mai `role` -- es purament la preferencia de a quin
 * panell l'enviem per defecte, no un permis.
 */
export async function saveSignupIntentIfMissing(intent: string) {
  if (!VALID_INTENTS.has(intent)) return;

  const session = await auth();
  if (!session?.user?.id) return;

  try {
    await prisma.user.updateMany({
      where: { id: session.user.id, signupIntent: null },
      data: { signupIntent: intent },
    });
  } catch {
    // Preferencia cosmetica: si la base de dades falla, no es motiu per
    // deixar algu encallat sense arribar al seu panell.
  }
}
