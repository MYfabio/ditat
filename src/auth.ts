import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

const hasGoogle = !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;
const hasMicrosoft =
  !!process.env.AUTH_MICROSOFT_ENTRA_ID_ID && !!process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET;

// L'acces de prova permet triar qualsevol rol (incloent SUPERADMIN) sense
// contrasenya: només pot existir en desenvolupament. En un desplegament públic
// cal activar-lo explícitament amb ALLOW_DEMO_LOGIN=true, i nomes te sentit
// mentre no hi hagi dades reals d'alumnat al sistema.
export const demoLoginEnabled =
  !hasGoogle &&
  !hasMicrosoft &&
  (process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_LOGIN === "true");

// Emparellament per domini: si el correu de l'usuari coincideix amb el domini
// registrat d'una escola, se li assigna automaticament aquesta escola.
async function matchSchoolByDomain(email: string) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  try {
    return await prisma.school.findUnique({ where: { domain } });
  } catch {
    return null;
  }
}

/**
 * Si algu sense centre es pot donar d'alta pel seu compte per preparar-se una
 * certificacio. Un desplegament nomes per a escoles ho pot tancar posant-hi
 * "false".
 */
const SELF_LEARNERS_ALLOWED =
  (process.env.AUTH_ALLOW_SELF_LEARNERS ?? "true").toLowerCase() !== "false";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // Necessari darrere de proxys com Railway/Fly.io, que no son autodetectats per Auth.js.
  trustHost: true,
  pages: {
    signIn: "/login",
    // Sense això, qualsevol errada d'inici de sessió mostra la pantalla per
    // defecte d'Auth.js: "Server error" en anglès i sense dir què cal fer.
    error: "/login",
  },
  providers: [
    ...(hasGoogle
      ? [
          Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
          }),
        ]
      : []),
    ...(hasMicrosoft
      ? [
          MicrosoftEntraID({
            clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
            clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
            issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
          }),
        ]
      : []),
    // Proveïdor de proves: veure el comentari de `demoLoginEnabled`.
    ...(demoLoginEnabled
      ? [
          Credentials({
            id: "dev-mock",
            name: "Acces de prova (sense SSO)",
            credentials: {
              email: { label: "Correu", type: "email" },
              name: { label: "Nom", type: "text" },
              role: { label: "Rol", type: "text" },
            },
            async authorize(credentials) {
              const email = String(credentials?.email ?? "").trim().toLowerCase();
              if (!email) return null;
              const name = String(credentials?.name ?? "").trim() || email.split("@")[0];
              const role = String(credentials?.role ?? "TEACHER").toUpperCase() as Role;

              try {
                const school = await matchSchoolByDomain(email);
                const user = await prisma.user.upsert({
                  where: { email },
                  update: {},
                  create: { email, name, role, schoolId: school?.id ?? null },
                });
                return {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  role: user.role,
                  schoolId: user.schoolId,
                  classGroupId: user.classGroupId,
                };
              } catch {
                // Sense DATABASE_URL configurada: identitat simulada nomes en memoria.
                return { id: `mock-${email}`, email, name, role, schoolId: null, classGroupId: null };
              }
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    /**
     * Qui pot entrar amb SSO. Sense aquest filtre, qualsevol persona amb un
     * compte de Google es podria donar d'alta en un sistema que conté dades
     * de menors. S'hi accepta:
     *   - correus del domini d'un centre registrat,
     *   - usuaris que ja existeixen (importats per CSV o donats d'alta abans),
     *   - dominis autoritzats explícitament (AUTH_ALLOWED_DOMAINS), pensat per
     *     a l'equip que administra la plataforma,
     *   - qualsevol persona que vulgui aprendre pel seu compte, si el desplegament
     *     ho permet (AUTH_ALLOW_SELF_LEARNERS).
     *
     * Aquest últim cas no obre cap porta a les dades de cap centre: qui entra
     * així es queda sense escola i sense grup, i totes les consultes van
     * filtrades per escola, grup o pel propi identificador. El que sí que obre
     * és la porta a donar-se d'alta sense invitació, i per això es pot tancar.
     */
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) return false;

      const domain = email.split("@")[1];
      const allowlist = (process.env.AUTH_ALLOWED_DOMAINS ?? "")
        .split(",")
        .map((d) => d.trim().toLowerCase())
        .filter(Boolean);
      if (domain && allowlist.includes(domain)) return true;

      try {
        const [school, existing] = await Promise.all([
          matchSchoolByDomain(email),
          prisma.user.findUnique({ where: { email }, select: { id: true } }),
        ]);
        if (school || existing) return true;
        if (SELF_LEARNERS_ALLOWED) return true;
        // Auth.js mostra aquest codi a /login?error=...
        return "/login?error=CentreNoRegistrat";
      } catch {
        // Sense base de dades no es pot comprovar res: millor no deixar entrar.
        return false;
      }
    },

    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        token.role = (user as { role?: Role }).role ?? "STUDENT";
        token.schoolId = (user as { schoolId?: string | null }).schoolId ?? null;
        token.classGroupId = (user as { classGroupId?: string | null }).classGroupId ?? null;
      }
      if (!token.id) return token;

      // El token que es construeix en iniciar sessió pot quedar desfasat: amb
      // SSO, l'escola s'assigna just després de crear l'usuari, i el grup
      // classe se sol assignar dies més tard. Mentre falti alguna d'aquestes
      // dades es rellegeix el perfil real; un cop completes, no es torna a
      // consultar la base de dades a cada petició.
      const needsRefresh = !!user || !token.schoolId || !token.classGroupId;
      if (!needsRefresh) return token;

      try {
        let profile = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { id: true, email: true, role: true, schoolId: true, classGroupId: true },
        });
        if (!profile) return token;

        // També empara el cas que el centre es registri després que l'usuari
        // hagi entrat per primer cop.
        if (!profile.schoolId && profile.email) {
          const school = await matchSchoolByDomain(profile.email);
          if (school) {
            profile = await prisma.user.update({
              where: { id: profile.id },
              data: { schoolId: school.id },
              select: { id: true, email: true, role: true, schoolId: true, classGroupId: true },
            });
          }
        }

        token.role = profile.role;
        token.schoolId = profile.schoolId;
        token.classGroupId = profile.classGroupId;
      } catch {
        // Sense base de dades disponible es conserva el que ja tingui el token.
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.schoolId = token.schoolId as string | null;
        session.user.classGroupId = token.classGroupId as string | null;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.email || !user.id) return;
      const school = await matchSchoolByDomain(user.email);
      if (school) {
        await prisma.user.update({ where: { id: user.id }, data: { schoolId: school.id } });
      }
    },
  },
});
