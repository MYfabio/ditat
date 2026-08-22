"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AccessibilityProvider } from "@/hooks/use-accessibility-prefs";
import { VisitCounter } from "@/components/visit-counter";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AccessibilityProvider>
        <TooltipProvider delay={150}>
          {children}
          <VisitCounter />
          <Toaster position="top-center" richColors />
        </TooltipProvider>
      </AccessibilityProvider>
    </SessionProvider>
  );
}
