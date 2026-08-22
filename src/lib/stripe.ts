import Stripe from "stripe";

/**
 * Client de Stripe.
 *
 * Es crea mandrosament perque el web ha de poder arrencar sense claus de
 * pagament: mentre no n'hi hagi, la subscripcio simplement no s'ofereix i
 * tota la resta funciona igual.
 */
let client: Stripe | null = null;

export const stripeConfigurat = () =>
  !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRICE_ID;

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) return null;
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}

/** L'adreça publica del web, per tornar-hi despres de pagar. */
export function baseUrl() {
  return process.env.AUTH_URL?.replace(/\/$/, "") || "https://www.dictats.cat";
}
