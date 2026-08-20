/**
 * Allibera espai esborrant les fotos dels dictats ja corregits.
 *
 * A diferencia de la locucio, la foto NO es cache: no es pot tornar a generar.
 * El que es conserva sencer es la correccio — el text llegit, els errors, les
 * explicacions i el perfil de l'alumne. El que es perd es poder tornar a veure
 * les marques dibuixades sobre la seva lletra.
 *
 * Per aixo el termini per defecte es llarg: la foto ha fet la seva feina quan
 * l'alumne ja ha vist el dictat corregit, i guardar la cal·ligrafia d'un menor
 * mes enlla d'aixo no aporta res.
 *
 *   node scripts/prune-submission-photos.mjs            # informe, no esborra res
 *   node scripts/prune-submission-photos.mjs --dies=60 --esborra
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const dies = Number(args.find((a) => a.startsWith("--dies="))?.split("=")[1] ?? 60);
const esborra = args.includes("--esborra");
const limit = new Date(Date.now() - dies * 24 * 60 * 60 * 1000);

const mb = (n) => (Number(n) / 1024 / 1024).toFixed(1);

const [{ fotos, bytes }] = await prisma.$queryRaw`
  SELECT COUNT(*)::int AS fotos, COALESCE(SUM(LENGTH("photoUrl")), 0)::bigint AS bytes
  FROM "Submission" WHERE "photoUrl" IS NOT NULL`;
console.log(`Fotos desades: ${fotos} (${mb(bytes)} MB)`);

// Nomes les entregues ja corregides: si encara no s'ha avaluat, la foto es
// l'unic que hi ha de la feina de l'alumne.
const criteri = {
  photoUrl: { not: null },
  createdAt: { lt: limit },
  status: { in: ["EVALUATED", "REVIEWED"] },
};

const antigues = await prisma.submission.findMany({
  where: criteri,
  select: {
    id: true,
    createdAt: true,
    student: { select: { name: true, email: true } },
    dictation: { select: { title: true } },
  },
});
console.log(`Corregides fa mes de ${dies} dies: ${antigues.length}`);
for (const s of antigues) {
  const qui = s.student.name || s.student.email;
  console.log(` - ${qui}: ${s.dictation.title} (${s.createdAt.toISOString().slice(0, 10)})`);
}

if (!antigues.length) {
  console.log("\nNo hi ha res a esborrar.");
} else if (!esborra) {
  console.log("\nAixo es nomes un informe. Afegeix --esborra per fer-ho de debo.");
} else {
  // Nomes es buida la foto: l'entrega, la nota i la correccio es queden.
  const { count } = await prisma.submission.updateMany({
    where: criteri,
    data: { photoUrl: null },
  });
  console.log(`\nEsborrades ${count} fotos. Les correccions es conserven senceres.`);
}

await prisma.$disconnect();
