"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { GRADE_LEVELS } from "@/lib/dictation-rules";
import { profileFromSchoolPresets } from "@/lib/needs-profile";
import { freeJoinCode } from "@/lib/join-code-server";
import {
  ClassroomError,
  disconnect,
  freshAccessToken,
  getCourse,
  listCourseStudents,
  listCourses,
} from "@/lib/classroom";
import { revalidaGrups } from "./revalida";

const GRADE_VALUES = new Set<string>(GRADE_LEVELS.map((g) => g.value));

async function requireTeacher() {
  const session = await auth();
  if (!session?.user) throw new Error("No autoritzat.");
  if (session.user.role !== "TEACHER" && session.user.role !== "SUPERADMIN") {
    throw new Error("Només el professorat pot gestionar grups.");
  }
  return session.user;
}

/** Grup propi (o qualsevol, si superadmin). */
async function requireOwnGroup(classGroupId: string) {
  const user = await requireTeacher();
  const group = await prisma.classGroup.findUnique({ where: { id: classGroupId } });
  if (!group) throw new Error("Grup no trobat.");
  if (group.teacherId !== user.id && user.role !== "SUPERADMIN") {
    throw new Error("Aquest grup no és teu.");
  }
  return { user, group };
}

// ---------------------------------------------------------------------------
// Dades del grup
// ---------------------------------------------------------------------------

export async function actualitzaGrup(formData: FormData) {
  const classGroupId = String(formData.get("classGroupId") || "");
  if (!classGroupId) return;
  const { group } = await requireOwnGroup(classGroupId);

  const name = String(formData.get("name") || "").replace(/\s+/g, " ").trim().slice(0, 80);
  const gradeLevel = String(formData.get("gradeLevel") || "").trim();
  if (name.length < 1 || !GRADE_VALUES.has(gradeLevel)) return;

  await prisma.classGroup.update({ where: { id: group.id }, data: { name, gradeLevel } });
  revalidaGrups();
}

// ---------------------------------------------------------------------------
// Google Classroom (nomes lectura)
// ---------------------------------------------------------------------------

export type CursClassroom = {
  id: string;
  name: string;
  section: string | null;
  /** Grup ja creat a partir d'aquest curs, si n'hi ha. */
  importedGroupId: string | null;
  /** El grup existeix pero es d'un altre docent o centre: no es pot tocar. */
  bloquejat: boolean;
};

export type CursosResult =
  | { ok: true; connected: true; courses: CursClassroom[] }
  | { ok: true; connected: false }
  | { ok: false; error: string };

/** Cursos actius del docent a Classroom, llegits al vol: aqui no es desa res. */
export async function llistaCursosClassroom(): Promise<CursosResult> {
  const user = await requireTeacher();
  const token = await freshAccessToken(user.id);
  if (!token) return { ok: true, connected: false };
  try {
    const courses = await listCourses(token);
    const imported = await prisma.classGroup.findMany({
      where: { googleClassroomId: { in: courses.map((c) => c.id) } },
      select: { id: true, googleClassroomId: true, teacherId: true, schoolId: true },
    });
    return {
      ok: true,
      connected: true,
      courses: courses.map((c) => {
        const g = imported.find((x) => x.googleClassroomId === c.id);
        const seu = !g || g.teacherId === user.id || user.role === "SUPERADMIN";
        return {
          ...c,
          importedGroupId: g && seu ? g.id : null,
          bloquejat: !!g && !seu,
        };
      }),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ClassroomError ? err.message : "No s'han pogut llegir els cursos.",
    };
  }
}

export type SyncResult =
  | {
      ok: true;
      groupId: string;
      groupName: string;
      creats: number;
      actualitzats: number;
      jaHiEren: number;
      omesos: string[];
    }
  | { ok: false; error: string };

/**
 * Posa l'alumnat d'un curs de Classroom dins del grup. Mateixes regles que la
 * importacio per CSV de coordinacio: qui no existeix es crea com a alumne del
 * centre; qui ja existeix i es alumne del centre s'assigna al grup. No es toca
 * mai ningu que sigui docent, ni ningu d'un altre centre, i qui ja no surt a
 * Classroom no es treu del grup: aixo ho decideix el docent, no una sincronia.
 */
