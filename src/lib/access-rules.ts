import { prisma } from "@/lib/prisma";

/**
 * Qui pot entrar a dictats.cat.
 *
 * Viu aqui i no dins d'auth.ts perque el formulari de registre ha d'aplicar
 * exactament la mateixa regla que l'inici de sessio. Si fossin dues copies,
 * un dia una de les dues es quedaria enrere i tindriem una porta oberta que
 * ningu no recorda haver obert.
 */

export type AccessDecision =
  | { allowed: true; schoolId: string | null }
  | { allowed: false; reason: "no-school" | "db-down" };

/** Emparellament per domini: el tros que va despres de la @. */
export async function matchSchoolByDomain(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  try {
    return await prisma.school.findUnique({ where: { domain } });
  } catch {
    return null;
  }
}

const SELF_LEARNERS_ALLOWED =
  (process.env.AUTH_ALLOW_SELF_LEARNERS ?? "true").toLowerCase() !== "false";

export async function canAccess(emailRaw: string): Promise<AccessDecision> {
  const email = emailRaw.trim().toLowerCase();
  const domain = email.split("@")[1];

  const allowlist = (process.env.AUTH_ALLOWED_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (domain && allowlist.includes(domain)) {
    const school = await matchSchoolByDomain(email);
    return { allowed: true, schoolId: school?.id ?? null };
  }

  try {
    const [school, existing] = await Promise.all([
      matchSchoolByDomain(email),
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
    ]);
    if (school) return { allowed: true, schoolId: school.id };
    if (existing) return { allowed: true, schoolId: null };
    if (SELF_LEARNERS_ALLOWED) return { allowed: true, schoolId: null };
    return { allowed: false, reason: "no-school" };
  } catch {
    // Sense base de dades no es pot comprovar res: millor no deixar entrar.
    return { allowed: false, reason: "db-down" };
  }
}
