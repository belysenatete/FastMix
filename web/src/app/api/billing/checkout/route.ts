import { NextResponse } from "next/server";
import { getApplicationOwner } from "@/lib/clerk-auth";
import { LIFETIME_LIMIT, paddleApi, paddleConfigured, paddleEnvironment, PriceChoice, priceIdFor, signUserId } from "@/lib/paddle";

function parseChoice(body: unknown): PriceChoice | null {
  const { plan, billing } = (body ?? {}) as { plan?: unknown; billing?: unknown };
  if (plan === "lifetime") return { plan, billing: "once" };
  if ((plan === "lite" || plan === "pro" || plan === "artist") && (billing === "monthly" || billing === "yearly")) return { plan, billing };
  return null;
}

/**
 * Starts a purchase. New buyers get what the browser needs to open Paddle checkout. A subscriber who picks
 * another plan or billing period has their existing subscription switched instead (prorated), so nobody
 * ends up paying for two subscriptions.
 */
export async function POST(request: Request) {
  if (!paddleConfigured()) return NextResponse.json({ error: "Checkout isn't available yet." }, { status: 503 });
  const owner = await getApplicationOwner();
  if (!owner) return NextResponse.json({ error: "Sign in to choose a plan." }, { status: 401 });
  const choice = parseChoice(await request.json().catch(() => null));
  const priceId = choice && priceIdFor(choice);
  if (!choice || !priceId) return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  const { sql, id: userId, session } = owner;

  const [current] = await sql`
    SELECT provider_subscription_id, plan_key FROM subscriptions
    WHERE user_id = ${userId} AND provider = 'paddle' AND status IN ('trialing', 'active', 'past_due')
      AND (period_end IS NULL OR period_end > now())
    ORDER BY created_at DESC LIMIT 1
  `;

  if (choice.plan === "lifetime") {
    if (current?.planKey === "lifetime") return NextResponse.json({ error: "You already have lifetime access." }, { status: 409 });
    const [{ sold }] = await sql`SELECT count(*)::int AS sold FROM subscriptions WHERE plan_key = 'lifetime' AND provider = 'paddle'`;
    if (sold >= LIFETIME_LIMIT) return NextResponse.json({ error: "The lifetime offer is sold out." }, { status: 410 });
  } else if (current && current.planKey !== "lifetime") {
    await paddleApi(`/subscriptions/${current.providerSubscriptionId}`, {
      method: "PATCH",
      body: { items: [{ price_id: priceId, quantity: 1 }], proration_billing_mode: "prorated_immediately" },
    });
    return NextResponse.json({ changed: true });
  }

  return NextResponse.json({
    environment: paddleEnvironment(),
    priceId,
    email: session.email,
    customData: { user_id: userId, user_sig: signUserId(userId) },
  });
}
