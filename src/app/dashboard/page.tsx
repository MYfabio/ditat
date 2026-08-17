import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@prisma/client";

const roleRoutes: Record<Role, string> = {
  SUPERADMIN: "/admin",
  SCHOOL_COORD: "/school",
  TEACHER: "/teacher",
  STUDENT: "/student",
};

export default async function DashboardRedirectPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  redirect(roleRoutes[session.user.role] ?? "/student");
}
