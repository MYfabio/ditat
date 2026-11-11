import { revalidatePath } from "next/cache";

/** Tot el que ensenya grups: el panell, la llista i la fitxa de cada grup. */
export function revalidaGrups() {
  revalidatePath("/teacher");
  revalidatePath("/teacher/grups");
  revalidatePath("/teacher/grups/[id]", "page");
  revalidatePath("/school");
}
