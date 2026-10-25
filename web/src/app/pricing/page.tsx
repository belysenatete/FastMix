import type { Metadata } from "next";
import Link from "next/link";
import { SimplePage } from "@/components/site-chrome";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return <SimplePage label="Pricing" title="Try it free. Pay when it's part of your process." intro="FastMix is in preview. Monthly and lifetime plans will be announced before launch.">
    <div className="plan-grid">
      <article className="plan"><h3>Starter</h3><p className="plan-price">Free</p><ul><li>Unlimited 30-second previews</li><li>Refinement notes and version history</li><li>Sound guide</li></ul><Link className="btn btn-secondary" href="/signup">Start a free session</Link></article>
      <article className="plan plan-featured"><h3>Studio</h3><p className="plan-price">Coming soon</p><ul><li>Full-length mixes and masters</li><li>Monthly or lifetime plans</li><li>WAV downloads</li></ul><Link className="btn btn-primary" href="/signup">Join the early list</Link></article>
    </div>
    <p className="fine-print">No payment is collected during the preview.</p>
  </SimplePage>;
}
