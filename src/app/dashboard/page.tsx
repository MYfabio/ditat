import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@prisma/client";
import { saveSignupIntentIfMissing } from "./actions";

const roleRoutes: Record<Role, string> = {
  SUPERADMIN: "/admin",
  SCHOOL_COORD: "/school",
  TEACHER: "/teacher",
  STUDENT: "/student",
};

export default async function DashboardRedirectPage(props: PageProps<"/dashboard">) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await props.searchParams;
  const intent = typeof params.intent === "string" ? params.intent : undefined;
  if (intent) await saveSignupIntentIfMissing(intent);

  redirect(roleRoutes[session.user.role] ?? "/student");
}
