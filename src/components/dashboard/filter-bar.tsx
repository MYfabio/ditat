import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FilterSelect = {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
};

/**
 * Barra de cerca i filtres. S'envia per GET perquè el filtre quedi a l'URL:
 * així es pot compartir, tornar-hi enrere i recarregar sense perdre'l.
 */
export function FilterBar({
  action,
  q,
  placeholder,
  selects = [],
  hidden = {},
  resultCount,
}: {
  /** Ruta on torna el formulari, per netejar els filtres. */
  action: string;
  q: string;
  placeholder: string;
  selects?: FilterSelect[];
  hidden?: Record<string, string>;
  resultCount?: number;
}) {
  const active = !!q || selects.some((s) => !!s.value);

  return (
    <div className="mb-4 space-y-2">
      <form
        method="get"
        className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/30 p-3"
      >
        {Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}

        {selects.map((s) => (
          <div key={s.name} className="grid gap-1.5">
            <Label htmlFor={s.name} className="text-xs">
              {s.label}
            </Label>
            <select
              id={s.name}
              name={s.name}
              defaultValue={s.value}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            >
              {s.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        <div className="grid flex-1 gap-1.5 sm:max-w-xs">
          <Label htmlFor="q" className="text-xs">
            Cercar
          </Label>
          <Input id="q" name="q" defaultValue={q} placeholder={placeholder} />
        </div>

        <Button type="submit" variant="outline">
          <Search className="size-4" />
          Filtrar
        </Button>

        {active && (
          <Button variant="ghost" nativeButton={false} render={<Link href={action} />}>
            Netejar
          </Button>
        )}
      </form>

      {active && resultCount !== undefined && (
        <p className="text-sm text-muted-foreground">
          {resultCount === 0
            ? "Cap resultat amb aquest filtre."
            : `${resultCount} resultat(s) amb aquest filtre.`}
        </p>
      )}
    </div>
  );
}
