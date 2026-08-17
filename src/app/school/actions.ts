"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

async function requireCoordinator() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SCHOOL_COORD" && session.user.role !== "SUPERADMIN")) {
    throw new Error("No autoritzat.");
  }
  if (!session.user.schoolId) {
    throw new Error("El teu usuari no te cap escola assignada.");
  }
  return session.user;
}

const VALID_ROLES: Role[] = ["TEACHER", "STUDENT"];

export type CsvImportResult = { created: number; skipped: number; errors: string[] };

export async function importUsersCsv(csvText: string): Promise<CsvImportResult> {
  const user = await requireCoordinator();
  const schoolId = user.schoolId as string;

  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const result: CsvImportResult = { created: 0, skipped: 0, errors: [] };

  for (const [index, line] of lines.entries()) {
    const [emailRaw, nameRaw, roleRaw] = line.split(",").map((c) => c?.trim());
    if (index === 0 && emailRaw?.toLowerCase() === "email") continue; // capçalera opcional

    const email = emailRaw?.toLowerCase();
    if (!email || !email.includes("@")) {
      if (line) {
        result.skipped++;
        result.errors.push(`Linia ${index + 1}: correu invalid.`);
      }
      continue;
    }

    const role = VALID_ROLES.includes(roleRaw?.toUpperCase() as Role)
      ? (roleRaw.toUpperCase() as Role)
      : "STUDENT";

    await prisma.user.upsert({
      where: { email },
      update: { schoolId },
      create: { email, name: nameRaw || email.split("@")[0], role, schoolId },
    });
    result.created++;
  }

  revalidatePath("/school");
  return result;
}

export async function createClassGroup(formData: FormData) {
  const user = await requireCoordinator();

  const name = String(formData.get("name") || "").trim();
  const gradeLevel = String(formData.get("gradeLevel") || "").trim();
  const teacherId = String(formData.get("teacherId") || "") || null;

  if (!name || !gradeLevel) return;

  await prisma.classGroup.create({
    data: { name, gradeLevel, schoolId: user.schoolId as string, teacherId },
  });
  revalidatePath("/school");
}

export async function assignStudentToClass(formData: FormData) {
  await requireCoordinator();

  const studentId = String(formData.get("studentId") || "");
  const classGroupId = String(formData.get("classGroupId") || "") || null;
  if (!studentId) return;

  await prisma.user.update({ where: { id: studentId }, data: { classGroupId } });
  revalidatePath("/school");
}

export async function updateNeePresets(formData: FormData) {
  const user = await requireCoordinator();

  const neePresets = {
    dyslexicFontDefault: formData.get("dyslexicFontDefault") === "on",
    highContrastDefault: formData.get("highContrastDefault") === "on",
    tdahPacingDefault: formData.get("tdahPacingDefault") === "on",
  };

  await prisma.school.update({ where: { id: user.schoolId as string }, data: { neePresets } });
  revalidatePath("/school");
}
