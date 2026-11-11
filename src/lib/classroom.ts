import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

/**
 * Google Classroom, NOMES LECTURA (estandard aulaia).
 *
 * L'acces a dictats.cat (Auth.js) no demana mai cap permis de Classroom: el
 * docent l'autoritza a part, quan vol, amb un consentiment incremental que
 * nomes demana llegir els seus cursos i l'alumnat. Els tokens es guarden
 * xifrats i no s'escriu mai res a Classroom.
 *
 * Aquest modul nomes s'ha d'importar des del servidor (accions i rutes).
 */

export const CLASSROOM_SCOPES = [
  "https://www.googleapis.com/auth/classroom.courses.readonly",
  "https://www.googleapis.com/auth/classroom.rosters.readonly",
  // Sense aquest, Classroom retorna l'alumnat sense correu, i el correu es
  // l'unica manera de lligar cada alumne amb el compte amb que entrara.
  "https://www.googleapis.com/auth/classroom.profile.emails",
] as const;

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke";
const CLASSROOM_API = "https://classroom.googleapis.com/v1";

export const STATE_COOKIE = "dictats_classroom_oauth";

export function classroomConfigured() {
  return !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;
}

// ---------------------------------------------------------------------------
// Xifrat en repos
// ---------------------------------------------------------------------------

/**
 * Clau AES-256. Si hi ha CLASSROOM_TOKEN_KEY (64 hex) es fa servir tal qual;
 * si no, es deriva d'AUTH_SECRET, que ja es un secret que no viu a la base de
 * dades. Canviar AUTH_SECRET invalida les connexions: els docents hauran de
 * tornar a connectar Classroom, res mes.
 */
function encryptionKey(): Buffer {
  const hex = process.env.CLASSROOM_TOKEN_KEY;
  if (hex && /^[0-9a-f]{64}$/i.test(hex)) return Buffer.from(hex, "hex");
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no definida");
  return crypto.createHash("sha256").update(`dictats.classroom.v1:${secret}`).digest();
}

/** Format: base64url(iv || tag || xifrat). */
export function encryptToken(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64url");
}

export function decryptToken(stored: string): string {
  const buf = Buffer.from(stored, "base64url");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

// ---------------------------------------------------------------------------
// Flux OAuth (state signat + PKCE)
// ---------------------------------------------------------------------------

function hmac(value: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET no definida");
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

export function signState(value: string): string {
  return `${value}.${hmac(value)}`;
}

export function verifyState(signed: string | undefined): string | null {
  if (!signed) return null;
  const idx = signed.lastIndexOf(".");
  if (idx <= 0) return null;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = hmac(value);
  if (mac.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected)) ? value : null;
}

/**
 * Origen public de la peticio. No es pot fer servir AUTH_URL: en produccio
 * apunta a l'adreca de Railway, no a www.dictats.cat, i Google ha de tornar
 * exactament a l'origen des d'on s'ha comencat (la cookie d'estat viu alla).
 */
export function publicOrigin(headers: Headers, fallbackUrl: string): string {
  const host =
    headers.get("x-forwarded-host")?.split(",")[0]?.trim() || headers.get("host")?.trim();
  if (!host) return new URL(fallbackUrl).origin;
  const proto =
    headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
    (/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

export function redirectUri(origin: string) {
  return `${origin}/api/classroom/callback`;
}

export function pkcePair() {
  const verifier = crypto.randomBytes(48).toString("base64url");
  const challenge = crypto.createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildAuthUrl(opts: {
  origin: string;
  state: string;
  codeChallenge: string;
  loginHint?: string | null;
}) {
  const params = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_ID ?? "",
    redirect_uri: redirectUri(opts.origin),
    response_type: "code",
    // openid + email nomes per comprovar que es el mateix compte amb que ha
    // entrat: no volem lligar el Classroom d'una altra persona.
    scope: `openid email ${CLASSROOM_SCOPES.join(" ")}`,
    state: opts.state,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
    // Sense access_type=offline no hi ha refresh_token, i la connexio
    // caducaria al cap d'una hora. prompt=consent garanteix que Google el
    // torni a emetre encara que ja ho hagues fet abans.
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
  });
  if (opts.loginHint) params.set("login_hint", opts.loginHint);
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export type GoogleTokens = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
};

export async function exchangeCode(opts: {
  origin: string;
  code: string;
  verifier: string;
}): Promise<GoogleTokens | null> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      code: opts.code,
      code_verifier: opts.verifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri(opts.origin),
    }),
  });
  if (!res.ok) {
    console.error("[classroom] intercanvi de codi fallit:", res.status);
    return null;
  }
  return (await res.json()) as GoogleTokens;
}

/**
 * Correu del token d'identitat. Arriba directament de l'endpoint de tokens de
 * Google per TLS: se'n comprova el contingut (iss/aud/exp), no cal reverificar
 * la signatura.
 */
export function emailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  const parts = idToken.split(".");
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as Record<
      string,
      unknown
    >;
    const iss = claims.iss;
    const exp = claims.exp;
    if (
      (iss !== "https://accounts.google.com" && iss !== "accounts.google.com") ||
      claims.aud !== process.env.AUTH_GOOGLE_ID ||
      typeof exp !== "number" ||
      exp * 1000 < Date.now() ||
      claims.email_verified !== true ||
      typeof claims.email !== "string"
    ) {
      return null;
    }
    return claims.email.toLowerCase();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Connexio desada
// ---------------------------------------------------------------------------

