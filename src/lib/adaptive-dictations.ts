import { prisma } from "@/lib/prisma";
import { buildLearningProfile, type LearningProfile } from "@/lib/learning-profile";
import { generateDictationText } from "@/lib/ai/generate-dictation";
import { skillLabel, skillsExpectedAt, TAXONOMY_VERSION } from "@/lib/skill-taxonomy";
import {
  buildSkillState,
  pickNextSkill,
  MASTERY_ALGORITHM_VERSION,
  type SkillAttempt,
  type SkillState,
} from "@/lib/mastery";
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
    include: {
      dictation: { select: { targetRule: true, targetSubskill: true, gradeLevel: true } },
    },
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
    include: {
      dictation: { select: { targetRule: true, targetSubskill: true, gradeLevel: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const gradeLevel = student.classGroup?.gradeLevel ?? "4-primaria";
  const profile = buildLearningProfile(submissions, gradeLevel);

  // L'estat per habilitat es el que decideix que toca practicar. Es desa i no
  // es recalcula al vol perque el motor pugui mirar coses que la puntuacio
  // sola no diu: quant fa que no es toca una habilitat, i amb quina versio de
  // l'algorisme es va mesurar.
  const states = await saveSkillStates(student.id, submissions);

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
        skills: states.map((s) => ({
          skill: s.skill,
          label: skillLabel(s.skill),
          mastery: s.mastery,
          confidence: s.confidence,
          attempts: s.attempts,
        })),
      },
    },
  });

  await preparePersonalisedDictation(
    student.id,
    gradeLevel,
    profile,
    states,
    parseNeedsProfile(student.needsProfile)
  );

  return profile;
}

type SubmissionForSkills = {
  score: number | null;
  createdAt: Date;
  correctedData: unknown;
  dictation: { targetRule: string; targetSubskill: string | null };
};

type StoredError = {
  skill?: string | null;
  countForLearning?: boolean;
};

/** Errors desats d'una entrega, ja classificats per habilitat. */
function readErrors(correctedData: unknown): StoredError[] {
  if (!correctedData || typeof correctedData !== "object") return [];
  const errors = (correctedData as { errors?: unknown }).errors;
  return Array.isArray(errors) ? (errors as StoredError[]) : [];
}

/**
 * Errors que compten: els que l'OCR va llegir prou clars. Les entregues
 * antigues no porten la marca i es donen per bones, que es com es van
 * comptar quan es van corregir.
 */
function countedErrors(correctedData: unknown) {
  return readErrors(correctedData).filter((e) => e.countForLearning !== false);
}

/** A partir de quants cops un error en una habilitat deixa de ser casualitat. */
const RECURRENT_ERROR_THRESHOLD = 2;

/**
 * Recalcula i desa l'estat de cada habilitat de l'alumne.
 *
 * Hi ha dues fonts, i no es barregen:
 *
 * - El domini es mesura nomes en l'habilitat que el dictat treballava, perque
 *   nomes alli sabem quantes oportunitats va tenir d'encertar. Inventar-se un
 *   percentatge per a una habilitat que potser sortia dues vegades al text
 *   seria posar-li un numero a una cosa que no s'ha mesurat.
 * - Els errors recurrents en altres habilitats si que es desen: no diuen quant
 *   en domina, pero si que hi ha alguna cosa per mirar, i el motor els te en
 *   compte a l'hora de decidir que toca.
 */
async function saveSkillStates(
  studentId: string,
  submissions: SubmissionForSkills[]
): Promise<SkillState[]> {
  const attemptsBySkill = new Map<string, SkillAttempt[]>();
  const strayErrors = new Map<string, { count: number; last: Date }>();

  for (const sub of submissions) {
    if (sub.score === null) continue;
    const practised = sub.dictation.targetSubskill ?? sub.dictation.targetRule;
    const errors = countedErrors(sub.correctedData);

    const attempts = attemptsBySkill.get(practised) ?? [];
    attempts.push({ ratio: sub.score / 100, at: sub.createdAt, errors: errors.length });
    attemptsBySkill.set(practised, attempts);

    // Errors d'una altra regla que la que treballava el dictat: es compten a
    // part, perque no hi ha manera de saber quantes vegades ho hauria pogut
    // encertar.
    for (const error of errors) {
      if (!error.skill || error.skill === practised) continue;
      if (attemptsBySkill.has(error.skill)) continue;
      const seen = strayErrors.get(error.skill) ?? { count: 0, last: sub.createdAt };
      strayErrors.set(error.skill, {
        count: seen.count + 1,
        last: sub.createdAt > seen.last ? sub.createdAt : seen.last,
      });
    }
  }

  const states = [...attemptsBySkill.entries()].map(([skill, attempts]) =>
    buildSkillState(skill, attempts)
  );

  // Una habilitat que nomes te errors solts encara no te domini mesurat: es
  // desa amb confianca zero, que es exactament el que en sabem.
  for (const [skill, seen] of strayErrors) {
    if (seen.count < RECURRENT_ERROR_THRESHOLD) continue;
    if (states.some((s) => s.skill === skill)) continue;
    states.push({
      skill,
      mastery: 0,
      confidence: 0,
      attempts: 0,
      errors: seen.count,
      lastPracticedAt: seen.last,
    });
  }

  for (const state of states) {
    const data = {
      mastery: state.mastery,
      confidence: state.confidence,
      attempts: state.attempts,
      errors: state.errors,
      lastPracticedAt: state.lastPracticedAt,
      algorithmVersion: MASTERY_ALGORITHM_VERSION,
      taxonomyVersion: TAXONOMY_VERSION,
    };
    await prisma.studentSkillState.upsert({
      where: { studentId_skill: { studentId, skill: state.skill } },
      create: { studentId, skill: state.skill, ...data },
      update: data,
    });
  }

  return states;
}

async function preparePersonalisedDictation(
  studentId: string,
  gradeLevel: string,
  profile: LearningProfile,
  states: SkillState[],
  needs: NeedsProfile
) {
  // Quina habilitat toca ara, segons domini, fiabilitat i el que el curriculum
  // ja espera del seu curs. Si encara no hi ha estat, es cau a la regla mes
  // fluixa del perfil, que es com es feia abans.
  const skill = pickNextSkill(states, skillsExpectedAt(gradeLevel)) ?? profile.weakestRule;
  if (!skill) return;

  // El text es genera per a la regla; la subhabilitat afina cap a on, i es el
  // que rebra el resultat d'aquest dictat.
  const targetRule = skill.split(".")[0];
  const targetSubskill = skill.includes(".") ? skill : null;

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
    targetRule,
    targetSubskill,
    neeAdaptation: generationAdaptation(needs),
  });

  const title = `Dictat personalitzat: ${skillLabel(skill)}`;

  if (pending) {
    await prisma.dictation.update({
      where: { id: pending.id },
      data: { title, targetRule, targetSubskill, gradeLevel, rawText: text },
    });
    return;
  }

  const teacherId = teacher?.id ?? (await resolveFallbackTeacher(studentId));
  if (!teacherId) return;

  await prisma.dictation.create({
    data: {
      title,
      targetRule,
      targetSubskill,
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
