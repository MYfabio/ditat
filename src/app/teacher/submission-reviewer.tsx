"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye } from "lucide-react";

export type ReviewSubmission = {
  id: string;
  studentName: string;
  dictationTitle: string;
  originalText: string;
  ocrText: string | null;
  score: number | null;
  status: string;
  createdAt: string;
  errors: { paraulaOriginal: string; paraulaEscrita: string; explicacio: string }[];
  feedback: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendent",
  OCR_PROCESSING: "Processant OCR",
  OCR_FAILED: "Error OCR",
  AI_EVALUATING: "Avaluant",
  EVALUATED: "Avaluat",
  REVIEWED: "Revisat",
};

export function SubmissionReviewer({ submissions }: { submissions: ReviewSubmission[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(submissions[0]?.id ?? null);
  const selected = submissions.find((s) => s.id === selectedId) ?? null;

  if (submissions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Encara no hi ha cap entrega fotografiada per revisar.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Entregues rebudes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alumne/a</TableHead>
                <TableHead>Dictat</TableHead>
                <TableHead>Puntuació</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((s) => (
                <TableRow key={s.id} data-state={s.id === selectedId ? "selected" : undefined}>
                  <TableCell>{s.studentName}</TableCell>
                  <TableCell className="text-muted-foreground">{s.dictationTitle}</TableCell>
                  <TableCell>
                    {s.score !== null ? (
                      <Badge variant={s.score >= 70 ? "default" : "secondary"}>{s.score}%</Badge>
                    ) : (
                      <Badge variant="outline">{STATUS_LABELS[s.status] ?? s.status}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button size="icon-sm" variant="ghost" onClick={() => setSelectedId(s.id)}>
                      <Eye />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected.studentName} - {selected.dictationTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Text original</p>
                <p className="rounded-md border bg-muted/40 p-3 text-sm leading-relaxed">
                  {selected.originalText}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">
                  Text detectat (OCR)
                </p>
                <p className="rounded-md border bg-muted/40 p-3 text-sm leading-relaxed">
                  {selected.ocrText || "Encara sense processar."}
                </p>
              </div>
            </div>

            {selected.feedback && (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                {selected.feedback}
              </div>
            )}

            {selected.errors.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Correcció proposada per la IA
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Original</TableHead>
                      <TableHead>Escrit</TableHead>
                      <TableHead>Explicació</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selected.errors.map((err, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{err.paraulaOriginal}</TableCell>
                        <TableCell className="text-destructive">{err.paraulaEscrita}</TableCell>
                        <TableCell className="text-muted-foreground">{err.explicacio}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
