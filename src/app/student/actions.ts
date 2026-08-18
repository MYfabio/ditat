"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { normaliseJoinCode } from "@/lib/join-code";

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
