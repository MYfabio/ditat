"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { type NeedsProfile } from "@/lib/needs-profile";

/** Comprova que qui fa l'acció té aquest alumne a classe. */
async function requireOwnStudent(studentId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("No autoritzat.");

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: { classGroup: true },
  });
  if (!student || student.role !== "STUDENT") throw new Error("Alumne/a no trobat.");

  const allowed =
    student.classGroup?.teacherId === session.user.id ||
    session.user.role === "SUPERADMIN" ||
    (session.user.role === "SCHOOL_COORD" && student.schoolId === session.user.schoolId);

  if (!allowed) throw new Error("Aquest alumne/a no és del teu grup.");
  return student;
}

/** Treu l'alumne del grup sense esborrar-lo: continua existint i conserva l'historial. */
export async function removeStudentFromGroup(formData: FormData) {
  const studentId = String(formData.get("studentId") || "");
  if (!studentId) return;
  await requireOwnStudent(studentId);

  await prisma.user.update({ where: { id: studentId }, data: { classGroupId: null } });
  revalidatePath("/teacher");
}

/**
 * Esborra l'alumne del tot. S'emporta les seves entregues, les correccions i
 * el seu perfil d'aprenentatge: no es pot desfer.
 */
export async function deleteStudent(formData: FormData) {
  const studentId = String(formData.get("studentId") || "");
  if (!studentId) return;
  await requireOwnStudent(studentId);

  await prisma.user.delete({ where: { id: studentId } });
  revalidatePath("/teacher");
}

/**
 * Esborra un grup classe. L'alumnat no s'esborra: es queda sense grup. Els
 * dictats que s'hi havien assignat es conserven, però deixen d'estar lligats
 * a cap grup.
 */
export async function deleteClassGroup(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autoritzat.");

  const classGroupId = String(formData.get("classGroupId") || "");
  if (!classGroupId) return;

  const group = await prisma.classGroup.findUnique({
    where: { id: classGroupId },
    select: { id: true, teacherId: true, schoolId: true },
  });
  if (!group) return;

  const allowed =
    group.teacherId === session.user.id ||
    session.user.role === "SUPERADMIN" ||
    (session.user.role === "SCHOOL_COORD" && group.schoolId === session.user.schoolId);
  if (!allowed) throw new Error("Aquest grup no és teu.");

  await prisma.classGroup.delete({ where: { id: classGroupId } });
  revalidatePath("/teacher");
  revalidatePath("/school");
}

/**
 * Desa les adaptacions NEE d'un alumne concret. Només el docent que el té a
 * classe (o un superadmin) hi pot tocar: són dades sensibles de l'alumne.
 */
export async function updateStudentNeeds(studentId: string, needs: NeedsProfile) {
  const session = await auth();
  if (!session?.user) throw new Error("No autoritzat.");

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: { classGroup: true },
  });
  if (!student || student.role !== "STUDENT") throw new Error("Alumne/a no trobat.");

  const isTheirTeacher = student.classGroup?.teacherId === session.user.id;
  const isSuperadmin = session.user.role === "SUPERADMIN";
  const isTheirCoordinator =
    session.user.role === "SCHOOL_COORD" && student.schoolId === session.user.schoolId;

  if (!isTheirTeacher && !isSuperadmin && !isTheirCoordinator) {
    throw new Error("Només el docent del grup pot canviar aquestes adaptacions.");
  }

  await prisma.user.update({
    where: { id: studentId },
    data: {
      needsProfile: {
        dyslexiaSupport: needs.dyslexiaSupport,
        highContrast: needs.highContrast,
        tdahPacing: needs.tdahPacing,
        ...(needs.notes ? { notes: needs.notes } : {}),
        // Marca de temps del canvi. L'alumne pot ajustar-se les ajudes al seu
        // dispositiu, però si el docent les torna a tocar més tard, mana el
        // docent: si no, un alumne que hagués tocat els controls un sol cop no
        // tornaria a rebre mai cap canvi.
        updatedAt: new Date().toISOString(),
      },
    },
  });

  revalidatePath("/teacher");
  revalidatePath("/student");
}
