import { NextResponse } from "next/server";
import { auth } from "@/auth";

const roleRoutes: Record<string, string> = {
  "/admin": "SUPERADMIN",
  "/school": "SCHOOL_COORD",
  "/teacher": "TEACHER",
  "/student": "STUDENT",
};

export default auth((req) => {
  const { nextUrl } = req;
  const matchedPrefix = Object.keys(roleRoutes).find((prefix) =>
    nextUrl.pathname.startsWith(prefix)
  );

  if (!matchedPrefix) return NextResponse.next();

  if (!req.auth) {
    const loginUrl = new URL("/login", nextUrl.origin);
    // Cal conservar la query, no només el camí: l'enllaç que el docent
    // comparteix amb la classe porta el codi a ?codi=..., i qui hi arriba
    // encara no ha iniciat sessió. Sense això, el codi es perdia pel camí i
    // l'alumne acabava havent-lo d'escriure a mà.
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  const requiredRole = roleRoutes[matchedPrefix];
  const userRole = req.auth.user?.role;
  if (userRole !== requiredRole && userRole !== "SUPERADMIN") {
    return NextResponse.redirect(new URL("/", nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/school/:path*", "/teacher/:path*", "/student/:path*"],
};
