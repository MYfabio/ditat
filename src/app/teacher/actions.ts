"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { type NeedsProfile } from "@/lib/needs-profile";
import { Prisma } from "@prisma/client";
import { generateJoinCode } from "@/lib/join-code";
import { isKnownSkill } from "@/lib/skill-taxonomy";
import { refreshLearningProfile } from "@/lib/adaptive-dictations";

/** Busca un codi que no estigui ja en ús. */
async function freeJoinCode() {
  for (let i = 0; i < 10; i++) {
    const code = generateJoinCode();
    const taken = await prisma.classGroup.findUnique({ where: { joinCode: code } });
    if (!taken) return code;
  }
  // Amb 31^6 combinacions això no hauria de passar mai; si passa, s'allarga.
  return generateJoinCode(8);
}

/**
 * Torna a generar el codi d'un grup. Serveix quan un codi s'ha escampat més
 * del compte i s'hi apunta qui no toca: el codi vell deixa de funcionar a
 * l'instant, sense tocar qui ja hi és.
 */
export async function regenerateJoinCode(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autoritzat.");

  const classGroupId = String(formData.get("classGroupId") || "");
  if (!classGroupId) return;

  const group = await prisma.classGroup.findUnique({
    where: { id: classGroupId },
    select: { teacherId: true, schoolId: true },
  });
  if (!group) return;

  const allowed =
    group.teacherId === session.user.id ||
    session.user.role === "SUPERADMIN" ||
    (session.user.role === "SCHOOL_COORD" && group.schoolId === session.user.schoolId);
  if (!allowed) throw new Error("Aquest grup no és teu.");

  await prisma.classGroup.update({
    where: { id: classGroupId },
    data: { joinCode: await freeJoinCode() },
  });
  revalidatePath("/teacher");
}

/**
 * Un docent crea el seu propi grup classe, del qual queda com a tutor.
 * Abans això només es podia fer des de coordinació, i un docent que volgués
 * començar a fer servir l'aplicació es quedava bloquejat esperant que algú
 * altre li creés el grup.
 */
export async function createOwnClassGroup(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autoritzat.");
  if (session.user.role !== "TEACHER" && session.user.role !== "SUPERADMIN") {
    throw new Error("Només el professorat pot crear grups classe.");
  }
  if (!session.user.schoolId) {
    throw new Error("Encara no tens cap centre assignat. Parla amb la coordinació.");
  }

  const name = String(formData.get("name") || "").trim();
  const gradeLevel = String(formData.get("gradeLevel") || "").trim();
  if (!name || !gradeLevel) return;

  await prisma.classGroup.create({
    data: {
      name,
      gradeLevel,
      schoolId: session.user.schoolId,
      teacherId: session.user.id,
      joinCode: await freeJoinCode(),
    },
  });

  revalidatePath("/teacher");
  revalidatePath("/school");
}

/** Afegeix al grup del docent un alumne que ja existeix al seu centre. */
export async function addStudentToOwnGroup(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autoritzat.");

  const studentId = String(formData.get("studentId") || "");
  const classGroupId = String(formData.get("classGroupId") || "");
  if (!studentId || !classGroupId) return;

  const [group, student] = await Promise.all([
    prisma.classGroup.findUnique({
      where: { id: classGroupId },
      select: { id: true, teacherId: true, schoolId: true },
    }),
    prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true, schoolId: true },
    }),
  ]);

  if (!group || !student || student.role !== "STUDENT") return;
  // El grup ha de ser seu i l'alumne, del mateix centre.
  if (group.teacherId !== session.user.id && session.user.role !== "SUPERADMIN") {
    throw new Error("Aquest grup no és teu.");
  }
  if (student.schoolId !== group.schoolId) {
    throw new Error("Aquest alumne/a no és del teu centre.");
  }

  await prisma.user.update({ where: { id: studentId }, data: { classGroupId } });
  revalidatePath("/teacher");
}

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

/**
 * El docent esmena una classificacio de la IA.
 *
 * L'esmena s'aplica sobre la correccio desada perque tingui efecte de seguida
 * a tot arreu (perfil, marques sobre la foto, panells), i alhora es registra
 * a TeacherOverride perque quedi constancia de qui la va fer i per que. La
 * paraula del docent val mes que la del model, pero ha de quedar clar que la
 * va dir una persona.
 */
export async function overrideErrorClassification(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("No autoritzat.");

  const submissionId = String(formData.get("submissionId") || "");
  const errorIndex = Number(formData.get("errorIndex"));
  const action = String(formData.get("action") || "");
  const newSkill = String(formData.get("newSkill") || "") || null;
  const reason = String(formData.get("reason") || "").trim();

  if (!submissionId || !Number.isInteger(errorIndex) || errorIndex < 0) return;
  if (action !== "invalidar" && action !== "reclassificar") return;
  if (!reason) throw new Error("Cal dir per què es canvia la correcció.");
  if (action === "reclassificar" && (!newSkill || !isKnownSkill(newSkill))) {
    throw new Error("L'habilitat triada no és del catàleg.");
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      studentId: true,
      correctedData: true,
      dictation: { select: { teacherId: true } },
      student: { select: { schoolId: true } },
    },
  });
  if (!submission) return;

  const allowed =
    session.user.role === "SUPERADMIN" ||
    submission.dictation.teacherId === session.user.id ||
    (session.user.role === "SCHOOL_COORD" &&
      submission.student.schoolId === session.user.schoolId);
  if (!allowed) throw new Error("Només el docent del dictat pot esmenar-ne la correcció.");

  const corrected = (submission.correctedData ?? {}) as Prisma.JsonObject;
  const stored = corrected.errors;
  const errors = Array.isArray(stored) ? [...stored] : [];
  const target = errors[errorIndex];
  if (!target) return;

  const error = target as Prisma.JsonObject;
  const previousSkill = typeof error.skill === "string" ? error.skill : null;

  errors[errorIndex] = {
    ...error,
    ...(action === "invalidar"
      ? { countForLearning: false, skill: null }
      : { skill: newSkill, countForLearning: true }),
    // Qui mira aquesta correccio mes endavant ha de veure d'un cop d'ull que
    // aqui hi va intervenir una persona.
    overriddenByTeacher: true,
  };

  await prisma.submission.update({
    where: { id: submissionId },
    data: { correctedData: { ...corrected, errors } },
  });

  await prisma.teacherOverride.create({
    data: {
      submissionId,
      teacherId: session.user.id,
      errorIndex,
      action,
      newSkill: action === "reclassificar" ? newSkill : null,
      previousSkill,
      reason,
    },
  });

  // El perfil s'ha de tornar a calcular: aquesta errada ja no diu el mateix.
  await refreshLearningProfile(submission.studentId).catch(() => null);

  revalidatePath("/teacher");
  revalidatePath("/student");
}
