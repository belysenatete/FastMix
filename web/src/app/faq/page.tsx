import Link from "next/link";

const items = [
  ["How does FastMix work?", "Add your source tracks, describe the mix direction you want, and follow the session as it moves through processing. This preview focuses on the workflow; production audio processing will be connected before launch."],
  ["My mix is taking a while", "Processing can take time depending on track length and the selected tools. The studio will show the job state and let you know if it needs attention."],
  ["My vocals sound like a phone", "Start with the cleanest recording available. Avoid clipping, leave some headroom, and include a clear direction for the vocal tone you want."],
  ["The autotune sounds robotic", "Autotune is applied only when your direction mentions it. Ask for \"subtle autotune\" for natural correction or \"hard autotune\" for the effect, and add the song key (for example \"in A minor\") to keep notes in the scale."],
  ["Can I download WAV?", "High-quality download options are planned for completed sessions. Exact format availability depends on the processing configuration."],
  ["Can I redo a mix?", "Yes. A new direction should create a new version so you can compare it with earlier work."],
  ["My track is missing bass", "Check the source track first, then mention whether you want more low end, a tighter kick, or more separation in your mix notes."],
];

export default function FAQPage() {
  return <main className="simple-page"><header className="simple-nav"><Link className="brand" href="/"><span className="brand-mark"><i/><i/><i/><i/><i/></span><span>fastmix<span className="brand-dot">.</span></span></Link><Link href="/">Home</Link></header><section className="simple-content"><span className="kicker">THE SOUND GUIDE</span><h1>Good questions.<br/><em>Clear answers.</em></h1><p className="simple-lede">A few practical notes to help you get more from the studio.</p><div className="faq-list simple-faq">{items.map(([q,a])=><details className="faq-item" key={q}><summary>{q}<i>＋</i></summary><p>{a}</p></details>)}</div><Link className="button button-lime" href="/studio/guide">Open the sound guide <span>↗</span></Link></section><footer className="simple-footer">Need more help? <a href="mailto:hello@fastmix.example">Contact the team</a></footer></main>;
}
