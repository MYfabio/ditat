// Els dictats creats amb l'opcio "Sense grup" no els veia cap alumne. Aquest
// script els assigna al primer grup del docent que els va crear.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const orphans = await prisma.dictation.findMany({
  where: { classGroupId: null, targetStudentId: null },
  select: { id: true, title: true, teacherId: true },
});
console.log("Dictats sense grup:", orphans.length);

for (const d of orphans) {
  const group = await prisma.classGroup.findFirst({
    where: { teacherId: d.teacherId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });
  if (!group) {
    console.log(` - "${d.title}": el docent no te cap grup, es deixa igual`);
    continue;
  }
  await prisma.dictation.update({ where: { id: d.id }, data: { classGroupId: group.id } });
  console.log(` - "${d.title}" -> ${group.name}`);
}

await prisma.$disconnect();
