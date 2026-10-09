"use client";

import Link from "next/link";
import { useState } from "react";

const questions = [
  ["Do I need mixing experience?", "No. Start with your tracks, then describe the sound you want in everyday language. The studio is designed to guide you through the process."],
  ["What should I upload?", "A beat or instrumental and separate vocal takes give the studio the most flexibility. You can also start with one finished track for mastering."],
  ["Can I change the sound after the first version?", "Yes. Each session keeps its direction and versions together so you can refine the prompt and request another pass."],
  ["What happens to my audio?", "Your files should stay private and under your control. Before launch, FastMix will publish clear storage, retention, and deletion policies."],
];

const quotes = [
  { quote: "I finally have a place to turn a rough idea into something I feel good sharing.", name: "Maya R.", role: "Independent artist" },
  { quote: "The workflow keeps me focused on the sound instead of getting lost in settings.", name: "Andre K.", role: "Songwriter and producer" },
  { quote: "Being able to come back, make a note, and try another direction feels natural.", name: "Noah T.", role: "Recording artist" },
];

const copy = {
  en: { solution: "The studio", pricing: "Plans", faq: "FAQ", login: "Log in", start: "Open the studio", eyebrow: "A clearer way to finish your sound", titleA: "Make room for", titleB: "the music.", subtitle: "Bring your tracks, describe what you hear in your head, and shape a mix that feels like yours.", primary: "Start a session", secondary: "See how it works", proof: "A calmer workflow for independent artists", method: "Your sound, in three simple moves", studioTitle: "Less menu diving. More making.", studioText: "FastMix gives your tracks a home, your direction a place to live, and every new version a clear path forward.", reviews: "Made for artists finding their sound", pricingTitle: "Room to grow, without the guesswork", faqTitle: "A few things artists ask", final: "Your next mix starts with an idea.", finalButton: "Create your workspace", copyright: "An independent artist studio." },
  fr: { solution: "Le studio", pricing: "Offres", faq: "FAQ", login: "Connexion", start: "Ouvrir le studio", eyebrow: "Une façon plus simple de finir votre son", titleA: "Faites place à", titleB: "la musique.", subtitle: "Ajoutez vos pistes, décrivez le son que vous imaginez et façonnez un mix qui vous ressemble.", primary: "Commencer une session", secondary: "Voir comment ça marche", proof: "Un flux de travail plus serein pour les artistes indépendants", method: "Votre son, en trois étapes simples", studioTitle: "Moins de menus. Plus de création.", studioText: "FastMix organise vos pistes, vos intentions et chaque nouvelle version dans un espace clair.", reviews: "Pensé pour les artistes en recherche de leur son", pricingTitle: "De la liberté pour avancer, sans surprise", faqTitle: "Les questions des artistes", final: "Votre prochain mix commence par une idée.", finalButton: "Créer votre espace", copyright: "Un studio pour les artistes indépendants." },
};

function Mark() {
  return <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /><i /></span>;
}

function Waveform({ compact = false }: { compact?: boolean }) {
  return <div className={`waveform${compact ? " waveform-compact" : ""}`} aria-hidden="true">{Array.from({ length: compact ? 34 : 72 }, (_, i) => <i key={i} style={{ "--bar": `${18 + Math.abs(Math.sin(i * 1.73)) * (compact ? 45 : 70)}%`, "--delay": `${(i % 9) * -0.13}s` } as React.CSSProperties} />)}</div>;
}

