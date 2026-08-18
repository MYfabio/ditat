"use client";

import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

/**
 * Botó d'enviament per a accions destructives. Demana confirmació dient
 * exactament què s'esborrarà: aquestes accions no es poden desfer i sovint
 * s'emporten feina de l'alumnat.
 */
export function ConfirmButton({
  message,
  children,
  size = "sm",
}: {
  message: string;
  children: React.ReactNode;
  size?: "sm" | "icon-sm";
}) {
  return (
    <Button
      type="submit"
      size={size}
      variant="outline"
      className="text-destructive hover:bg-destructive/10"
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      <Trash2 className="size-4" />
      {children}
    </Button>
  );
}
