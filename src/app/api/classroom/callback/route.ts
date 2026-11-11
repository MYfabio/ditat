import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import {
  CLASSROOM_SCOPES,
  STATE_COOKIE,
  emailFromIdToken,
  exchangeCode,
  publicOrigin,
  saveConnection,
  verifyState,
} from "@/lib/classroom";

/**
 * Tornada de Google despres del consentiment de Classroom. Sempre acaba a
 * /teacher/grups amb ?classroom=<estat>, que es on el docent veura que ha
 * passat; els motius d'error no porten mai dades personals.
 */
export async function GET(req: NextRequest) {
  const origin = publicOrigin(req.headers, req.url);
  const back = (estat: string) => {
    const res = NextResponse.redirect(new URL(`/teacher/grups?classroom=${estat}`, origin));
    res.cookies.set(STATE_COOKIE, "", { path: "/api/classroom", maxAge: 0 });
    return res;
  };

  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login?callbackUrl=/teacher/grups", origin));
  }

  const raw = verifyState(req.cookies.get(STATE_COOKIE)?.value);
  if (!raw) return back("error");

  let saved: { state?: string; verifier?: string; userId?: string };
  try {
    saved = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    return back("error");
  }
  if (saved.userId !== session.user.id || !saved.state || !saved.verifier) return back("error");

  const params = req.nextUrl.searchParams;
  if (params.get("error")) return back("denegat");
  const code = params.get("code");
  if (!code || params.get("state") !== saved.state) return back("error");

  const tokens = await exchangeCode({ origin, code, verifier: saved.verifier });
  if (!tokens?.access_token) return back("error");

  // Ha de ser el mateix compte amb que ha entrat a dictats.cat: si no, es
  // podria lligar el Classroom d'una altra persona al propi usuari.
  const email = emailFromIdToken(tokens.id_token);
  if (!email || email !== session.user.email?.toLowerCase()) return back("compte-diferent");

  // A la pantalla de consentiment es poden desmarcar permisos. Sense cursos i
  // alumnat no hi ha res a importar; sense correus s'importa pero no es pot
  // lligar ningu, i val mes dir-ho ara.
  const granted = new Set((tokens.scope ?? "").split(" "));
  const [cursos, alumnat, correus] = CLASSROOM_SCOPES;
  if (!granted.has(cursos) || !granted.has(alumnat)) return back("permisos");

  try {
    await saveConnection(session.user.id, tokens);
  } catch (err) {
    console.error("[classroom] no s'ha pogut desar la connexio:", (err as Error).message);
    return back("error");
  }
  console.info(`[classroom] connectat user=${session.user.id}`);
  return back(granted.has(correus) ? "ok" : "sense-correus");
}
