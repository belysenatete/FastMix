import type { Metadata } from "next";
import Link from "next/link";
import PlanPicker from "@/components/plan-picker";
import { SimplePage } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return <SimplePage label="Pricing" title="Less than one studio session." intro="Preview as much as you like for free. Pick a plan when you're ready to download full-length tracks.">
    <PlanPicker />
    <div className="prose legal">
      <h2>How tracks are counted</h2>
      <p>A track is one full-length mix or master that you choose to render. Previews and refinement notes are always free and never use a track. If you refine a song and render the new version in full, that counts as another track. Downloading a version you already rendered is free.</p>
      <h2>Monthly or yearly</h2>
      <p>Both include the same tracks every month. Monthly plans renew each month; yearly plans are paid once a year and cost the same as ten months. Either can be cancelled at any time and stays active until the end of the period you paid for. See the <Link href="/terms">Terms</Link> for cancellation and refunds.</p>
    </div>
  </SimplePage>;
}
