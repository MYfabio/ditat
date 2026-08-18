"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { PlanType } from "@prisma/client";

async function requireSuperadmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "SUPERADMIN") {
    throw new Error("No autoritzat.");
  }
}

/**
 * El domini s'ha de desar net ("escola.cat"), perquè s'hi compara la part
 * dreta del correu de qui inicia sessió. Si s'hi cola una arrova, una adreça
 * completa o una URL, l'emparellament per domini no lliga mai i el centre es
 * queda sense cap usuari, sense cap error visible.
 */
export function normaliseDomain(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "") // https://escola.cat
    .replace(/^www\./, "")
    .split("@")
    .pop()! // @escola.cat  o  algu@escola.cat
    .split("/")[0] // escola.cat/alguna-cosa
    .trim();
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
