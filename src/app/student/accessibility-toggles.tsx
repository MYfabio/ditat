"use client";

import { useAccessibilityPrefs } from "@/hooks/use-accessibility-prefs";
import { Button } from "@/components/ui/button";
import { BookOpenText, Contrast } from "lucide-react";

export function AccessibilityToggles() {
  const { dyslexicFont, highContrast, toggleDyslexicFont, toggleHighContrast } =
    useAccessibilityPrefs();

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant={dyslexicFont ? "default" : "outline"}
        size="sm"
        onClick={toggleDyslexicFont}
      >
        <BookOpenText className="size-4" />
        Tipografia OpenDyslexic
      </Button>
      <Button
        type="button"
        variant={highContrast ? "default" : "outline"}
        size="sm"
        onClick={toggleHighContrast}
      >
        <Contrast className="size-4" />
        Alt contrast
      </Button>
    </div>
  );
}
