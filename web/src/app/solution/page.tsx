import type { Metadata } from "next";
import Link from "next/link";
import { SimplePage } from "@/components/site-chrome";

export const metadata: Metadata = { title: "How it works" };

const steps = [
  ["Add your tracks", "Upload a beat and your vocal. Add doubles, backing vocals, ad-libs or instruments as separate files for more control."],
  ["Describe the sound", "Name the style and what you want to hear: “afrobeats, vocal upfront, light autotune, some reverb”."],
  ["Listen and refine", "Get a free 30-second preview. Ask for changes in a short note; every version is kept."],
  ["Download", "When it sounds right, get the full-length track as a WAV file ready for streaming."],
];

export default function SolutionPage() {
  return <SimplePage label="How it works" title="From rough tracks to a finished mix" intro="FastMix brings your tracks, your direction and every version of the mix into one place.">
    <ol className="steps steps-stacked">{steps.map(([title, text], index) => <li key={title}><span className="step-number">{index + 1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol>
    <p className="page-actions"><Link className="btn btn-primary" href="/signup">Start a free session</Link></p>
  </SimplePage>;
}
