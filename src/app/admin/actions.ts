"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { PlanType, Role } from "@prisma/client";
import { normaliseDomain } from "@/lib/domain";

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
export async function deleteUser(formData: FormData) {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") {
    throw new Error("No autoritzat.");
  }

  const userId = String(formData.get("userId") || "");
  if (!userId) return;

  // Sense aixo, un descuit deixa la plataforma sense cap superadministrador i
  // ja no hi ha manera de tornar a entrar-hi per arreglar-ho.
  if (userId === session.user.id) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user) return;

  if (user.role === "SUPERADMIN") {
    const quants = await prisma.user.count({ where: { role: "SUPERADMIN" } });
    if (quants <= 1) return;
  }

  // Els grups del docent es queden sense tutor en lloc de desapareixer amb ell.
  await prisma.classGroup.updateMany({ where: { teacherId: userId }, data: { teacherId: null } });
  await prisma.dictation.updateMany({ where: { teacherId: userId }, data: { teacherId: null } });

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin");
}
