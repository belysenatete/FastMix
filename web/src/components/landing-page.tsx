"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PlanPicker from "@/components/plan-picker";
import { Locale, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { formatClock, LevelMeter, useAudioLevel } from "@/components/transport";
import { demoWaveforms } from "@/components/demo-waveforms";

const copy = {
  en: {
    title: "Your vocals, mixed and mastered in minutes.",
    subtitle: "Upload your beat and your vocal, describe the sound in plain words, and get a mix you can keep refining until it's right.",
    primary: "Start a free session",
    secondary: "Hear an example",
    facts: ["Free 30-second previews", "MP3 and WAV downloads", "Autotune built in"],
    card: { title: "Summer party", version: "Version 2", beat: "Beat", vocal: "Lead vocal", v1: "Afrobeats party, vocals upfront, light autotune, some reverb", v2: "Vocal a bit louder", status: "Ready", settingsTitle: "What FastMix set", settings: [["Style", "Afrobeats"], ["Vocal", "+2 dB"], ["Autotune", "Light"], ["Reverb", "Some"]] },
    howLabel: "How it works",
    howTitle: "Three steps, no studio jargon.",
    steps: [
      ["Add your tracks", "A beat and your vocal are all you need. Add doubles, backing vocals or ad-libs if you have them."],
      ["Describe the sound", "Write it the way you'd tell an engineer: “afrobeats, vocal upfront, light autotune, more reverb”."],
      ["Listen, refine, download", "Start with a free preview, ask for changes in a short note, then download the full track."],
    ],
    listenLabel: "Listen",
    listenTitle: "Hear the difference.",
    listenText: "Same song, before and after FastMix. Switch while it plays.",
    before: "Before", after: "After", play: "Play", pause: "Pause",
    demoTabs: { mix: "Mixing", master: "Mastering" },
    listenNotes: {
      mix: "Demo song made with AI. Before: the lead vocal on its own, separated from the song and only turned up in volume. After: that vocal and the instrumental through FastMix's AI mix.",
      master: "Demo song made with AI. Before: the unmastered mix, unchanged. After: the same 29 seconds through FastMix's AI mastering. The extra loudness is part of mastering, so the two are not level-matched.",
    },
    askLabel: "What you can ask for",
    askTitle: "Say it your way. FastMix turns it into settings.",
    stylesTitle: "Styles",
    styles: ["Afrobeats", "Trap & drill", "Reggaeton", "Hip-hop & RnB", "Pop", "Lo-fi", "House & techno", "Rock & indie", "Acoustic"],
    soundTitle: "Sound",
    sound: ["Vocal louder or quieter", "More or less reverb", "Subtle or hard autotune", "Autotune in a key", "Louder and punchier", "More dynamic"],
    pricingLabel: "Pricing",
    pricingTitle: "Less than one studio session.",
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
    facts: ["Aperçus gratuits de 30 secondes", "Téléchargement en MP3 et WAV", "Autotune intégré"],
    card: { title: "Soirée d'été", version: "Version 2", beat: "Beat", vocal: "Voix lead", v1: "Afrobeats festif, voix devant, autotune léger, un peu de réverbe", v2: "Voix un peu plus forte", status: "Prêt", settingsTitle: "Réglages choisis par FastMix", settings: [["Style", "Afrobeats"], ["Voix", "+2 dB"], ["Autotune", "Léger"], ["Réverbe", "Un peu"]] },
    howLabel: "Comment ça marche",
    howTitle: "Trois étapes, sans jargon de studio.",
    steps: [
      ["Ajoutez vos pistes", "Un beat et votre voix suffisent. Ajoutez des doublages, des chœurs ou des backs si vous en avez."],
      ["Décrivez le son", "Écrivez-le comme à un ingénieur du son : « afrobeats, voix devant, autotune léger, plus de réverbe »."],
      ["Écoutez, affinez, téléchargez", "Commencez par un aperçu gratuit, demandez des changements en une phrase, puis téléchargez le morceau complet."],
    ],
    listenLabel: "Écouter",
    listenTitle: "Écoutez la différence.",
    listenText: "Le même morceau, avant et après FastMix. Changez pendant la lecture.",
    before: "Avant", after: "Après", play: "Lecture", pause: "Pause",
    demoTabs: { mix: "Mixage", master: "Mastering" },
    listenNotes: {
      mix: "Morceau de démo créé avec l'IA. Avant : la voix lead seule, séparée du morceau et simplement montée en volume. Après : cette voix et l'instrumental passés dans le mixage IA de FastMix.",
      master: "Morceau de démo créé avec l'IA. Avant : le mix non masterisé, tel quel. Après : les mêmes 29 secondes passées dans le mastering IA de FastMix. Le gain de volume fait partie du mastering : les deux versions n'ont donc pas le même niveau.",
    },
    askLabel: "Ce que vous pouvez demander",
    askTitle: "Dites-le à votre façon. FastMix le traduit en réglages.",
    stylesTitle: "Styles",
    styles: ["Afrobeats", "Trap et drill", "Reggaeton", "Rap et RnB", "Pop", "Lo-fi", "House et techno", "Rock et indé", "Acoustique"],
    soundTitle: "Son",
    sound: ["Voix plus forte ou plus basse", "Plus ou moins de réverbe", "Autotune léger ou fort", "Autotune dans une tonalité", "Plus fort, plus de punch", "Plus dynamique"],
    pricingLabel: "Tarifs",
    pricingTitle: "Moins cher qu'une session en studio.",
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

type Demo = "mix" | "master";

/** Listen section: Mixing and Mastering demos, each in an A/B player. */
function BeforeAfter({ t }: { t: Copy }) {
  const [demo, setDemo] = useState<Demo>("mix");
  return <section className="section" id="listen">
    <div className="container narrow">
      <p className="label">{t.listenLabel}</p>
      <h2>{t.listenTitle}</h2>
      <p className="lede">{t.listenText}</p>
      <div className="tabs demo-tabs" role="tablist" aria-label={t.listenLabel}>
        {(["mix", "master"] as const).map((name) => <button key={name} role="tab" id={`demo-tab-${name}`} aria-controls="demo-panel" aria-selected={demo === name} onClick={() => setDemo(name)}>{t.demoTabs[name]}</button>)}
      </div>
      <div role="tabpanel" id="demo-panel" aria-labelledby={`demo-tab-${demo}`}>
        {/* A new player per demo, so switching tabs stops playback and resets the position. */}
        <ABPlayer key={demo} t={t} demo={demo} />
        <p className="fine-print">{t.listenNotes[demo]}</p>
      </div>
    </div>
  </section>;
}

/** A/B player: both versions stay in sync so switching keeps the playback position. */
function ABPlayer({ t, demo }: { t: Copy; demo: Demo }) {
  const before = useRef<HTMLAudioElement>(null);
  const after = useRef<HTMLAudioElement>(null);
  const [elements, setElements] = useState<{ before: HTMLAudioElement | null; after: HTMLAudioElement | null }>({ before: null, after: null });
  const [side, setSide] = useState<"before" | "after">("before");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const active = () => (side === "before" ? before : after).current;
  const level = useAudioLevel(elements[side], playing);
  const bars = demoWaveforms[`${demo}-${side}`];
  const played = duration ? time / duration : 0;

  useEffect(() => {
    const pair = { before: before.current, after: after.current };
    setElements(pair);
    // A detached element can keep playing, so stop both when this player goes away.
    return () => { pair.before?.pause(); pair.after?.pause(); };
  }, []);

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

  function seek(event: React.MouseEvent<HTMLDivElement>) {
    const audio = active();
    if (!audio || !duration) return;
    const box = event.currentTarget.getBoundingClientRect();
    audio.currentTime = Math.min(duration, Math.max(0, ((event.clientX - box.left) / box.width) * duration));
    setTime(audio.currentTime);
  }

  const events = (name: "before" | "after") => ({
    onPlay: () => { if (name === side) setPlaying(true); },
    onPause: () => { if (name === side) setPlaying(false); },
    onEnded: () => { if (name === side) { setPlaying(false); setTime(0); } },
    onTimeUpdate: (event: React.SyntheticEvent<HTMLAudioElement>) => { if (name === side) setTime(event.currentTarget.currentTime); },
    onDurationChange: (event: React.SyntheticEvent<HTMLAudioElement>) => { if (name === "before") setDuration(event.currentTarget.duration || 0); },
  });

  return <div className="ab-player">
    <button className="ab-play" onClick={toggle} aria-label={playing ? t.pause : t.play}>{playing ? "❚❚" : "▶"}</button>
    <div className="segmented" role="group" aria-label={`${t.before} / ${t.after}`}>
      <button aria-pressed={side === "before"} onClick={() => choose("before")}>{t.before}</button>
      <button aria-pressed={side === "after"} onClick={() => choose("after")}>{t.after}</button>
    </div>
    {/* Bar heights show each version's loudness on one scale, so the louder master draws taller bars. Click to seek. */}
    <div className={`ab-wave ab-wave-${side}`} aria-hidden="true" onClick={seek}>
      {bars.map((height, index) => <i key={index} className={index / bars.length < played ? "played" : undefined} style={{ height: `${Math.round(height * 100)}%` }} />)}
    </div>
    <span className="transport-clock">{formatClock(time)}</span>
    <LevelMeter level={level} />
    <audio ref={before} src={`/demo/${demo}-before.mp3`} crossOrigin="anonymous" preload="metadata" {...events("before")} />
    <audio ref={after} src={`/demo/${demo}-after.mp3`} crossOrigin="anonymous" preload="metadata" {...events("after")} />
  </div>;
}

function SessionSheet({ t }: { t: Copy }) {
  return <figure className="session-sheet" aria-label={`${t.card.title}, ${t.card.version}`}>
    <div className="sheet-head"><b>{t.card.title}</b><span>{t.card.version}</span></div>
    <ul className="sheet-tracks">
      <li><span className="chip chip-beat">{t.card.beat}</span><span>beat.wav</span><span>1:56</span></li>
      <li><span className="chip chip-vocal">{t.card.vocal}</span><span>vocal.wav</span><span>1:56</span></li>
    </ul>
    <ol className="sheet-versions">
      <li><span className="sheet-v">V1</span><span>“{t.card.v1}”</span></li>
      <li><span className="sheet-v">V2</span><span>“{t.card.v2}”</span><span className="sheet-ready">✓ {t.card.status}</span></li>
    </ol>
    <p className="sheet-label">{t.card.settingsTitle}</p>
    <dl className="sheet-settings">{t.card.settings.map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl>
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
          <PlanPicker locale={locale} />
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