async function importaAlumnat(
  group: { id: string; schoolId: string; googleClassroomId: string },
  token: string,
) {
  const students = await listCourseStudents(token, group.googleClassroomId);
  const school = await prisma.school.findUnique({ where: { id: group.schoolId } });
  const defaultNeeds = profileFromSchoolPresets(school?.neePresets);

  let creats = 0;
  let actualitzats = 0;
  let jaHiEren = 0;
  const omesos: string[] = [];

  for (const s of students) {
    if (!s.email) {
      omesos.push(`${s.name || "Un alumne/a"}: Classroom no n'ha donat el correu.`);
      continue;
    }
    const existing = await prisma.user.findUnique({
      where: { email: s.email },
      select: { id: true, role: true, schoolId: true, classGroupId: true, name: true },
    });

    if (!existing) {
      await prisma.user.create({
        data: {
          email: s.email,
          name: s.name || s.email.split("@")[0],
          role: "STUDENT",
          schoolId: group.schoolId,
          classGroupId: group.id,
          needsProfile: { ...defaultNeeds },
        },
      });
      creats++;
      continue;
    }
    if (existing.role !== "STUDENT") {
      omesos.push(`${s.email}: ja té un compte de docent o de coordinació.`);
      continue;
    }
    if (existing.schoolId && existing.schoolId !== group.schoolId) {
      omesos.push(`${s.email}: pertany a un altre centre.`);
      continue;
    }
    if (existing.classGroupId === group.id && existing.schoolId === group.schoolId) {
      jaHiEren++;
      continue;
    }
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        schoolId: group.schoolId,
        classGroupId: group.id,
        ...(existing.name ? {} : { name: s.name || undefined }),
      },
    });
    actualitzats++;
  }

  await prisma.classGroup.update({
    where: { id: group.id },
    data: { classroomSyncedAt: new Date() },
  });
  return { creats, actualitzats, jaHiEren, omesos };
}

/** Importa un curs de Classroom com a grup propi (o el reobre si ja existia) i en porta l'alumnat. */
export async function importaCursClassroom(courseId: string, gradeLevel: string): Promise<SyncResult> {
  const user = await requireTeacher();
  if (!user.schoolId) {
    return { ok: false, error: "Encara no tens cap centre assignat. Parla amb la coordinació." };
  }
  if (!courseId) return { ok: false, error: "Curs no vàlid." };
  if (!GRADE_VALUES.has(gradeLevel)) return { ok: false, error: "Tria el curs del grup." };

  const token = await freshAccessToken(user.id);
  if (!token) return { ok: false, error: "Classroom no està connectat." };

  try {
    const course = await getCourse(token, courseId);
    const existing = await prisma.classGroup.findUnique({
      where: { googleClassroomId: course.id },
    });
    if (existing) {
      if (existing.schoolId !== user.schoolId) {
        return { ok: false, error: "Aquest curs ja està importat en un altre centre." };
      }
      if (existing.teacherId && existing.teacherId !== user.id && user.role !== "SUPERADMIN") {
        return { ok: false, error: "Aquest curs ja l'ha importat un altre docent del centre." };
      }
    }

    const googleCourseName = [course.name, course.section].filter(Boolean).join(" · ");
    const group = existing
      ? await prisma.classGroup.update({
          where: { id: existing.id },
          data: { googleCourseName, teacherId: existing.teacherId ?? user.id },
        })
      : await prisma.classGroup.create({
          data: {
            name: course.name.replace(/\s+/g, " ").trim().slice(0, 80) || "Grup de Classroom",
            gradeLevel,
            schoolId: user.schoolId,
            teacherId: user.id,
            joinCode: await freeJoinCode(),
            googleClassroomId: course.id,
            googleCourseName,
          },
        });

    const r = await importaAlumnat(
      { id: group.id, schoolId: group.schoolId, googleClassroomId: course.id },
      token,
    );
    console.info(
      `[classroom] importat curs -> grup=${group.id} user=${user.id} nous=${r.creats} actualitzats=${r.actualitzats} omesos=${r.omesos.length}`,
    );
    revalidaGrups();
    return { ok: true, groupId: group.id, groupName: group.name, ...r };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ClassroomError ? err.message : "No s'ha pogut importar el curs.",
    };
  }
}

/** Torna a llegir l'alumnat d'un grup que ve de Classroom. */
export async function sincronitzaGrupClassroom(classGroupId: string): Promise<SyncResult> {
  const { user, group } = await requireOwnGroup(classGroupId);
  if (!group.googleClassroomId) return { ok: false, error: "Aquest grup no ve de Classroom." };

  const token = await freshAccessToken(user.id);
  if (!token) {
    return { ok: false, error: "Classroom no està connectat. Connecta'l des de la pàgina de grups." };
  }
  try {
    const r = await importaAlumnat(
      { id: group.id, schoolId: group.schoolId, googleClassroomId: group.googleClassroomId },
      token,
    );
    revalidaGrups();
    return { ok: true, groupId: group.id, groupName: group.name, ...r };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof ClassroomError ? err.message : "No s'ha pogut sincronitzar el grup.",
    };
  }
}

/** Revoca el permis a Google i esborra els tokens. Els grups ja importats es queden. */
export async function desconnectaClassroom() {
  const user = await requireTeacher();
  await disconnect(user.id);
  console.info(`[classroom] desconnectat user=${user.id}`);
  revalidatePath("/teacher/grups");
}
