import type { Locale } from "@/lib/locale";
import { freePlan } from "@/lib/plans";

export type Usage = {
  plan: "starter" | "pro" | "artist";
  planName: string;
  formats: Array<"mp3" | "wav">;
  fullTracks: { used: number; limit: number; resetsAt: string };
  previews: { used: number; limit: number };
};

/** The signed-in account's plan and usage, or null when the audio service is unavailable. */
export async function fetchUsage(): Promise<Usage | null> {
  try {
    const response = await fetch("/api/account/usage", { cache: "no-store" });
    return response.ok ? await response.json() as Usage : null;
  } catch { return null; }
}

/** The day the monthly allowance resets, in the page language ("November 1" / "1 novembre"). */
export function resetDate(usage: Usage, locale: Locale) {
  return new Date(usage.fullTracks.resetsAt).toLocaleDateString(locale, { month: "long", day: "numeric" });
}

/** The plan's display name. The audio service sends English names, so the free plan takes its French name in French. */
export function planName(usage: Usage, locale: Locale) {
  return usage.plan === "starter" ? freePlan.name[locale] : usage.planName;
}
