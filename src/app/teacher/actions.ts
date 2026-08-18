"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { type NeedsProfile } from "@/lib/needs-profile";

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
      },
    },
  });

  revalidatePath("/teacher");
  revalidatePath("/student");
}
