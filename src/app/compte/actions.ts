"use server";

import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { PARAULA_CONFIRMACIO, type ResultatBaixa } from "./constants";

/**
 * Esborrat del propi compte.
 *
 * Nomes per a qui s'ha donat d'alta pel seu compte. Qui pertany a un centre no
 * pot esborrar-se des d'aqui, i no es cap descuit: en aquest cas el responsable
 * de les dades es el centre, no nosaltres. Si un alumne es pogues esborrar sol,
 * s'emportaria les evidencies que el seu professorat necessita per avaluar-lo, i
 * el centre no podria complir les seves propies obligacions. Aquestes baixes es
 * demanen a la coordinacio del centre.
 */


export async function esborrarElMeuCompte(
  _anterior: ResultatBaixa,
  formData: FormData,
): Promise<ResultatBaixa> {
  const session = await auth();
  if (!session?.user?.id) return { error: "Has d'haver iniciat la sessió." };

  const confirmacio = String(formData.get("confirmacio") || "").trim().toUpperCase();
  if (confirmacio !== PARAULA_CONFIRMACIO) {
    return { error: `Escriu ${PARAULA_CONFIRMACIO} a la casella per confirmar-ho.` };
  }

  const jo = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      schoolId: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });
  if (!jo) return { error: "No hem trobat el compte." };

  if (jo.schoolId) {
    return {
      error:
        "El teu compte pertany a un centre educatiu. La baixa l'ha de fer la coordinació del centre, que és qui respon d'aquestes dades.",
    };
  }

  // Deixar la plataforma sense superadministrador la deixaria inaccessible.
  if (jo.role === "SUPERADMIN") {
    const quants = await prisma.user.count({ where: { role: "SUPERADMIN" } });
    if (quants <= 1) {
      return { error: "Ets l'únic superadministrador. Nomena'n un altre abans de marxar." };
    }
  }

  /*
   * Primer la subscripcio. Si esborressim el compte i el cobrament es quedes
   * viu, seguiriem cobrant a algu que ja no hi es i que no te cap manera
   * d'aturar-ho. Si Stripe falla, no esborrem: val mes que ho torni a provar
   * que no pas deixar-lo pagant sense compte.
   */
  if (jo.stripeSubscriptionId) {
    const stripe = getStripe();
    if (!stripe) {
      return { error: "Ara mateix no podem cancel·lar la subscripció. Torna-ho a provar més tard." };
    }
    try {
      await stripe.subscriptions.cancel(jo.stripeSubscriptionId);
    } catch (err) {
      const codi = (err as { code?: string })?.code;
      // Si ja no existeix a Stripe, no hi ha res a cancel·lar i podem seguir.
      if (codi !== "resource_missing") {
        console.error("No s'ha pogut cancel·lar la subscripció en esborrar el compte:", err);
        return {
          error:
            "No hem pogut cancel·lar la teva subscripció i per això no esborrem res. Torna-ho a provar d'aquí a una estona.",
        };
      }
    }
  }

  // Els grups i els dictats que hagi creat es queden sense autor, no
  // desapareixen: si els fa servir algu mes, no els hem de fer caure.
  await prisma.classGroup.updateMany({ where: { teacherId: jo.id }, data: { teacherId: null } });
  await prisma.dictation.updateMany({ where: { teacherId: jo.id }, data: { teacherId: null } });

  // La resta —entregues, sessions, comptes vinculats, progres— penja de l'usuari
  // i marxa amb ell.
  await prisma.user.delete({ where: { id: jo.id } });

  await signOut({ redirect: false });
  redirect("/?compte=esborrat");
}
