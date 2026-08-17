"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { importUsersCsv } from "./actions";

const PLACEHOLDER = `email,nom,rol\nmestre1@escola.cat,Maria Puig,TEACHER\nalumne1@escola.cat,Joan Serra,STUDENT`;

export function CsvImportForm() {
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const text = await file.text();
    setCsvText(text);
  }

  async function handleImport() {
    if (!csvText.trim()) {
      toast.error("Enganxa o puja un fitxer CSV primer.");
      return;
    }
    setLoading(true);
    try {
      const result = await importUsersCsv(csvText);
      toast.success(`Importats ${result.created} usuaris (${result.skipped} omesos).`);
      if (result.errors.length) toast.warning(result.errors.slice(0, 3).join(" "));
      setCsvText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No s'ha pogut importar el CSV.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <Textarea
        value={csvText}
        onChange={(e) => setCsvText(e.target.value)}
        placeholder={PLACEHOLDER}
        rows={6}
        className="font-mono text-xs"
      />
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="size-4" />
          Puja un fitxer CSV
        </Button>
        <Button type="button" onClick={handleImport} disabled={loading}>
          {loading && <Loader2 className="animate-spin" />}
          Importar usuaris
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Format: <code>email,nom,rol</code> (rol: TEACHER o STUDENT; per defecte STUDENT).
      </p>
    </div>
  );
}
