import { NextResponse } from "next/server";
import { sqlClient } from "@/lib/database";
import { planForPrice, verifiedUserId, verifyWebhook } from "@/lib/paddle";

type Item = { price?: { id?: string } };
type PaddleEvent = {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data: {
    id: string;
    status: string;
    customer_id?: string | null;
    subscription_id?: string | null;
    custom_data?: unknown;
    items?: Item[];
    current_billing_period?: { ends_at?: string } | null;
  };
};

// Paddle subscription status → subscriptions.status. Past-due keeps access (no period end) while Paddle retries the card;
// Paddle cancels the subscription if every retry fails.
const STATUS: Record<string, string> = { active: "active", trialing: "trialing", past_due: "past_due", canceled: "cancelled", paused: "expired" };

/** Paddle notifications: subscription changes and completed one-time (lifetime) purchases. */
export async function POST(request: Request) {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  const sql = sqlClient();
  if (!secret || !sql) return NextResponse.json({ error: "Billing is not configured." }, { status: 503 });
  const rawBody = await request.text();
  if (!verifyWebhook(rawBody, request.headers.get("paddle-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 401 });
  }
  const event = JSON.parse(rawBody) as PaddleEvent;
  const { data } = event;
  const occurredAt = new Date(event.occurred_at);
  const plans = (data.items ?? []).map((item) => item.price?.id && planForPrice(item.price.id)).filter(Boolean) as string[];

  if (event.event_type.startsWith("subscription.")) {
    const plan = plans.find((key) => key !== "lifetime");
    const status = STATUS[data.status];
    if (!plan || !status) return NextResponse.json({ ignored: "unknown plan or status" });
    const periodEnd = status === "past_due" ? null : data.current_billing_period?.ends_at ?? null;
    const signedUser = verifiedUserId(data.custom_data);
    const [existing] = await sql`SELECT user_id FROM subscriptions WHERE provider_subscription_id = ${data.id}`;
    const userId = existing?.userId ?? signedUser;
    if (!userId) {
      console.error("Paddle subscription %s has no verified FastMix user; ignored", data.id);
      return NextResponse.json({ ignored: "no user" });
    }
    await sql`
      INSERT INTO subscriptions (user_id, provider, provider_subscription_id, provider_customer_id, plan_key, status, period_end, provider_updated_at)
      VALUES (${userId}, 'paddle', ${data.id}, ${data.customer_id ?? null}, ${plan}, ${status}, ${periodEnd}, ${occurredAt})
      ON CONFLICT (provider_subscription_id) DO UPDATE SET
        provider_customer_id = EXCLUDED.provider_customer_id,
        plan_key = EXCLUDED.plan_key,
        status = EXCLUDED.status,
        period_end = EXCLUDED.period_end,
        provider_updated_at = EXCLUDED.provider_updated_at
      WHERE subscriptions.provider_updated_at IS NULL OR subscriptions.provider_updated_at <= EXCLUDED.provider_updated_at
    `;
    return NextResponse.json({ ok: true });
  }

  // The first payment of a subscription also links it to the buyer, in case the subscription events
  // arrive without our custom data. Later subscription events keep the row up to date.
  if (event.event_type === "transaction.completed" && data.subscription_id) {
    const plan = plans.find((key) => key !== "lifetime");
    const userId = verifiedUserId(data.custom_data);
    const periodEnd = (data as { billing_period?: { ends_at?: string } | null }).billing_period?.ends_at ?? null;
    if (plan && userId) {
      await sql`
        INSERT INTO subscriptions (user_id, provider, provider_subscription_id, provider_customer_id, plan_key, status, period_end, provider_updated_at)
        VALUES (${userId}, 'paddle', ${data.subscription_id}, ${data.customer_id ?? null}, ${plan}, 'active', ${periodEnd}, NULL)
        ON CONFLICT (provider_subscription_id) DO NOTHING
      `;
    }
    return NextResponse.json({ ok: true });
  }

  if (event.event_type === "transaction.completed" && plans.includes("lifetime")) {
    const userId = verifiedUserId(data.custom_data);
    if (!userId) {
      console.error("Paddle lifetime transaction %s has no verified FastMix user; ignored", data.id);
      return NextResponse.json({ ignored: "no user" });
    }
    await sql`
      INSERT INTO subscriptions (user_id, provider, provider_subscription_id, provider_customer_id, plan_key, status, period_end, provider_updated_at)
      VALUES (${userId}, 'paddle', ${data.id}, ${data.customer_id ?? null}, 'lifetime', 'active', NULL, ${occurredAt})
      ON CONFLICT (provider_subscription_id) DO NOTHING
    `;
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ignored: event.event_type });
}
