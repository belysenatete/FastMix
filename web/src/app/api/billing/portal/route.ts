import { NextResponse } from "next/server";
import { getApplicationOwner } from "@/lib/clerk-auth";
import { paddleApi, paddleConfigured } from "@/lib/paddle";

type PortalSession = { urls: { general: { overview: string } } };

/** A one-time link to Paddle's customer portal, where buyers update their card, see invoices and cancel. */
export async function POST() {
  if (!paddleConfigured()) return NextResponse.json({ error: "Checkout isn't available yet." }, { status: 503 });
  const owner = await getApplicationOwner();
  if (!owner) return NextResponse.json({ error: "Sign in to manage your plan." }, { status: 401 });
  const rows = await owner.sql`
    SELECT provider_subscription_id, provider_customer_id, plan_key, status FROM subscriptions
    WHERE user_id = ${owner.id} AND provider = 'paddle' AND provider_customer_id IS NOT NULL
    ORDER BY created_at DESC
  `;
  if (!rows.length) return NextResponse.json({ error: "No purchase found for this account." }, { status: 404 });
  const subscriptionIds = rows
    .filter((row) => row.planKey !== "lifetime" && row.status !== "cancelled")
    .map((row) => row.providerSubscriptionId as string);
  const session = await paddleApi<PortalSession>(`/customers/${rows[0].providerCustomerId}/portal-sessions`, {
    method: "POST",
    body: subscriptionIds.length ? { subscription_ids: subscriptionIds } : {},
  });
  return NextResponse.json({ url: session.urls.general.overview });
}
