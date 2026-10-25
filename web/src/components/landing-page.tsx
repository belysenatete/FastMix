"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Locale, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { formatClock, LevelMeter, useAudioLevel } from "@/components/transport";

const copy = {
  en: {
    title: "Your vocals, mixed and mastered in minutes.",
    subtitle: "Upload your beat and your vocal, describe the sound in plain words, and get a mix you can keep refining until it's right.",
    primary: "Start a free session",
    secondary: "Hear an example",
    facts: ["Free 30-second previews", "WAV downloads", "English or French directions"],
    card: { title: "Summer party", version: "Version 2", beat: "Beat", vocal: "Lead vocal", direction: "Afrobeats party, vocals upfront, light autotune, some reverb", note: "Your note: “vocal louder”", status: "Preview ready" },
    howLabel: "How it works",
    howTitle: "Three steps, no studio jargon.",
    steps: [
      ["Add your tracks", "A beat and your vocal are all you need. Add doubles, backing vocals or ad-libs if you have them."],
      ["Describe the sound", "Write it the way you'd tell an engineer: “afrobeats, vocal upfront, light autotune, more reverb”."],
      ["Listen, refine, download", "Start with a free preview, ask for changes in a short note, then download the full track."],
    ],
    listenLabel: "Listen",
    listenTitle: "Same take. Same beat. A different mix.",
    listenText: "Switch between the raw tracks and the FastMix version while it plays.",
    before: "Before", after: "After", play: "Play", pause: "Pause",
    listenNote: "Demo made from original synthesized tracks with FastMix's local engine: vocal balance, autotune in A minor, reverb and loudness. Both versions are loudness-matched.",
    askLabel: "What you can ask for",
    askTitle: "Say it your way. FastMix turns it into settings.",
    stylesTitle: "Styles",
    styles: ["Afrobeats", "Trap & drill", "Reggaeton", "Hip-hop & RnB", "Pop", "Lo-fi", "House & techno", "Rock & indie", "Acoustic"],
    soundTitle: "Sound",
    sound: ["Vocal louder or quieter", "More or less reverb", "Subtle or hard autotune", "Autotune in a key", "Louder and punchier", "More dynamic"],
    pricingLabel: "Pricing",
    pricingTitle: "Try it free. Pay when it's part of your process.",
    starter: { name: "Starter", price: "Free", items: ["Unlimited 30-second previews", "Refinement notes and version history", "Sound guide"], cta: "Start a free session" },
    studio: { name: "Studio", price: "Coming soon", items: ["Full-length mixes and masters", "Monthly or lifetime plans", "WAV downloads"], cta: "Join the early list" },
    pricingNote: "Plans are announced before launch. No payment is collected during the preview.",
    faqLabel: "Questions",
    faqTitle: "Good to know",
    faqs: [
      ["Do I need mixing experience?", "No. Upload your tracks and describe the sound in everyday words. FastMix chooses the settings."],
      ["What should I upload?", "A beat and a separate vocal recording give the best results. In Master mode you can upload one finished song instead."],
      ["Can I change the result?", "Yes. Write a short note such as “vocal louder” or “more reverb” to get a new version. Earlier versions stay in your library."],
      ["Does it fix timing or key?", "No. The mix balances, cleans and masters your recording, and autotune fine-tunes notes, but it can't move words onto the beat or change the song's key. Record while listening to the beat for the best result."],
      ["What happens to my audio?", "Your files are private to your account and can be deleted from your library at any time. AI processing sends them to our mixing partner, RoEx."],
    ],
    moreQuestions: "More questions",
    ctaTitle: "Got a beat and a vocal? Start your mix.",
    ctaButton: "Create your free account",
  },
  fr: {
    title: "Vos voix, mixées et masterisées en quelques minutes.",
    subtitle: "Importez votre beat et votre voix, décrivez le son avec vos mots, et obtenez un mix que vous pouvez affiner jusqu'à ce qu'il soit parfait.",
    primary: "Commencer gratuitement",
    secondary: "Écouter un exemple",
    facts: ["Aperçus gratuits de 30 secondes", "Téléchargement en WAV", "Consignes en français ou en anglais"],
    card: { title: "Soirée d'été", version: "Version 2", beat: "Beat", vocal: "Voix lead", direction: "Afrobeats festif, voix devant, autotune léger, un peu de réverbe", note: "Votre note : « voix plus forte »", status: "Aperçu prêt" },
    howLabel: "Comment ça marche",
    howTitle: "Trois étapes, sans jargon de studio.",
    steps: [
      ["Ajoutez vos pistes", "Un beat et votre voix suffisent. Ajoutez des doublages, des chœurs ou des backs si vous en avez."],
      ["Décrivez le son", "Écrivez-le comme à un ingénieur du son : « afrobeats, voix devant, autotune léger, plus de réverbe »."],
      ["Écoutez, affinez, téléchargez", "Commencez par un aperçu gratuit, demandez des changements en une phrase, puis téléchargez le morceau complet."],
    ],
    listenLabel: "Écouter",
    listenTitle: "Même prise. Même beat. Un autre mix.",
    listenText: "Passez des pistes brutes à la version FastMix pendant la lecture.",
    before: "Avant", after: "Après", play: "Lecture", pause: "Pause",
    listenNote: "Démo créée à partir de pistes synthétisées originales avec le moteur local de FastMix : équilibre de la voix, autotune en la mineur, réverbe et volume. Les deux versions ont le même niveau sonore.",
    askLabel: "Ce que vous pouvez demander",
    askTitle: "Dites-le à votre façon. FastMix le traduit en réglages.",
    stylesTitle: "Styles",
    styles: ["Afrobeats", "Trap et drill", "Reggaeton", "Rap et RnB", "Pop", "Lo-fi", "House et techno", "Rock et indé", "Acoustique"],
    soundTitle: "Son",
    sound: ["Voix plus forte ou plus basse", "Plus ou moins de réverbe", "Autotune léger ou fort", "Autotune dans une tonalité", "Plus fort, plus de punch", "Plus dynamique"],
    pricingLabel: "Tarifs",
    pricingTitle: "Essayez gratuitement. Payez quand ça fait partie de votre routine.",
    starter: { name: "Découverte", price: "Gratuit", items: ["Aperçus de 30 secondes illimités", "Notes d'ajustement et historique des versions", "Guide du son"], cta: "Commencer gratuitement" },
    studio: { name: "Studio", price: "Bientôt", items: ["Mixes et masters complets", "Formules mensuelle ou à vie", "Téléchargement en WAV"], cta: "Rejoindre la liste" },
    pricingNote: "Les offres seront annoncées avant le lancement. Aucun paiement n'est demandé pendant l'aperçu.",
    faqLabel: "Questions",
    faqTitle: "Bon à savoir",
    faqs: [
      ["Faut-il savoir mixer ?", "Non. Importez vos pistes et décrivez le son avec des mots simples. FastMix choisit les réglages."],
      ["Que dois-je importer ?", "Un beat et une voix enregistrée séparément donnent les meilleurs résultats. En mode Master, vous pouvez importer un morceau fini."],
      ["Puis-je modifier le résultat ?", "Oui. Écrivez une courte note comme « voix plus forte » ou « plus de réverbe » pour obtenir une nouvelle version. Les versions précédentes restent dans votre bibliothèque."],
      ["Le mix corrige-t-il le rythme ou la tonalité ?", "Non. Le mix équilibre, nettoie et masterise votre enregistrement, et l'autotune ajuste les notes, mais il ne peut pas recaler les paroles sur le beat ni changer la tonalité. Enregistrez en écoutant le beat pour un meilleur résultat."],
      ["Que devient mon audio ?", "Vos fichiers sont privés et peuvent être supprimés de votre bibliothèque à tout moment. Le traitement par IA les envoie à notre partenaire de mixage, RoEx."],
    ],
    moreQuestions: "Plus de questions",
    ctaTitle: "Un beat et une voix ? Lancez votre mix.",
    ctaButton: "Créer un compte gratuit",
  },
};

