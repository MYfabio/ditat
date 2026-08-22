import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Compta una visita. No guarda res de qui la fa.
 *
 * Nomes s'accepten les pagines publiques de la llista: aixi ningu pot omplir
 * la taula inventant-se rutes, i les pantalles de dins (on hi ha dades de
 * gent) no es compten mai.
 */
const PAGINES = new Set(["/", "/login", "/privacitat"]);

export async function POST(req: Request) {
  let path: string;
  try {
    const cos = (await req.json()) as { path?: unknown };
    path = typeof cos.path === "string" ? cos.path : "";
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!PAGINES.has(path)) return NextResponse.json({ ok: true });

  const ara = new Date();
  const day = new Date(Date.UTC(ara.getUTCFullYear(), ara.getUTCMonth(), ara.getUTCDate()));

  try {
    await prisma.pageView.upsert({
      where: { day_path: { day, path } },
      update: { count: { increment: 1 } },
      create: { day, path, count: 1 },
    });
  } catch {
    // Comptar visites no pot fer caure una pagina: si falla, es perd el numero
    // i prou.
  }
  return NextResponse.json({ ok: true });
}
