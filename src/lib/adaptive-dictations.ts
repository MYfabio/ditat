import { prisma } from "@/lib/prisma";
import { buildLearningProfile, type LearningProfile } from "@/lib/learning-profile";
import { generateDictationText } from "@/lib/ai/generate-dictation";
import { ruleLabel } from "@/lib/dictation-rules";
import {
  parseNeedsProfile,
  generationAdaptation,
  type NeedsProfile,
} from "@/lib/needs-profile";

/**
 * Munta el perfil d'aprenentatge a partir de l'historial, sense desar res.
 *
 * Es fa servir per llegir com estava l'alumne abans de corregir-li un dictat,
 * per poder-li dir despres en que ha millorat.
 */
export async function loadLearningProfile(studentId: string): Promise<LearningProfile | null> {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: { classGroup: true },
  });
  if (!student) return null;

  const submissions = await prisma.submission.findMany({
    where: { studentId },
    include: { dictation: { select: { targetRule: true, gradeLevel: true } } },
    orderBy: { createdAt: "asc" },
  });

  return buildLearningProfile(submissions, student.classGroup?.gradeLevel ?? "4-primaria");
}

/**
 * Recalcula el perfil d'aprenentatge d'un alumne a partir de tot el seu
 * historial, el desa com a ImprovementReport i li deixa preparat el següent
 * dictat personalitzat centrat en la seva regla més fluixa.
 */
export async function refreshLearningProfile(studentId: string): Promise<LearningProfile | null> {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: { classGroup: true },
  });
  if (!student) return null;

  const submissions = await prisma.submission.findMany({
    where: { studentId },
    include: { dictation: { select: { targetRule: true, gradeLevel: true } } },
    orderBy: { createdAt: "asc" },
  });

  const gradeLevel = student.classGroup?.gradeLevel ?? "4-primaria";
  const profile = buildLearningProfile(submissions, gradeLevel);

  await prisma.improvementReport.create({
    data: {
      studentId,
      summaryText: profile.summaryText,
      weaknessMetrics: {
        averageScore: profile.averageScore,
        totalSubmissions: profile.totalSubmissions,
        perRule: profile.perRule,
        weakestRule: profile.weakestRule,
        curriculumProgress: profile.curriculumProgress,
        observations: profile.observations,
      },
    },
  });

  await preparePersonalisedDictation(
    student.id,
    gradeLevel,
    profile,
    parseNeedsProfile(student.needsProfile)
  );

  return profile;
}

async function preparePersonalisedDictation(
  studentId: string,
  gradeLevel: string,
  profile: LearningProfile,
  needs: NeedsProfile
) {
  if (!profile.weakestRule) return;

  // Només hi ha d'haver un dictat personalitzat pendent alhora: si l'anterior
  // encara no s'ha entregat, se substitueix pel nou (més ben orientat).
  const pending = await prisma.dictation.findFirst({
    where: { targetStudentId: studentId, submissions: { none: {} } },
    orderBy: { createdAt: "desc" },
  });

  const teacher = await prisma.user.findFirst({
    where: { taughtClassGroups: { some: { students: { some: { id: studentId } } } } },
  });

  // L'adaptació surt del perfil que ha declarat el docent, no de les
  // observacions automàtiques: detectar un patró no és diagnosticar res.
  const { text } = await generateDictationText({
    gradeLevel,
    targetRule: profile.weakestRule,
    neeAdaptation: generationAdaptation(needs),
  });

  const title = `Dictat personalitzat: ${ruleLabel(profile.weakestRule)}`;

  if (pending) {
    await prisma.dictation.update({
      where: { id: pending.id },
      data: { title, targetRule: profile.weakestRule, gradeLevel, rawText: text },
    });
    return;
  }

  const teacherId = teacher?.id ?? (await resolveFallbackTeacher(studentId));
  if (!teacherId) return;

  await prisma.dictation.create({
    data: {
      title,
      targetRule: profile.weakestRule,
      gradeLevel,
      rawText: text,
      isAIGenerated: true,
      teacherId,
      targetStudentId: studentId,
    },
  });
}

/** Si l'alumne no te tutor assignat, s'atribueix a qualsevol docent del seu centre. */
async function resolveFallbackTeacher(studentId: string) {
  const student = await prisma.user.findUnique({ where: { id: studentId } });
  if (!student?.schoolId) return null;
  const teacher = await prisma.user.findFirst({
    where: { schoolId: student.schoolId, role: "TEACHER" },
  });
  return teacher?.id ?? null;
}
