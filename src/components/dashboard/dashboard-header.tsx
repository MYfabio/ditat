import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "@/components/dashboard/user-menu";

const ROLE_LABELS: Record<string, string> = {
  SUPERADMIN: "Superadministrador",
  SCHOOL_COORD: "Coordinacio d'escola",
  TEACHER: "Docent",
  STUDENT: "Alumne/a",
};

export function DashboardHeader({
  title,
  subtitle,
  role,
  userName,
  userEmail,
}: {
  title: string;
  subtitle?: string;
  role: string;
  userName?: string | null;
  userEmail?: string | null;
}) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <GraduationCap className="size-6 text-primary" />
            <span className="hidden sm:inline">DictatsIA</span>
          </Link>
          <Badge variant="secondary">{ROLE_LABELS[role] ?? role}</Badge>
        </div>
        <UserMenu name={userName} email={userEmail} />
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </header>
  );
}
