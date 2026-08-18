"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { LogOut, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Sortir ha de ser visible sempre. Estava només dins del menú de l'avatar, i
 * en un ordinador compartit d'aula ningú no s'ha de posar a buscar on es tanca
 * la sessió: si no la troba, la deixa oberta i el següent alumne hi entra.
 */
export function SignOutButton() {
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        signOut({ callbackUrl: "/" });
      }}
    >
      {loading ? <Loader2 className="animate-spin" /> : <LogOut className="size-4" />}
      <span className="hidden sm:inline">Sortir</span>
    </Button>
  );
}
