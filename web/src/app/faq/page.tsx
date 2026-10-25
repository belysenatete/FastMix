import type { Metadata } from "next";
import Link from "next/link";
import { SimplePage } from "@/components/site-chrome";

export const metadata: Metadata = { title: "FAQ" };

const items = [
  ["How does FastMix work?", "Add your beat and vocal tracks, describe the sound you want, and FastMix creates a free 30-second preview. Refine it with short notes, then download the full track."],
  ["How long does a mix take?", "A preview usually takes one to two minutes. Getting the full track after a preview takes a few seconds."],
  ["My vocals sound like a phone recording", "Record in a quiet room, close to the microphone, and avoid clipping. Then ask for “vocal upfront” or “warmer vocal” in your direction."],
  ["The autotune sounds robotic", "Autotune only runs when your direction asks for it. Write “subtle autotune” for natural correction or “hard autotune” for the effect, and add the key (for example “in A minor”) to keep notes in the scale."],
  ["Can I download WAV?", "Yes. Full tracks download as WAV files, kept under −1 dBTP so they're ready for streaming platforms."],
  ["Can I redo a mix?", "Yes. Each note creates a new version, and earlier versions stay in your library."],
  ["My track is missing bass", "Check that the bass is in your beat file, then ask for “more low end” or “punchier” in your note."],
];

export default function FAQPage() {
  return <SimplePage label="Help" title="Frequently asked questions" intro="Short answers to the questions artists ask most.">
    <div className="faq">{items.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
    <p className="page-actions"><Link className="btn btn-primary" href="/studio/guide">Open the sound guide</Link><a className="btn btn-secondary" href="mailto:hello@fastmix.example">Contact us</a></p>
  </SimplePage>;
}
