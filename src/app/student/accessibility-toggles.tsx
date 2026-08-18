"use client";

import { useAccessibilityPrefs } from "@/hooks/use-accessibility-prefs";
import { Button } from "@/components/ui/button";
import { BookOpenText, Contrast, RotateCcw } from "lucide-react";
import { hasAnyAdaptation, type NeedsProfile } from "@/lib/needs-profile";

export function AccessibilityToggles({ assigned }: { assigned: NeedsProfile }) {
  const {
    dyslexicFont,
    highContrast,
    toggleDyslexicFont,
    toggleHighContrast,
    overridden,
    resetToAssigned,
  } = useAccessibilityPrefs();

  const teacherSetSomething = hasAnyAdaptation(assigned);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={dyslexicFont ? "default" : "outline"}
          size="sm"
          onClick={toggleDyslexicFont}
          aria-pressed={dyslexicFont}
        >
          <BookOpenText className="size-4" />
          Tipografia OpenDyslexic
        </Button>
        <Button
          type="button"
          variant={highContrast ? "default" : "outline"}
          size="sm"
          onClick={toggleHighContrast}
          aria-pressed={highContrast}
        >
          <Contrast className="size-4" />
          Alt contrast
        </Button>

        {overridden && teacherSetSomething && (
          <Button type="button" variant="ghost" size="sm" onClick={resetToAssigned}>
            <RotateCcw className="size-4" />
            Tornar a les ajudes del meu docent
          </Button>
        )}
      </div>

      {teacherSetSomething && (
        <p className="text-xs text-muted-foreground">
          El teu/a docent t&apos;ha activat algunes ajudes
          {assigned.tdahPacing ? ", com llegir el dictat frase a frase" : ""}. Pots
          canviar-les quan vulguis si estàs més còmode d&apos;una altra manera.
        </p>
      )}
    </div>
  );
}