export async function saveConnection(userId: string, tokens: GoogleTokens) {
  if (!tokens.access_token) throw new Error("Sense access_token");
  const expiresAt = new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000);
  const existing = await prisma.googleConnection.findUnique({ where: { userId } });
  await prisma.googleConnection.upsert({
    where: { userId },
    create: {
      userId,
      accessTokenEncrypted: encryptToken(tokens.access_token),
      refreshTokenEncrypted: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
      expiresAt,
      scopes: tokens.scope ?? "",
    },
    update: {
      accessTokenEncrypted: encryptToken(tokens.access_token),
      // Google pot no tornar el refresh_token si ja el tenia emes: es conserva.
      refreshTokenEncrypted: tokens.refresh_token
        ? encryptToken(tokens.refresh_token)
        : existing?.refreshTokenEncrypted ?? null,
      expiresAt,
      scopes: tokens.scope ?? "",
    },
  });
}

export async function isConnected(userId: string) {
  try {
    const row = await prisma.googleConnection.findUnique({ where: { userId }, select: { userId: true } });
    return row !== null;
  } catch {
    return false;
  }
}

export async function grantedScopes(userId: string): Promise<string[]> {
  const row = await prisma.googleConnection.findUnique({ where: { userId }, select: { scopes: true } });
  return row?.scopes.split(" ").filter(Boolean) ?? [];
}

/** Access token valid, refrescant-lo si cal. null vol dir "no connectat". */
export async function freshAccessToken(userId: string): Promise<string | null> {
  const row = await prisma.googleConnection.findUnique({ where: { userId } });
  if (!row) return null;

  const expired = row.expiresAt.getTime() < Date.now() + 60_000;
  if (!expired) return decryptToken(row.accessTokenEncrypted);
  if (!row.refreshTokenEncrypted) return null;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID ?? "",
      client_secret: process.env.AUTH_GOOGLE_SECRET ?? "",
      refresh_token: decryptToken(row.refreshTokenEncrypted),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    // El docent ha revocat el permis des del seu compte de Google, o el token
    // ha caducat per inactivitat: la connexio ja no serveix.
    if (res.status === 400 || res.status === 401) {
      await prisma.googleConnection.delete({ where: { userId } }).catch(() => null);
    }
    return null;
  }
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) return null;
  await prisma.googleConnection.update({
    where: { userId },
    data: {
      accessTokenEncrypted: encryptToken(data.access_token),
      expiresAt: new Date(Date.now() + (data.expires_in ?? 3600) * 1000),
    },
  });
  return data.access_token;
}

/** Desconnecta: revoca el permis a Google (si es pot) i esborra els tokens. */
export async function disconnect(userId: string) {
  const row = await prisma.googleConnection.findUnique({ where: { userId } });
  if (!row) return;
  const token = row.refreshTokenEncrypted
    ? decryptToken(row.refreshTokenEncrypted)
    : decryptToken(row.accessTokenEncrypted);
  await fetch(`${GOOGLE_REVOKE_URL}?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(
    () => null,
  );
  await prisma.googleConnection.delete({ where: { userId } });
}

// ---------------------------------------------------------------------------
// API de Classroom (lectura)
// ---------------------------------------------------------------------------

export type ClassroomCourse = { id: string; name: string; section: string | null };
export type ClassroomStudent = { googleId: string; name: string; email: string | null };

export class ClassroomError extends Error {
  constructor(
    public readonly code: "not_connected" | "google_error" | "not_found",
    message: string,
  ) {
    super(message);
  }
}

async function googleGet<T>(token: string, path: string): Promise<T> {
  const res = await fetch(`${CLASSROOM_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) throw new ClassroomError("not_found", "Curs no trobat a Classroom.");
  if (!res.ok) {
    console.error("[classroom] Google ha respost", res.status, "a", path.split("?")[0]);
    throw new ClassroomError(
      "google_error",
      res.status === 403
        ? "Google no deixa llegir Classroom. Comprova que l'API de Classroom estigui activada al projecte i torna a connectar."
        : "Classroom no ha respost. Torna-ho a provar d'aquí a una estona.",
    );
  }
  return (await res.json()) as T;
}

/** Cursos actius on el docent es professor. */
export async function listCourses(token: string): Promise<ClassroomCourse[]> {
  const out: ClassroomCourse[] = [];
  let pageToken = "";
  do {
    const data = await googleGet<{
      courses?: { id: string; name: string; section?: string }[];
      nextPageToken?: string;
    }>(
      token,
      `/courses?teacherId=me&courseStates=ACTIVE&pageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,
    );
    for (const c of data.courses ?? []) out.push({ id: c.id, name: c.name, section: c.section ?? null });
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  return out.sort((a, b) => a.name.localeCompare(b.name, "ca"));
}

export async function getCourse(token: string, courseId: string): Promise<ClassroomCourse> {
  const c = await googleGet<{ id: string; name: string; section?: string }>(
    token,
    `/courses/${encodeURIComponent(courseId)}`,
  );
  return { id: c.id, name: c.name, section: c.section ?? null };
}

/** Alumnat d'un curs. El correu nomes hi es amb l'scope classroom.profile.emails. */
export async function listCourseStudents(token: string, courseId: string): Promise<ClassroomStudent[]> {
  const out: ClassroomStudent[] = [];
  let pageToken = "";
  do {
    const data = await googleGet<{
      students?: {
        userId: string;
        profile?: { name?: { fullName?: string; givenName?: string; familyName?: string }; emailAddress?: string };
      }[];
      nextPageToken?: string;
    }>(
      token,
      `/courses/${encodeURIComponent(courseId)}/students?pageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,
    );
    for (const s of data.students ?? []) {
      const p = s.profile;
      const name =
        p?.name?.fullName?.trim() ||
        [p?.name?.givenName, p?.name?.familyName].filter(Boolean).join(" ").trim();
      out.push({
        googleId: s.userId,
        name,
        email: p?.emailAddress ? p.emailAddress.trim().toLowerCase() : null,
      });
    }
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  return out;
}
