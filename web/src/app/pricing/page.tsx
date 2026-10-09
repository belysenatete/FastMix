import Link from "next/link";

export default function PricingPage() {
  return <main className="simple-page"><header className="simple-nav"><Link className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/><i/></span><span>fastmix<span className="brand-dot">.</span></span></Link><Link href="/">Home</Link></header><section className="simple-content"><span className="kicker">PRICING</span><h1>Start with a preview.<br/><em>Grow when you&apos;re ready.</em></h1><p className="simple-lede">FastMix is in preview. Monthly and lifetime options are planned; final plans and processing availability will be announced before launch.</p><div className="pricing-early"><b>Early access</b><p>No payment is collected in this preview. Create a local workspace and explore the product flow.</p><Link className="button button-lime" href="/signup">Join the preview <span>↗</span></Link></div></section></main>;
}
