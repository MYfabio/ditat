import { createHmac } from "node:crypto";

/**
 * Envia un avís a n8n (contracte comú d'aulaia.cat, docs/n8n.md).
 * Mai llança errors ni bloqueja l'acció de l'usuari: si n8n no respon en
 * 3 segons, o no hi ha configuració, retorna false i l'app segueix igual.
 * No envia noms ni correus: només app, tipus, centre i dades mínimes.
 */
const TEMPS_MAXIM_MS = 3000;

export type TipusAvis = "alta.validada" | "rol.canvi" | "error";

export type Avis = {
  tipus: TipusAvis;
  centre: string | null;
  datos: Record<string, string | number | boolean | null>;
};

/**
 * El centre que viatja amb l'avís: només el domini del correu (el que va darrere
 * de la @), mai el correu sencer. Amb això el panell d'aulaia.cat separa
 * l'Escola Industrial de la resta de centres.
 */
export function dominiDe(correu: unknown): string | null {
  const text = String(correu ?? "").trim().toLowerCase();
  const arrova = text.lastIndexOf("@");
  if (arrova < 1) return null;
  const domini = text.slice(arrova + 1);
  return /^[a-z0-9.-]+\.[a-z]{2,}$/.test(domini) ? domini : null;
}

export async function enviarAvis(avis: Avis): Promise<boolean> {
  const url = process.env.N8N_WEBHOOK_URL;
  const secret = process.env.AULAIA_WEBHOOK_SECRET;
  if (!url || !secret) return false;

  const cos = JSON.stringify({
    app: "dictats",
    tipus: avis.tipus,
    centre: avis.centre,
    datos: avis.datos,
    data: new Date().toISOString(),
  });

  try {
    const resposta = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Aulaia-Signature": createHmac("sha256", secret).update(cos).digest("hex"),
      },
      body: cos,
      signal: AbortSignal.timeout(TEMPS_MAXIM_MS),
    });
    return resposta.ok;
  } catch {
    return false;
  }
}
