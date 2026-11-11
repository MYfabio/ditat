"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { PlanType, Role } from "@prisma/client";
import { normaliseDomain } from "@/lib/domain";
import { profileFromSchoolPresets } from "@/lib/needs-profile";
import { getStripe } from "@/lib/stripe";

async function requireSuperadmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") {
    throw new Error("No autoritzat.");
  }
}

/**
 * Canvia el rol d'un usuari i, si cal, el centre on pertany.
 *
 * Qui entra per SSO sempre es crea com a STUDENT: no hi ha cap pantalla que
 * permeti pujar-se el rol un mateix. Per tant, algú amb permisos de
 * superadministració ha de poder fer aquest canvi des d'aquí; si no, no hi ha
 * manera de tenir una coordinació de centre.
 */
export async function updateUserRole(formData: FormData) {
  await requireSuperadmin();

  const userId = String(formData.get("userId") || "");
  const role = String(formData.get("role") || "") as Role;
  const schoolIdRaw = String(formData.get("schoolId") || "");

  const validRoles: Role[] = ["SUPERADMIN", "SCHOOL_COORD", "TEACHER", "STUDENT"];
  if (!userId || !validRoles.includes(role)) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      role,
      // "cap" vol dir explícitament sense centre (per exemple, superadmins).
      schoolId: schoolIdRaw === "cap" ? null : schoolIdRaw || undefined,
    },
  });

  revalidatePath("/admin");
}

/**
 * Esborra un centre. S'emporta els seus grups classe i, amb ells, els dictats
 * i les entregues que hi pengen. Els usuaris no s'esborren: es queden sense
 * centre assignat i deixen de veure'n res.
 */
export async function deleteSchool(formData: FormData) {
  await requireSuperadmin();

  const schoolId = String(formData.get("schoolId") || "");
  if (!schoolId) return;

  await prisma.school.delete({ where: { id: schoolId } });
  revalidatePath("/admin");
}

export async function createSchool(formData: FormData) {
  await requireSuperadmin();

  const name = String(formData.get("name") || "").trim();
  const domain = normaliseDomain(String(formData.get("domain") || ""));
  const planType = String(formData.get("planType") || "AULA") as PlanType;

  if (!name || !domain) return;

  await prisma.school.create({ data: { name, domain, planType } });
  revalidatePath("/admin");
}

export type AltaUsuariResultat = { ok: true; email: string } | { ok: false; error: string };

/**
 * Dona d'alta un usuari abans que entri per primera vegada.
 *
 * Fins ara el superadministrador només podia canviar el rol de qui ja havia
 * entrat: si una persona encara no havia accedit, no hi havia manera de deixar-li
 * el centre i el rol preparats. Ara ho pot fer des d'aquí, com ja fa la
 * coordinació amb la importació per CSV.
 *
 * Si el correu ja existeix, no es toca: es rebutja i s'indica on canviar-lo.
 * Sobreescriure en silenci el centre o el rol d'algu seria un canvi de permisos
 * que ningú ha vist.
 */
export async function createUserByAdmin(formData: FormData): Promise<AltaUsuariResultat> {
  await requireSuperadmin();

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const role = String(formData.get("role") || "") as Role;
  const schoolIdRaw = String(formData.get("schoolId") || "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: "Escriu un correu vàlid." };
  }
  const validRoles: Role[] = ["SUPERADMIN", "SCHOOL_COORD", "TEACHER", "STUDENT"];
  if (!validRoles.includes(role)) {
    return { ok: false, error: "Tria un rol." };
  }

  const schoolId = schoolIdRaw && schoolIdRaw !== "cap" ? schoolIdRaw : null;
  // Només el superadministrador va sense centre: la resta de rols treballen dins d'un.
  if (role !== "SUPERADMIN" && !schoolId) {
    return { ok: false, error: "Aquest rol necessita un centre." };
  }

  const school = schoolId ? await prisma.school.findUnique({ where: { id: schoolId } }) : null;
  if (schoolId && !school) {
    return { ok: false, error: "El centre no existeix." };
  }

  const existent = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existent) {
    return {
      ok: false,
      error:
        "Ja hi ha un usuari amb aquest correu. Canvia-li el rol o el centre a la pestanya «Usuaris i rols».",
    };
  }

  await prisma.user.create({
    data: {
      email,
      name: name || email.split("@")[0],
      role,
      schoolId,
      // Igual que la importació per CSV: l'alumnat nou rep els preajustos del centre.
      ...(role === "STUDENT" && school
        ? { needsProfile: { ...profileFromSchoolPresets(school.neePresets) } }
        : {}),
    },
  });

  revalidatePath("/admin");
  // L'alta també es pot fer des de la fitxa del centre: ha de sortir-hi de seguida.
  if (schoolId) revalidatePath(`/admin/centre/${schoolId}`);
  return { ok: true, email };
}

