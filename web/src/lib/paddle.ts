import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Server-side Paddle helpers. Paddle is FastMix's merchant of record: it runs checkout, charges the buyer,
 * handles VAT/sales tax and pays out. FastMix only learns about payments from signed webhooks.
 *
 * Environment: PADDLE_API_KEY (server), PADDLE_WEBHOOK_SECRET (from the notification destination),
 * NEXT_PUBLIC_PADDLE_ENV ("sandbox" | "production"), NEXT_PUBLIC_PADDLE_CLIENT_TOKEN (browser checkout).
 */
export type PlanKey = "lite" | "pro" | "artist" | "lifetime";
export type PriceChoice = { plan: "lite" | "pro" | "artist"; billing: "monthly" | "yearly" } | { plan: "lifetime"; billing: "once" };

// Price IDs created by brand/payments/paddle-catalog.cjs. Fill `production` from the live account before launch.
const PRICES: Record<"sandbox" | "production", Record<string, string>> = {
  sandbox: {
    "lite:monthly": "pri_01m6h1aq23p8s5b902bpe3crrx",
    "lite:yearly": "pri_01m6h1aqrx5caaj8hhf0d6p990",
    "pro:monthly": "pri_01m6h1ardsbm5cayhc1w09jhmk",
    "pro:yearly": "pri_01m6h1arr9gxev5sds3nfshhts",
    "artist:monthly": "pri_01m6h1ask9s9jf31jwh78rz1zr",
    "artist:yearly": "pri_01m6h1asyqddb82f6mq67t0yzf",
    "lifetime:once": "pri_01m6h1atr7jna38ttkp73k7jt5",
  },
  production: {},
};

export const LIFETIME_LIMIT = 100;

export function paddleEnvironment(): "sandbox" | "production" {
  return process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox";
}

export function priceIdFor(choice: PriceChoice): string | null {
  return PRICES[paddleEnvironment()][`${choice.plan}:${choice.billing}`] ?? null;
}

/** The plan a Paddle price unlocks, from our own price table (never from data the buyer could change). */
export function planForPrice(priceId: string): PlanKey | null {
  const entry = Object.entries(PRICES[paddleEnvironment()]).find(([, id]) => id === priceId);
  return entry ? (entry[0].split(":")[0] as PlanKey) : null;
}

export function paddleConfigured() {
  return Boolean(process.env.PADDLE_API_KEY && process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN);
}

export async function paddleApi<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error("Paddle is not configured.");
  const base = paddleEnvironment() === "production" ? "https://api.paddle.com" : "https://sandbox-api.paddle.com";
  const response = await fetch(base + path, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Paddle ${init.method ?? "GET"} ${path} failed with HTTP ${response.status}: ${json?.error?.code ?? "unknown"}`);
  return json.data as T;
}

/**
 * Checkout carries the FastMix user id in custom_data. It's signed so a webhook can't be pointed at
 * another account by editing the checkout in the browser.
 */
function signingSecret() {
  const secret = process.env.INTERNAL_API_SECRET || process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) throw new Error("No secret is configured to sign checkouts.");
  return secret;
}

export function signUserId(userId: string) {
  return createHmac("sha256", signingSecret()).update(`fastmix-checkout:${userId}`).digest("hex");
}

export function verifiedUserId(customData: unknown): string | null {
  const data = customData as { user_id?: unknown; user_sig?: unknown } | null;
  if (!data || typeof data.user_id !== "string" || typeof data.user_sig !== "string") return null;
  return safeEqual(data.user_sig, signUserId(data.user_id)) ? data.user_id : null;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Checks a Paddle-Signature header ("ts=…;h1=…") against the raw body. Rejects anything older than five minutes. */
export function verifyWebhook(rawBody: string, header: string | null, secret: string, now = Date.now()) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(";").map((part) => part.split("=", 2) as [string, string]));
  const timestamp = Number(parts.ts);
  if (!parts.ts || !parts.h1 || !Number.isFinite(timestamp)) return false;
  if (Math.abs(now / 1000 - timestamp) > 300) return false;
  const expected = createHmac("sha256", secret).update(`${parts.ts}:${rawBody}`).digest("hex");
  return safeEqual(parts.h1, expected);
}
