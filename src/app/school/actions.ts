"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import { profileFromSchoolPresets } from "@/lib/needs-profile";

async function requireCoordinator() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "SCHOOL_COORD" && session.user.role !== "SUPERADMIN")) {
    throw new Error("No autoritzat.");
  }
  if (!session.user.schoolId) {
    throw new Error("El teu usuari no té cap escola assignada.");
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

  // Els preajustos del centre només són el punt de partida d'un alumne nou:
  // qui ajusta les adaptacions de cadascú és el seu docent.
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  const defaultNeeds = profileFromSchoolPresets(school?.neePresets);

  for (const [index, line] of lines.entries()) {
    const [emailRaw, nameRaw, roleRaw] = line.split(",").map((c) => c?.trim());
    if (index === 0 && emailRaw?.toLowerCase() === "email") continue; // capçalera opcional

    const email = emailRaw?.toLowerCase();
    if (!email || !email.includes("@")) {
      if (line) {
        result.skipped++;
        result.errors.push(`Línia ${index + 1}: correu invàlid.`);
      }
      continue;
    }

    const role = VALID_ROLES.includes(roleRaw?.toUpperCase() as Role)
      ? (roleRaw.toUpperCase() as Role)
      : "STUDENT";

    await prisma.user.upsert({
      where: { email },
      update: { schoolId },
      create: {
        email,
        name: nameRaw || email.split("@")[0],
        role,
        schoolId,
        ...(role === "STUDENT" ? { needsProfile: { ...defaultNeeds } } : {}),
      },
    });
    result.created++;
  }

  revalidatePath("/school");
  return result;
}

/**
 * Treu un docent del centre: perd l'accés i deixa de tenir grups assignats,
 * però ni ell ni els seus dictats ni les entregues de l'alumnat s'esborren.
 * És el que cal quan algú pleaga o canvia de centre.
 */
/**
 * Canvia el rol d'algu del propi centre entre docent i alumne.
 *
 * Qui entra per SSO sempre es crea com a STUDENT, i fins ara nomes el
 * superadministrador podia arreglar-ho. Aixo volia dir que un centre no podia
 * donar d'alta els seus propis docents sense demanar-ho a fora, quan es
 * justament la feina de la coordinacio.
 *
 * No es pot tocar ni SUPERADMIN ni SCHOOL_COORD: donar-se permisos per sobre
 * dels que un te no pot ser una opcio de pantalla.
 */
export async function updateSchoolUserRole(formData: FormData) {
  const coordinator = await requireCoordinator();

  const userId = String(formData.get("userId") || "");
  const role = String(formData.get("role") || "").toUpperCase() as Role;
  if (!userId || !VALID_ROLES.includes(role)) return;

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, schoolId: true },
  });
  if (!target || target.schoolId !== coordinator.schoolId) return;
  if (!VALID_ROLES.includes(target.role)) return;

  // Un docent no pertany a cap grup com a alumne: si ho era, se'n surt.
  await prisma.user.update({
    where: { id: userId },
    data: { role, ...(role === "TEACHER" ? { classGroupId: null } : {}) },
  });

  revalidatePath("/school");
}

export async function removeTeacherFromSchool(formData: FormData) {
  const coordinator = await requireCoordinator();

  const teacherId = String(formData.get("teacherId") || "");
  if (!teacherId) return;

  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
    select: { id: true, schoolId: true, role: true },
  });
  if (!teacher || teacher.schoolId !== coordinator.schoolId) return;

  // Els seus grups es queden sense tutor, però no s'esborren.
  await prisma.classGroup.updateMany({
    where: { teacherId },
    data: { teacherId: null },
  });
  await prisma.user.update({
    where: { id: teacherId },
    data: { schoolId: null, classGroupId: null },
  });

  revalidatePath("/school");
}

/**
 * Treu un alumne del centre.
 *
 * La coordinacio podia treure docents pero no alumnat, i es justament el cas
 * que passa cada curs: qui es dona de baixa, qui es matricula en un altre
 * centre. Es deixa fora igual que un docent (perd l'acces i el grup) i no
 * s'esborra res del que ha fet: les entregues i les correccions es conserven,
 * perque son l'historial academic del curs.
 */
export async function removeStudentFromSchool(formData: FormData) {
  const coordinator = await requireCoordinator();

  const studentId = String(formData.get("studentId") || "");
  if (!studentId) return;

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, schoolId: true, role: true },
  });
  // Nomes alumnat, i nomes del seu centre: per treure un docent hi ha
  // removeTeacherFromSchool, que a mes allibera els seus grups.
  if (!student || student.schoolId !== coordinator.schoolId) return;
  if (student.role !== "STUDENT") return;

  await prisma.user.update({
    where: { id: studentId },
    data: { schoolId: null, classGroupId: null },
  });

  revalidatePath("/school");
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
