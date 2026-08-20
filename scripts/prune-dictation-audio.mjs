/**
 * Allibera espai esborrant les locucions que fa dies que ningú no escolta.
 *
 * L'àudio és cache, no dada: el dictat manté el text, el curs, la regla i les
 * correccions ja fetes. Si algú torna a obrir un dictat antic, la veu es torna
 * a generar sola al primer "Escoltar".
 *
 *   node scripts/prune-dictation-audio.mjs           # informe, no esborra res
 *   node scripts/prune-dictation-audio.mjs --dies=30 --esborra
 */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const dies = Number(args.find((a) => a.startsWith("--dies="))?.split("=")[1] ?? 30);
const esborra = args.includes("--esborra");
const limit = new Date(Date.now() - dies * 24 * 60 * 60 * 1000);

const mb = (n) => (Number(n) / 1024 / 1024).toFixed(1);

const [{ files, bytes }] = await prisma.$queryRaw`
  SELECT COUNT(*)::int AS files, COALESCE(SUM(LENGTH(data)), 0)::bigint AS bytes
  FROM "DictationAudio"`;
console.log(`Locucions desades: ${files} (${mb(bytes)} MB)`);

const antigues = await prisma.dictationAudio.findMany({
  where: { lastUsedAt: { lt: limit } },
  select: { dictationId: true, lastUsedAt: true, dictation: { select: { title: true } } },
});
console.log(`Sense escoltar des de fa mes de ${dies} dies: ${antigues.length}`);
for (const a of antigues) {
  console.log(` - ${a.dictation.title} (${a.lastUsedAt.toISOString().slice(0, 10)})`);
}

if (!antigues.length) {
  console.log("\nNo hi ha res a esborrar.");
} else if (!esborra) {
  console.log("\nAixo es nomes un informe. Afegeix --esborra per fer-ho de debo.");
} else {
  const { count } = await prisma.dictationAudio.deleteMany({
    where: { lastUsedAt: { lt: limit } },
  });
  console.log(`\nEsborrades ${count} locucions. Els dictats es conserven sencers.`);
}

await prisma.$disconnect();
