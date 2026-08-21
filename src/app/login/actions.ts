"use server";

import { prisma } from "@/lib/prisma";
import { canAccess } from "@/lib/access-rules";

/**
 * Alta amb nom i cognoms, sense contrasenya.
 *
 * L'enllaç per correu sol no recull el nom: Auth.js crea l'usuari nomes amb
 * l'adreça, i el docent es trobava un correu sense persona a la llista de
 * classe. Aquest pas desa el nom abans d'enviar l'enllaç; despres, quan la
 * persona el prem, Auth.js reconeix l'adreça i l'hi lliga.
 *
 * No es desa cap contrasenya a proposit. En un sistema que guarda feina de
 * menors, no tenir-ne cap vol dir que no hi ha res a filtrar ni res a
 * recuperar, i el correu de recuperacio acabaria sent... un enllaç per correu.
 */
export async function registerWithEmail(formData: FormData): Promise<{
  ok: boolean;
  error?: string;
}> {
  const nom = String(formData.get("nom") || "").trim();
  const cognoms = String(formData.get("cognoms") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();

  if (!nom || !cognoms) return { ok: false, error: "Escriu el nom i els cognoms." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Aquest correu no sembla valid." };
  }

  const decision = await canAccess(email);
  if (!decision.allowed) {
    if (decision.reason === "db-down") {
      return { ok: false, error: "Ara mateix no podem completar l'alta. Torna-ho a provar." };
    }
    return {
      ok: false,
      error:
        "Aquest correu no pertany a cap centre donat d'alta. Fes servir el compte del teu centre educatiu.",
    };
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true, accounts: { select: { id: true }, take: 1 } },
    });

    if (!existing) {
      await prisma.user.create({
        data: { email, name: `${nom} ${cognoms}`, role: "STUDENT", schoolId: decision.schoolId },
      });
      return { ok: true };
    }

    // El compte ja existeix i algu hi ha entrat: no se li canvia el nom des
    // d'un formulari public, que seria una manera de reanomenar gent aliena.
    const jaHiHaEntrat = !!existing.emailVerified || existing.accounts.length > 0;
    if (!jaHiHaEntrat) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { name: `${nom} ${cognoms}` },
      });
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "No s'ha pogut completar l'alta. Torna-ho a provar." };
  }
}
