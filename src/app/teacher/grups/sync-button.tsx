"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sincronitzaGrupClassroom, type SyncResult } from "./actions";

/** «Actualitza l'alumnat des de Classroom» a la fitxa d'un grup importat. */
export function SyncButton({ classGroupId }: { classGroupId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [result, setResult] = useState<SyncResult | null>(null);

  return (
    <div className="space-y-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await sincronitzaGrupClassroom(classGroupId);
            setResult(r);
            if (r.ok) {
              toast.success(
                `${r.creats} alumnes nous, ${r.actualitzats} assignats, ${r.jaHiEren} ja hi eren.`,
              );
              router.refresh();
            } else {
              toast.error(r.error);
            }
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        Actualitza l&apos;alumnat des de Classroom
      </Button>
      {result && result.ok && result.omesos.length > 0 && (
        <ul className="list-disc pl-4 text-xs text-amber-700 dark:text-amber-400">
          {result.omesos.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
