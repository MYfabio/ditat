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

export async function createSchool(formData: FormData) {
  await requireSuperadmin();

  const name = String(formData.get("name") || "").trim();
  const domain = normaliseDomain(String(formData.get("domain") || ""));
  const planType = String(formData.get("planType") || "AULA") as PlanType;

  if (!name || !domain) return;

  await prisma.school.create({ data: { name, domain, planType } });
  revalidatePath("/admin");
}