export type BaixaUsuariResultat = { ok: true } | { ok: false; error: string };

/**
 * Esborra un usuari del sistema sencer.
 *
 * La coordinacio nomes pot treure gent del seu centre: l'usuari continua
 * existint, sense escola. Falta poder-lo esborrar de debo, que es el que
 * demana el RGPD quan algu exerceix el dret de supressio, i tambe l'unica
 * manera de netejar comptes creats per error.
 *
 * S'emporta el que es seu (entregues, informes, dictats personalitzats) via
 * onDelete: Cascade. Els dictats que un docent va fer per a tota una classe no
 * s'esborren: son de la classe, i esborrar-los deixaria l'alumnat sense
 * l'enunciat del que ja ha entregat.
 */
export async function deleteUser(formData: FormData): Promise<BaixaUsuariResultat> {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") {
    throw new Error("No autoritzat.");
  }

  const userId = String(formData.get("userId") || "");
  if (!userId) return { ok: false, error: "Falta l'usuari." };

  // Sense aixo, un descuit deixa la plataforma sense cap superadministrador i
  // ja no hi ha manera de tornar a entrar-hi per arreglar-ho.
  if (userId === session.user.id) {
    return { ok: false, error: "No et pots esborrar a tu mateix des d'aquí." };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, schoolId: true, stripeSubscriptionId: true },
  });
  if (!user) return { ok: false, error: "Aquest usuari ja no existeix." };

  if (user.role === "SUPERADMIN") {
    const quants = await prisma.user.count({ where: { role: "SUPERADMIN" } });
    if (quants <= 1) {
      return { ok: false, error: "És l'únic superadministrador: nomena'n un altre abans." };
    }
  }

  // Igual que quan algu s'esborra a si mateix (compte/actions.ts): primer la
  // subscripcio. Esborrar el compte i deixar el cobrament viu seria seguir
  // cobrant a algu que ja no te cap manera d'aturar-ho. Si Stripe falla, no
  // s'esborra res.
  if (user.stripeSubscriptionId) {
    const stripe = getStripe();
    if (!stripe) {
      return {
        ok: false,
        error: "Té una subscripció activa i ara no es pot cancel·lar. No s'ha esborrat res.",
      };
    }
    try {
      await stripe.subscriptions.cancel(user.stripeSubscriptionId);
    } catch (err) {
      const codi = (err as { code?: string })?.code;
      // Si ja no existeix a Stripe, no hi ha res a cancel·lar i es pot seguir.
      if (codi !== "resource_missing") {
        console.error("No s'ha pogut cancel·lar la subscripció en esborrar l'usuari:", err);
        return {
          ok: false,
          error: "No s'ha pogut cancel·lar la seva subscripció i per això no s'ha esborrat res.",
        };
      }
    }
  }

  // Els grups del docent es queden sense tutor en lloc de desapareixer amb ell.
  await prisma.classGroup.updateMany({ where: { teacherId: userId }, data: { teacherId: null } });
  await prisma.dictation.updateMany({ where: { teacherId: userId }, data: { teacherId: null } });

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin");
  if (user.schoolId) revalidatePath(`/admin/centre/${user.schoolId}`);
  return { ok: true };
}
