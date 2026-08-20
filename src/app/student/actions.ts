"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normaliseJoinCode } from "@/lib/join-code";
import { isMcerLevel } from "@/lib/dictation-rules";
import { refreshLearningProfile } from "@/lib/adaptive-dictations";

export type JoinResult = { ok: true; groupName: string } | { ok: false; error: string };

/**
 * L'alumne s'apunta a una classe amb el codi que li ha donat el docent.
 *
 * El codi només val dins del propi centre: encara que algú de fora l'aconsegueixi,
 * no hi podrà entrar. I com que per iniciar sessió ja cal ser d'un centre
 * registrat, el codi no obre cap porta nova.
 */
export async function joinClassWithCode(rawCode: string): Promise<JoinResult> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Has d'iniciar sessió." };

  const code = normaliseJoinCode(rawCode);
  if (!code) return { ok: false, error: "Escriu el codi que t'ha donat el teu/a docent." };

  try {
    const group = await prisma.classGroup.findUnique({
      where: { joinCode: code },
      select: { id: true, name: true, schoolId: true },
    });

    if (!group) {
      return { ok: false, error: "Aquest codi no existeix. Comprova'l amb el teu/a docent." };
    }

    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, schoolId: true, role: true },
    });
    if (!me) return { ok: false, error: "No s'ha trobat el teu usuari." };

    if (me.schoolId && me.schoolId !== group.schoolId) {
      return { ok: false, error: "Aquesta classe és d'un altre centre." };
    }

    await prisma.user.update({
      where: { id: me.id },
      // Si encara no tenia centre (per exemple, importat sense assignar), l'hereta del grup.
      data: { classGroupId: group.id, schoolId: me.schoolId ?? group.schoolId },
    });

    revalidatePath("/student");
    revalidatePath("/teacher");
    return { ok: true, groupName: group.name };
  } catch {
    return { ok: false, error: "No s'ha pogut apuntar-te ara mateix. Torna-ho a provar." };
  }
}

/**
 * Qui aprèn pel seu compte tria el nivell que es prepara.
 *
 * Nomes te sentit sense grup classe: si algu es d'un grup, el nivell el marca
 * el curs del centre i no se l'ha de poder canviar ell mateix.
 */
export async function setLearningLevel(level: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Has d'iniciar sessió." };
  if (!isMcerLevel(level)) return { ok: false, error: "Aquest nivell no existeix." };

  try {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { classGroupId: true },
    });
    if (me?.classGroupId) {
      return { ok: false, error: "El teu nivell surt del curs del teu grup classe." };
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { learningLevel: level },
    });
    revalidatePath("/student");
    return { ok: true };
  } catch {
    return { ok: false, error: "No s'ha pogut desar el nivell." };
  }
}

/**
 * Qui aprèn pel seu compte es genera el seguent dictat.
 *
 * Sense docent no hi ha ningu que li'n posi cap, aixi que el demana ell. El
 * text el tria el mateix motor adaptatiu que fa servir amb un grup: surt de la
 * seva habilitat mes fluixa, no d'una llista qualsevol.
 */
export async function requestOwnDictation(): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Has d'iniciar sessió." };

  try {
    const me = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { classGroupId: true, learningLevel: true },
    });
    if (me?.classGroupId) {
      return { ok: false, error: "Els dictats te'ls posa el teu docent." };
    }
    if (!me?.learningLevel) {
      return { ok: false, error: "Tria primer quin nivell et prepares." };
    }

    // Ja en te un de pendent: val mes acabar-lo que acumular-ne.
    const pending = await prisma.dictation.findFirst({
      where: { targetStudentId: session.user.id, submissions: { none: {} } },
      select: { id: true },
    });
    if (pending) return { ok: false, error: "Ja tens un dictat per fer." };

    const profile = await refreshLearningProfile(session.user.id);
    if (!profile) return { ok: false, error: "No s'ha pogut preparar el dictat." };

    revalidatePath("/student");
    return { ok: true };
  } catch {
    return { ok: false, error: "No s'ha pogut preparar el dictat." };
  }
}
