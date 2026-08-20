"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, RefreshCw, Users } from "lucide-react";
import { toast } from "sonner";
import { regenerateJoinCode } from "./actions";

export type GroupWithCode = {
  id: string;
  name: string;
  gradeLevel: string;
  joinCode: string | null;
  students: number;
};

/**
 * Codi i enllaç que el docent dona a la classe perquè l'alumnat s'hi apunti
 * sol, sense haver-los d'assignar un per un.
 */
export function JoinCodeCard({ groups }: { groups: GroupWithCode[] }) {
  if (groups.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Codis per apuntar-se a classe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Dona aquest codi a la teva classe: l&apos;alumnat entra a dictats.cat amb el compte del
          centre i s&apos;hi apunta sol. Només funciona per a alumnat del teu centre.
        </p>
        {groups.map((g) => (
          <GroupCode key={g.id} group={g} />
        ))}
      </CardContent>
    </Card>
  );
}

function GroupCode({ group }: { group: GroupWithCode }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const link =
    typeof window !== "undefined" && group.joinCode
      ? `${window.location.origin}/student?codi=${group.joinCode}`
      : "";

  async function copy(what: "code" | "link") {
    const text = what === "code" ? group.joinCode ?? "" : link;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
      toast.success(what === "code" ? "Codi copiat." : "Enllaç copiat.");
    } catch {
      toast.error("El navegador no ha deixat copiar-ho. Selecciona'l i copia'l a mà.");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{group.name}</span>
          <Badge variant="secondary">
            <Users className="size-3" />
            {group.students}
          </Badge>
        </div>
        <p className="mt-1 font-mono text-2xl font-semibold tracking-[0.2em]">
          {group.joinCode ?? "—"}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => copy("code")} disabled={!group.joinCode}>
          {copied === "code" ? <Check className="size-4" /> : <Copy className="size-4" />}
          Copiar codi
        </Button>
        <Button size="sm" variant="outline" onClick={() => copy("link")} disabled={!group.joinCode}>
          {copied === "link" ? <Check className="size-4" /> : <Copy className="size-4" />}
          Copiar enllaç
        </Button>
        <form action={regenerateJoinCode}>
          <input type="hidden" name="classGroupId" value={group.id} />
          <Button
            type="submit"
            size="sm"
            variant="ghost"
            title="Generar un codi nou"
            onClick={(e) => {
              if (
                !window.confirm(
                  `Vols generar un codi nou per a "${group.name}"?\n\nEl codi actual deixarà de funcionar immediatament. Qui ja hi és apuntat s'hi queda.`
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <RefreshCw className="size-4" />
            Nou codi
          </Button>
        </form>
      </div>
    </div>
  );
}
