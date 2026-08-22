import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

/**
 * El que Stripe ens explica quan una subscripcio canvia.
 *
 * Es l'unica font de veritat sobre qui ha pagat. No es fa cas del que digui el
 * navegador en tornar de la pagina de pagament: qualsevol pot obrir aquella
 * URL d'exit sense haver pagat res. Nomes compta el que arriba signat des de
 * Stripe.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Pagaments no configurats." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Sense signatura." }, { status: 400 });

  // Cal el cos tal com ha arribat: si es parseja, la signatura ja no quadra.
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error("Signatura de Stripe invalida:", err);
    return NextResponse.json({ error: "Signatura invalida." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        if (s.mode === "subscription" && s.subscription) {
          const sub = await stripe.subscriptions.retrieve(String(s.subscription));
          await desaSubscripcio(sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await desaSubscripcio(event.data.object);
        break;
      }
      default:
        // La resta d'esdeveniments no ens diuen res que faci canviar l'accés.
        break;
    }
  } catch (err) {
    // Es respon 500 a proposit: Stripe ho tornara a intentar, i val mes un
    // reintent que perdre el canvi d'estat d'una subscripcio.
    console.error("Error processant el webhook de Stripe:", err);
    return NextResponse.json({ error: "Error intern." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function desaSubscripcio(sub: Stripe.Subscription) {
  const userId = sub.metadata?.userId;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  // Es busca per identificador si el portem a les metadades, i si no, pel
  // client de Stripe, que es el que sempre hi es.
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId }, select: { id: true } })
    : await prisma.user.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
  if (!user) {
    console.error("Webhook de Stripe per a un usuari desconegut:", customerId);
    return;
  }

  const item = sub.items.data[0];
  const finalPeriode = item?.current_period_end ?? null;

  await prisma.user.update({
    where: { id: user.id },
    data: {
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      subscriptionStatus: sub.status,
      subscriptionEndsAt: finalPeriode ? new Date(finalPeriode * 1000) : null,
    },
  });
}