type Copy = (typeof copy)["en"];

/** A/B player: both versions stay in sync so switching keeps the playback position. */
function BeforeAfter({ t }: { t: Copy }) {
  const before = useRef<HTMLAudioElement>(null);
  const after = useRef<HTMLAudioElement>(null);
  const [elements, setElements] = useState<{ before: HTMLAudioElement | null; after: HTMLAudioElement | null }>({ before: null, after: null });
  const [side, setSide] = useState<"before" | "after">("before");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const active = () => (side === "before" ? before : after).current;
  const level = useAudioLevel(elements[side], playing);

  useEffect(() => { setElements({ before: before.current, after: after.current }); }, []);

  useEffect(() => {
    // The browser can load metadata before hydration attaches onDurationChange, so read it once on mount too.
    const audio = before.current;
    if (audio && audio.readyState >= 1) {
      const known = audio.duration;
      queueMicrotask(() => setDuration(known || 0));
    }
  }, []);

  function choose(next: "before" | "after") {
    if (next === side) return;
    const from = active();
    const to = (next === "before" ? before : after).current;
    if (from && to) {
      to.currentTime = from.currentTime;
      if (playing) { from.pause(); void to.play(); }
    }
    setSide(next);
  }

  function toggle() {
    const audio = active();
    if (!audio) return;
    if (playing) audio.pause(); else void audio.play();
  }

  const events = (name: "before" | "after") => ({
    onPlay: () => { if (name === side) setPlaying(true); },
    onPause: () => { if (name === side) setPlaying(false); },
    onEnded: () => { if (name === side) { setPlaying(false); setTime(0); } },
    onTimeUpdate: (event: React.SyntheticEvent<HTMLAudioElement>) => { if (name === side) setTime(event.currentTarget.currentTime); },
    onDurationChange: (event: React.SyntheticEvent<HTMLAudioElement>) => { if (name === "before") setDuration(event.currentTarget.duration || 0); },
  });

  return <section className="section" id="listen">
    <div className="container narrow">
      <p className="label">{t.listenLabel}</p>
      <h2>{t.listenTitle}</h2>
      <p className="lede">{t.listenText}</p>
      <div className="ab-player">
        <button className="ab-play" onClick={toggle} aria-label={playing ? t.pause : t.play}>{playing ? "❚❚" : "▶"}</button>
        <div className="segmented" role="group" aria-label={`${t.before} / ${t.after}`}>
          <button aria-pressed={side === "before"} onClick={() => choose("before")}>{t.before}</button>
          <button aria-pressed={side === "after"} onClick={() => choose("after")}>{t.after}</button>
        </div>
        <div className="ab-progress" aria-hidden="true"><i style={{ width: `${duration ? (time / duration) * 100 : 0}%` }} /></div>
        <span className="transport-clock">{formatClock(time)}</span>
        <LevelMeter level={level} />
        <audio ref={before} src="/demo/mix-before.mp3" crossOrigin="anonymous" preload="metadata" {...events("before")} />
        <audio ref={after} src="/demo/mix-after.mp3" crossOrigin="anonymous" preload="metadata" {...events("after")} />
      </div>
      <p className="fine-print">{t.listenNote}</p>
    </div>
  </section>;
}

