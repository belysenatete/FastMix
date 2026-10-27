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

export function resetDate(usage: Usage) {
  return new Date(usage.fullTracks.resetsAt).toLocaleDateString(undefined, { month: "long", day: "numeric" });
}
