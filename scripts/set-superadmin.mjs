/**
 * Assigna el rol SUPERADMIN a un usuari existent.
 *
 * Ús:  node scripts/set-superadmin.mjs correu@centre.org
 *
 * El primer superadministrador s'ha de crear així: qualsevol persona que entri
 * per SSO es crea amb el rol STUDENT, i no hi ha cap pantalla que permeti
 * apujar-se el rol a un mateix (seria un forat de seguretat evident).
 */
import { PrismaClient } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Cal indicar el correu: node scripts/set-superadmin.mjs correu@centre.org");
  process.exit(1);
}

const prisma = new PrismaClient();

const existing = await prisma.user.findUnique({
  where: { email },
  select: { email: true, name: true, role: true },
});

if (!existing) {
  console.error(`No hi ha cap usuari amb el correu ${email}. Ha d'haver entrat almenys un cop.`);
  await prisma.$disconnect();
  process.exit(1);
}

if (existing.role === "SUPERADMIN") {
  console.log(`${email} ja és SUPERADMIN.`);
} else {
  const updated = await prisma.user.update({
    where: { email },
    data: { role: "SUPERADMIN" },
    select: { email: true, name: true, role: true },
  });
  console.log(`Rol canviat: ${existing.role} -> ${updated.role} (${updated.name})`);
}

await prisma.$disconnect();