function SessionSheet({ t }: { t: Copy }) {
  return <figure className="session-sheet" aria-label={`${t.card.title}, ${t.card.version}`}>
    <div className="sheet-head"><b>{t.card.title}</b><span>{t.card.version}</span></div>
    <ul className="sheet-tracks">
      <li><span className="chip chip-beat">{t.card.beat}</span><span>beat.wav</span><span>1:56</span></li>
      <li><span className="chip chip-vocal">{t.card.vocal}</span><span>vocal.wav</span><span>1:56</span></li>
    </ul>
    <blockquote>“{t.card.direction}”</blockquote>
    <p className="sheet-note">{t.card.note}</p>
    <div className="sheet-status"><span className="play-dot" aria-hidden="true">▶</span><b>{t.card.status}</b><span className="sheet-bar" aria-hidden="true"><i /></span><span>0:30</span></div>
  </figure>;
}

export default function LandingPage() {
  const [locale, setLocale] = useState<Locale>("en");
  const t = copy[locale];

  return <>
    <SiteHeader locale={locale} onLocale={setLocale} />
    <main>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <h1>{t.title}</h1>
            <p className="lede">{t.subtitle}</p>
            <div className="button-row"><Link className="btn btn-primary btn-large" href="/signup">{t.primary}</Link><a className="btn btn-secondary btn-large" href="#listen">{t.secondary}</a></div>
            <ul className="fact-list">{t.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
          </div>
          <SessionSheet t={t} />
        </div>
      </section>

      <section className="section section-alt" id="how">
        <div className="container">
          <p className="label">{t.howLabel}</p>
          <h2>{t.howTitle}</h2>
          <ol className="steps">{t.steps.map(([title, text], index) => <li key={title}><span className="step-number">{index + 1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol>
        </div>
      </section>

      <BeforeAfter t={t} />

      <section className="section section-alt">
        <div className="container">
          <p className="label">{t.askLabel}</p>
          <h2>{t.askTitle}</h2>
          <div className="ask-grid">
            <div><h3>{t.stylesTitle}</h3><ul className="tag-list">{t.styles.map((item) => <li key={item}>{item}</li>)}</ul></div>
            <div><h3>{t.soundTitle}</h3><ul className="tag-list">{t.sound.map((item) => <li key={item}>{item}</li>)}</ul></div>
          </div>
        </div>
      </section>

      <section className="section" id="pricing">
        <div className="container">
          <p className="label">{t.pricingLabel}</p>
          <h2>{t.pricingTitle}</h2>
          <div className="plan-grid">
            {[t.starter, t.studio].map((plan, index) => <article key={plan.name} className={`plan${index === 1 ? " plan-featured" : ""}`}>
              <h3>{plan.name}</h3>
              <p className="plan-price">{plan.price}</p>
              <ul>{plan.items.map((item) => <li key={item}>{item}</li>)}</ul>
              <Link className={`btn ${index === 1 ? "btn-primary" : "btn-secondary"}`} href="/signup">{plan.cta}</Link>
            </article>)}
          </div>
          <p className="fine-print">{t.pricingNote}</p>
        </div>
      </section>

      <section className="section section-alt" id="faq">
        <div className="container narrow">
          <p className="label">{t.faqLabel}</p>
          <h2>{t.faqTitle}</h2>
          <div className="faq">{t.faqs.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
          <Link className="text-link" href="/faq">{t.moreQuestions} →</Link>
        </div>
      </section>

      <section className="cta-band">
        <div className="container cta-inner"><h2>{t.ctaTitle}</h2><Link className="btn btn-light btn-large" href="/signup">{t.ctaButton}</Link></div>
      </section>
    </main>
    <SiteFooter locale={locale} />
  </>;
}
