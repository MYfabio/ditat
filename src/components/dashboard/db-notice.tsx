import { DatabaseZap } from "lucide-react";

export function DbNotice() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-dashed border-amber-400/60 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
      <DatabaseZap className="mt-0.5 size-4 shrink-0" />
      <p>
        No hi ha cap base de dades connectada (falta{" "}
        <code className="rounded bg-black/10 px-1 py-0.5 dark:bg-white/10">DATABASE_URL</code> a
        l&apos;entorn). Aquesta pantalla mostra la interficie completa, pero no pot desar ni
        llegir dades reals fins que es connecti una base de dades PostgreSQL.
      </p>
    </div>
  );
}
