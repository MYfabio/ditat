/**
 * Neteja els dominis dels centres ja desats.
 *
 * Un domini guardat com "@escola.cat" (o com una adreça sencera, o amb https://)
 * no lliga mai amb la part dreta del correu de qui inicia sessió, així que el
 * centre es queda sense usuaris sense donar cap error. Aquest script els
 * normalitza i reassigna els usuaris que haurien d'estar-hi.
 *
 * Ús:  node scripts/fix-school-domains.mjs
 */
import { PrismaClient } from "@prisma/client";

function normaliseDomain(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("@")
    .pop()
    .split("/")[0]
    .trim();
}

const prisma = new PrismaClient();

const schools = await prisma.school.findMany({ select: { id: true, name: true, domain: true } });

for (const school of schools) {
  const clean = normaliseDomain(school.domain);
  if (clean === school.domain) {
    console.log(`OK    ${school.name}: "${school.domain}"`);
    continue;
  }

  const clash = await prisma.school.findFirst({
    where: { domain: clean, id: { not: school.id } },
    select: { name: true },
  });
  if (clash) {
    console.log(`OMÈS  ${school.name}: "${clean}" ja el fa servir "${clash.name}".`);
    continue;
  }

  await prisma.school.update({ where: { id: school.id }, data: { domain: clean } });
  console.log(`FIXAT ${school.name}: "${school.domain}" -> "${clean}"`);
}

// Assigna els usuaris que s'havien quedat sense centre perquè el domini no lligava.
const orphans = await prisma.user.findMany({
  where: { schoolId: null },
  select: { id: true, email: true },
});

for (const user of orphans) {
  const domain = user.email.split("@")[1]?.toLowerCase();
  if (!domain) continue;
  const school = await prisma.school.findUnique({ where: { domain }, select: { id: true, name: true } });
  if (!school) continue;
  await prisma.user.update({ where: { id: user.id }, data: { schoolId: school.id } });
  console.log(`ASSIGNAT ${user.email} -> ${school.name}`);
}

await prisma.$disconnect();
