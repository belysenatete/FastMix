"use client";

import { initializePaddle, Paddle } from "@paddle/paddle-js";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useLocale } from "@/components/locale-provider";
import { serverMessage } from "@/lib/studio-messages";

export type CheckoutChoice = { plan: "lite" | "pro" | "artist"; billing: "monthly" | "yearly" } | { plan: "lifetime"; billing: "once" };

// A visitor who picks a plan before having an account is sent to sign up; the studio picks the choice up afterwards.
const PENDING_KEY = "fastmix.checkout";

export function hasPendingCheckout() {
  try { return sessionStorage.getItem(PENDING_KEY) !== null; } catch { return false; }
}

export function takePendingCheckout(): CheckoutChoice | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    sessionStorage.removeItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as CheckoutChoice) : null;
  } catch {
    return null;
  }
}

let paddle: Promise<Paddle | undefined> | null = null;
function loadPaddle(environment: "sandbox" | "production") {
  const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
  if (!token) return Promise.resolve(undefined);
  paddle ??= initializePaddle({ environment, token });
  return paddle;
}

/**
 * Paddle's emailed payment links (and the account's default payment link) point at the pricing page with
 * ?_ptxn=…; Paddle.js opens that checkout by itself once it is initialized on the page.
 */
export function openPaymentLinkIfPresent() {
  if (!new URLSearchParams(window.location.search).has("_ptxn")) return;
  void loadPaddle(process.env.NEXT_PUBLIC_PADDLE_ENV === "production" ? "production" : "sandbox");
}

type CheckoutResponse = { error?: string; changed?: boolean; environment?: "sandbox" | "production"; priceId?: string; email?: string; customData?: Record<string, unknown> };

/** Opens Paddle checkout for a plan, switches an existing subscription, or sends a signed-out visitor to sign up first. */
export function useCheckout() {
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [changed, setChanged] = useState(false);

  const start = useCallback(async (choice: CheckoutChoice) => {
    setBusy(true); setError(""); setChanged(false);
    try {
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(choice) });
      const body = (await response.json().catch(() => ({}))) as CheckoutResponse;
      if (response.status === 401) {
        try { sessionStorage.setItem(PENDING_KEY, JSON.stringify(choice)); } catch { /* storage unavailable: they pick again after signing up */ }
        router.push("/signup");
        return;
      }
      if (!response.ok) { setError(serverMessage(body.error || "Checkout isn't available yet.", locale)); return; }
      if (body.changed) { setChanged(true); return; }
      const instance = await loadPaddle(body.environment ?? "sandbox");
      if (!instance || !body.priceId) { setError(serverMessage("Checkout isn't available yet.", locale)); return; }
      instance.Checkout.open({
        items: [{ priceId: body.priceId, quantity: 1 }],
        customer: { email: body.email ?? "" },
        customData: body.customData,
        settings: { displayMode: "overlay", theme: "dark", locale, successUrl: `${window.location.origin}/studio/billing?paid=1` },
      });
    } catch {
      setError(serverMessage("Checkout isn't available yet.", locale));
    } finally {
      setBusy(false);
    }
  }, [locale, router]);

  return { start, busy, error, changed };
}
