import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  STATE_COOKIE,
  buildAuthUrl,
  classroomConfigured,
  pkcePair,
  publicOrigin,
  signState,
} from "@/lib/classroom";

/**
 * Comenca el consentiment incremental de Google Classroom (nomes lectura).
 * Nomes per a docents amb sessio: l'estat viatja signat dins d'una cookie
 * HttpOnly, amb PKCE, i lliga el flux a l'usuari que l'ha comencat.
 */
export async function GET(req: NextRequest) {
  const origin = publicOrigin(req.headers, req.url);
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login?callbackUrl=/teacher/grups", origin));
  }
  if (session.user.role !== "TEACHER" && session.user.role !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }
  if (!classroomConfigured()) {
    return NextResponse.redirect(new URL("/teacher/grups?classroom=no-config", origin));
  }

  const state = crypto.randomBytes(24).toString("base64url");
  const { verifier, challenge } = pkcePair();
  const payload = Buffer.from(
    JSON.stringify({ state, verifier, userId: session.user.id }),
  ).toString("base64url");

  const res = NextResponse.redirect(
    buildAuthUrl({ origin, state, codeChallenge: challenge, loginHint: session.user.email }),
  );
  res.cookies.set(STATE_COOKIE, signState(payload), {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    // Nomes cal a la tornada: no viatja amb cap altra peticio.
    path: "/api/classroom",
    maxAge: 600,
  });
  return res;
}