export default function LandingPage() {
  const [locale, setLocale] = useState<"en" | "fr">("en");
  const [billing, setBilling] = useState<"monthly" | "lifetime">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [quote, setQuote] = useState(0);
  const [showDemo, setShowDemo] = useState(false);
  const t = copy[locale];

  return <main className="marketing-shell">
    <header className="site-nav wrap">
      <Link href="/" className="brand"><Mark /><span>fastmix<span className="brand-dot">.</span></span></Link>
      <nav aria-label="Main navigation"><a href="#studio">{t.solution}</a><a href="#pricing">{t.pricing}</a><a href="#faq">{t.faq}</a></nav>
      <div className="nav-actions">
        <div className="locale-switch" role="group" aria-label="Language">
          <button aria-pressed={locale === "en"} onClick={() => setLocale("en")}>EN</button>
          <button aria-pressed={locale === "fr"} onClick={() => setLocale("fr")}>FR</button>
        </div>
        <Link className="nav-login" href="/login">{t.login}</Link>
        <Link className="button button-small button-lime" href="/signup">{t.start}<span aria-hidden="true">↗</span></Link>
      </div>
    </header>

    <section className="hero wrap" id="top">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-dot" />{t.eyebrow}</div>
        <h1>{t.titleA}<br /><em>{t.titleB}</em></h1>
        <p className="hero-subtitle">{t.subtitle}</p>
        <div className="hero-buttons"><Link className="button button-lime" href="/signup">{t.primary}<span aria-hidden="true">↗</span></Link><button className="button button-quiet" onClick={() => setShowDemo(true)}><span className="play-icon" aria-hidden="true">▶</span>{t.secondary}</button></div>
        <div className="hero-proof"><div className="avatar-stack"><i>J</i><i>M</i><i>A</i><i>+</i></div><span>{t.proof}</span></div>
      </div>
      <div className="hero-art" aria-label="Abstract audio waveform artwork">
        <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
        <div className="art-disc"><div className="disc-core"><Mark /></div></div>
        <div className="art-caption"><span className="live-dot" /> SESSION 001 <span>•</span> YOUR NEXT RELEASE</div>
        <div className="art-note note-top">01 / VOCALS</div><div className="art-note note-bottom">IN YOUR OWN WORDS</div>
        <Waveform />
      </div>
      <a className="scroll-cue" href="#how"><span /> SCROLL TO EXPLORE</a>
    </section>

    <section className="trust-strip"><div className="wrap trust-inner"><span>BUILT FOR THE WAY YOU MAKE MUSIC</span><div className="trust-stats"><strong>One space</strong><i /> <strong>Every version</strong><i /> <strong>Your direction</strong></div></div></section>

    <section className="section wrap" id="how">
      <div className="section-head"><span className="kicker">THE PROCESS</span><h2>{t.method}</h2><p>No studio jargon required. Start with what you have and shape the details as you go.</p></div>
      <div className="steps-grid">
        <article className="step-card"><div className="step-number">01 <span>— START</span></div><div className="step-visual tracks-visual"><span className="track-pill"><i className="track-dot dot-lime" />Beat.wav <b>01:42</b></span><span className="track-pill"><i className="track-dot dot-lilac" />Lead vocal.wav <b>01:42</b></span><span className="track-pill"><i className="track-dot dot-blue" />Ad-libs.wav <b>00:38</b></span><span className="add-track">＋</span></div><h3>Bring your tracks</h3><p>Drop in a beat, lead vocal, doubles, harmonies, ad-libs, or a single instrument.</p></article>
        <article className="step-card"><div className="step-number">02 <span>— DESCRIBE</span></div><div className="step-visual prompt-visual"><span className="prompt-label">YOUR DIRECTION</span><p>Warm vocal, close and clear.<br />A little space on the last words…<i /></p><div className="prompt-tags"><span>WARM</span><span>INTIMATE</span><span>+ ADD</span></div></div><h3>Say what you hear</h3><p>Describe the mood, vocal feel, effects, and energy in your own words.</p></article>
        <article className="step-card"><div className="step-number">03 <span>— REFINE</span></div><div className="step-visual result-visual"><div className="result-disc"><span>FM</span></div><div className="result-meta"><b>After the rain</b><small>Mix · Version 02</small><div className="mini-wave"><Waveform compact /></div></div><span className="result-play">▶</span></div><h3>Make it yours</h3><p>Listen, leave another direction, and keep your versions together.</p></article>
      </div>
    </section>

    <section className="studio-feature" id="studio"><div className="wrap feature-layout"><div className="feature-copy"><span className="kicker">A STUDIO THAT GETS OUT OF THE WAY</span><h2>{t.studioTitle}</h2><p>{t.studioText}</p><ul><li><span>↗</span> Every track has a clear place</li><li><span>↗</span> Prompts you can shape as you listen</li><li><span>↗</span> Versions stay easy to find</li></ul><Link className="text-link" href="/signup">{t.start} <span>↗</span></Link></div><div className="studio-window"><div className="window-top"><div className="window-brand"><Mark /> fastmix</div><span>SESSION / AFTER THE RAIN</span><span className="window-dots">•••</span></div><div className="window-main"><div className="window-side"><span className="side-active">Mix session</span><span>My library</span><span>Sound guide</span><div className="side-avatar">JR <small>Jules Rivers</small></div></div><div className="window-content"><div className="window-title"><div><small>YOUR STUDIO / MIXING</small><h3>After the rain</h3></div><button>Save session</button></div><div className="window-tracks"><div className="window-track"><span className="track-icon">♫</span><div><b>Beat</b><small>rainy-evening.wav</small></div><Waveform compact /></div><div className="window-track"><span className="track-icon purple">♫</span><div><b>Lead vocals</b><small>verse-and-hook.wav</small></div><Waveform compact /></div><div className="window-track"><span className="track-icon blue">♫</span><div><b>Backing vocals</b><small>harmonies.wav</small></div><Waveform compact /></div></div><div className="window-prompt"><small>YOUR MIX DIRECTION</small><p>Keep the lead close and warm. Let the harmony open up in the hook.</p></div><div className="window-submit"><span><i className="live-dot" /> Draft saved</span><button>Shape this mix <b>↗</b></button></div></div></div></div></div></section>

    <section className="section wrap testimonials"><div className="testimonial-head"><div><span className="kicker">NOT A PRESET. A STARTING POINT.</span><h2>{t.reviews}</h2></div><div className="carousel-controls"><button aria-label="Previous quote" onClick={() => setQuote((quote + quotes.length - 1) % quotes.length)}>←</button><span>0{quote + 1} <i>/</i> 0{quotes.length}</span><button aria-label="Next quote" onClick={() => setQuote((quote + 1) % quotes.length)}>→</button></div></div><div className="quote-card"><div className="quote-glyph">“</div><blockquote>{quotes[quote].quote}</blockquote><div className="quote-person"><div className="quote-avatar">{quotes[quote].name[0]}</div><div><b>{quotes[quote].name}</b><small>{quotes[quote].role}</small></div><div className="quote-stars" aria-label="5 out of 5 stars">★★★★★</div></div></div></section>

    <section className="pricing-section" id="pricing"><div className="wrap"><div className="section-head"><span className="kicker">SIMPLE BY DESIGN</span><h2>{t.pricingTitle}</h2><p>Start with the studio. Choose a plan when you're ready to make it part of your process.</p></div><div className="billing-switch" role="group" aria-label="Billing period"><button aria-pressed={billing === "monthly"} onClick={() => setBilling("monthly")}>Monthly</button><button aria-pressed={billing === "lifetime"} onClick={() => setBilling("lifetime")}>Lifetime <span>ONE-TIME</span></button></div><div className="plan-grid"><article className="plan-card"><span className="plan-label">THE FIRST LISTEN</span><h3>Starter</h3><p>Try the workflow and find your direction.</p><div className="plan-price">Free <small>to explore</small></div><ul><li>One mix workspace</li><li>Prompt and sound guide</li><li>Version notes</li></ul><Link href="/signup" className="button button-outline">Start exploring <span>↗</span></Link></article><article className="plan-card plan-featured"><div className="plan-ribbon">FOR YOUR NEXT RELEASE</div><span className="plan-label">THE FULL STUDIO</span><h3>Studio</h3><p>For artists ready to make more, together.</p><div className="plan-price plan-price-lime">{billing === "monthly" ? "Coming soon" : "Coming soon"}<small>{billing === "monthly" ? "monthly plan" : "one-time plan"}</small></div><ul><li>Mix and mastering sessions</li><li>Unlimited project versions</li><li>High-quality downloads</li></ul><Link href="/signup" className="button button-lime">Join the early list <span>↗</span></Link></article></div><p className="pricing-note">Plans and processing availability will be confirmed before launch. No payment is collected in this preview.</p></div></section>

    <section className="section wrap faq-section" id="faq"><div className="faq-intro"><span className="kicker">GOOD TO KNOW</span><h2>{t.faqTitle}</h2><p>Need more help? Visit the <Link href="/faq">full FAQ</Link> or <a href="mailto:hello@fastmix.example">get in touch</a>.</p></div><div className="faq-list">{questions.map(([question, answer], index) => <article key={question} className={`faq-item${openFaq === index ? " faq-open" : ""}`}><button aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? null : index)}><span>{question}</span><i>{openFaq === index ? "−" : "+"}</i></button>{openFaq === index && <p>{answer}</p>}</article>)}</div></section>

    <section className="final-cta"><div className="wrap cta-inner"><div className="cta-orbit" aria-hidden="true"><Mark /></div><div><span className="kicker">YOUR NEXT CHAPTER</span><h2>{t.final}</h2><p>Bring a track. Bring a feeling. We'll make the space.</p></div><Link className="button button-lime" href="/signup">{t.finalButton}<span>↗</span></Link></div></section>

    <footer className="site-footer"><div className="wrap footer-main"><div className="footer-brand"><Link href="/" className="brand"><Mark /><span>fastmix<span className="brand-dot">.</span></span></Link><p>{t.copyright}<br />Make a little more room for the music.</p></div><div className="footer-col"><b>EXPLORE</b><a href="#studio">The studio</a><a href="#pricing">Plans</a><Link href="/faq">FAQ</Link></div><div className="footer-col"><b>YOUR SPACE</b><Link href="/login">Log in</Link><Link href="/signup">Create account</Link><Link href="/studio/guide">Sound guide</Link></div><div className="footer-col"><b>INFORMATION</b><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/cookies">Cookies</Link></div></div><div className="wrap footer-bottom"><span>© {new Date().getFullYear()} FastMix Studio</span><span>Made for the music you haven't finished yet.</span><div className="footer-locale"><button onClick={() => setLocale("en")}>EN</button><button onClick={() => setLocale("fr")}>FR</button></div></div></footer>

    {showDemo && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowDemo(false); }}><section className="demo-modal" role="dialog" aria-modal="true" aria-labelledby="demo-title"><button className="modal-close" aria-label="Close demo" onClick={() => setShowDemo(false)}>×</button><span className="kicker">THE FASTMIX WORKFLOW</span><h2 id="demo-title">Three steps. Your sound.</h2><div className="demo-preview"><Mark /><Waveform /><span>PREVIEW TOUR</span></div><p>This preview shows the product flow. Audio examples will be added when licensed samples are ready.</p><button className="button button-lime" onClick={() => setShowDemo(false)}>Got it</button></section></div>}
  </main>;
}
