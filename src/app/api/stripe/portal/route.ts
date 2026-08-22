import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, baseUrl } from "@/lib/stripe";

/**
 * Porta a la pagina de Stripe on cadascu gestiona la seva subscripcio: canviar
 * la targeta, veure les factures o donar-se de baixa. Es fa alla i no aqui
 * perque les dades de pagament no han de passar mai pel nostre servidor.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autoritzat." }, { status: 401 });

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Pagaments no configurats." }, { status: 503 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });
  if (!me?.stripeCustomerId) {
    return NextResponse.json({ error: "Encara no tens cap subscripció." }, { status: 400 });
  }

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: me.stripeCustomerId,
      return_url: `${baseUrl()}/student`,
    });
    return NextResponse.json({ url: portal.url });
  } catch (err) {
    console.error("Portal de Stripe ha fallat:", err);
    return NextResponse.json({ error: "No s'ha pogut obrir la gestió." }, { status: 500 });
  }
}
