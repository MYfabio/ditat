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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  // Necessari darrere de proxys com Railway/Fly.io, que no son autodetectats per Auth.js.
  trustHost: true,
  pages: {
    signIn: "/login",
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
    // Proveidor de proves: nomes actiu si no hi ha cap SSO real configurat.
    // Permet provar totes les pantalles i rols sense credencials de Google/Microsoft.
    ...(!hasGoogle && !hasMicrosoft
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
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: Role }).role ?? "STUDENT";
        token.schoolId = (user as { schoolId?: string | null }).schoolId ?? null;
        token.classGroupId = (user as { classGroupId?: string | null }).classGroupId ?? null;
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
