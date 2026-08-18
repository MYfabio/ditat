/**
 * Dona codi d'accés als grups classe que es van crear abans que existís
 * aquesta funció. Sense codi, el docent no té res per compartir amb la classe.
 *
 * Ús:  node scripts/backfill-join-codes.mjs
 */
import { PrismaClient } from "@prisma/client";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const generate = (n = 6) =>
  Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

const prisma = new PrismaClient();

const groups = await prisma.classGroup.findMany({
  where: { joinCode: null },
  select: { id: true, name: true },
});

if (groups.length === 0) {
  console.log("Tots els grups ja tenen codi.");
} else {
  for (const g of groups) {
    let code = generate();
    while (await prisma.classGroup.findUnique({ where: { joinCode: code } })) {
      code = generate();
    }
    await prisma.classGroup.update({ where: { id: g.id }, data: { joinCode: code } });
    console.log(`${g.name}: ${code}`);
  }
}

await prisma.$disconnect();
