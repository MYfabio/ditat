import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeConfigurat, baseUrl } from "@/lib/stripe";

/** Obre la pagina de pagament de Stripe per subscriure's. */
export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autoritzat." }, { status: 401 });

  const stripe = getStripe();
  if (!stripe || !stripeConfigurat()) {
    return NextResponse.json({ error: "Els pagaments encara no estan actius." }, { status: 503 });
  }

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, classGroupId: true, stripeCustomerId: true },
  });
  if (!me?.email) return NextResponse.json({ error: "No autoritzat." }, { status: 401 });

  // Qui te classe no paga: el seu accés el porta el centre. Cobrar-li seria
  // cobrar dues vegades pel mateix.
  if (me.classGroupId) {
    return NextResponse.json(
      { error: "El teu accés ja el porta el teu centre educatiu." },
      { status: 400 }
    );
  }

  try {
    // Es reaprofita el client de Stripe si ja n'hi ha un, perque tot el
    // historial de pagaments d'una persona quedi sota el mateix client.
    let customerId = me.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: me.email,
        name: me.name ?? undefined,
        metadata: { userId: me.id },
      });
      customerId = customer.id;
      await prisma.user.update({ where: { id: me.id }, data: { stripeCustomerId: customerId } });
    }

    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID as string, quantity: 1 }],
      locale: "ca",
      allow_promotion_codes: true,
      // L'identificador viatja tambe aqui: el webhook no ha de dependre de
      // trobar l'usuari pel correu, que pot canviar.
      subscription_data: { metadata: { userId: me.id } },
      success_url: `${baseUrl()}/student?subscripcio=ok`,
      cancel_url: `${baseUrl()}/student?subscripcio=cancel`,
    });

    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    console.error("Stripe checkout ha fallat:", err);
    return NextResponse.json({ error: "No s'ha pogut obrir el pagament." }, { status: 500 });
  }
}
