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

export async function createSchool(formData: FormData) {
  await requireSuperadmin();

  const name = String(formData.get("name") || "").trim();
  const domain = String(formData.get("domain") || "")
    .trim()
    .toLowerCase();
  const planType = String(formData.get("planType") || "AULA") as PlanType;

  if (!name || !domain) return;

  await prisma.school.create({ data: { name, domain, planType } });
  revalidatePath("/admin");
}
