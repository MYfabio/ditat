import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Serveix la foto d'una entrega, per poder-hi dibuixar les correccions a sobre.
 *
 * Va per aquí i no incrustada a la pàgina pel mateix motiu que la locució: el
 * llistat d'entregues del docent no ha d'arrossegar totes les fotos de la
 * classe per ensenyar només noms i puntuacions.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user) return new NextResponse(null, { status: 401 });

  const submission = await prisma.submission
    .findUnique({
      where: { id },
      select: {
        photoUrl: true,
        studentId: true,
        dictation: { select: { teacherId: true } },
      },
    })
    .catch(() => null);
  if (!submission?.photoUrl) return new NextResponse(null, { status: 404 });

  // La lletra d'un alumne només la veuen ell mateix i el docent que li ha
  // posat el dictat.
  const user = session.user;
  const allowed =
    user.role === "SUPERADMIN" ||
    submission.studentId === user.id ||
    submission.dictation.teacherId === user.id;
  if (!allowed) return new NextResponse(null, { status: 403 });

  // La foto es desa com a data URL: es torna a passar a binari per no enviar
  // el 33% de més que costa el base64.
  const match = submission.photoUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return new NextResponse(null, { status: 404 });
  const [, mimeType, base64] = match;

  return new NextResponse(new Uint8Array(Buffer.from(base64, "base64")), {
    headers: {
      "Content-Type": mimeType,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
