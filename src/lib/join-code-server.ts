import { prisma } from "@/lib/prisma";
import { generateJoinCode } from "@/lib/join-code";

/** Busca un codi de classe que no estigui ja en ús. */
export async function freeJoinCode() {
  for (let i = 0; i < 10; i++) {
    const code = generateJoinCode();
    const taken = await prisma.classGroup.findUnique({ where: { joinCode: code } });
    if (!taken) return code;
  }
  // Amb 31^6 combinacions això no hauria de passar mai; si passa, s'allarga.
  return generateJoinCode(8);
}
