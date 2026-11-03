"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { switchLocale, useCountry, useLocale } from "@/components/locale-provider";
import type { Locale } from "@/lib/locale";
import { currencyFor, formatPrice, plans, tracksLabel } from "@/lib/plans";
import { serverMessage } from "@/lib/studio-messages";
import { fetchUsage, planName, resetDate, Usage } from "@/lib/usage";

type GuideTab = "mix" | "master" | "answers";

// Example directions are parsed by the worker (worker/app/direction.py), which reads English and French.
const copy = {
  en: {
    mixPrompts: [
      ["Afrobeats", "Afrobeats party, vocals upfront, light autotune, some reverb, loud and punchy"],
      ["Trap", "Melodic trap, vocals upfront, hard autotune, some reverb, loud"],
      ["Drill", "Dark drill, dry vocal upfront, subtle autotune, punchy and loud"],
      ["Reggaeton", "Reggaeton, vocals upfront, light autotune, some reverb, loud and punchy"],
      ["RnB", "Smooth RnB, warm vocal, subtle autotune, lush reverb, keep it dynamic"],
      ["Pop", "Bright pop, vocals upfront, light autotune, some reverb, radio loud"],
      ["Lo-fi", "Lo-fi, soft vocal blended into the beat, some reverb, keep it dynamic"],
      ["Acoustic", "Acoustic, natural vocal, no autotune, some reverb, gentle and dynamic"],
    ],
    masterPrompts: [
      ["Streaming", "Streaming-ready, balanced and natural, keep it dynamic"],
      ["Club", "Loud club master, punchy low end, trap"],
      ["Warm", "Warm and smooth, pop, not too loud"],
      ["Demo", "Clean master for a label demo, natural dynamics"],
    ],
    answers: [
      ["Processing is slow", "A preview usually takes one to two minutes. Large files take longer to upload."],
      ["My vocal sounds thin", "Record close to the microphone in a quiet room, then ask for “vocal upfront” or “warmer vocal”."],
      ["The vocal sounds robotic", "Write “subtle autotune” for natural correction or “no autotune” to turn it off. “Hard autotune” gives the robotic effect on purpose."],
      ["Which format do I get?", "Pro downloads full tracks as 320 kbps MP3. Artist can download MP3 or WAV. Both are ready for streaming platforms."],
      ["How do I change a mix?", "Under step 3 in the mixer, write what should change, for example “vocal louder”. Earlier versions stay in your library."],
    ],
    deleteFailed: "Your account could not be deleted. Please retry.",
    copied: { sample: "Sample code copied. Paste it into step 2 of the mixer.", prompt: "Prompt copied. Paste it into step 2 of the mixer." },
    clipboardUnavailable: "Clipboard access is unavailable in this browser.",
    dismiss: "Dismiss",
    quote: (text: string) => `“${text}”`,
    settings: {
      title: "Settings", description: "Your profile and preferences.",
      profile: "Profile", displayName: "Display name", email: "Email address", save: "Save profile", saved: "Profile saved in this browser.",
      preferences: "Preferences", browserOnly: "Saved in this browser only.", language: "Language", updates: "Email me about product updates",
      security: "Sign-in and security",
      securityText: "Clerk manages your sign-in, password and email verification. Use “Forgot password” on the sign-in page to recover access.",
      deleteTitle: "Delete your account",
      deleteBefore: "Deletes your sessions, uploaded tracks, mixes and sign-in for good. This can't be undone. To remove only some sessions, use the ",
      deleteLink: "library",
      deleteAfter: ".",
      confirmWord: "DELETE",
      confirmLabel: "Type DELETE to confirm",
      deleting: "Deleting…",
      deleteButton: "Delete my account",
    },
    billing: {
      title: "Plan & billing", description: "Your plan and what you have used. Checkout opens at launch.",
      current: "Current plan", fullTracks: "Full-length tracks this month",
      resets: (date: string) => `Resets on ${date}.`,
      noFullTracks: "Previews are free. Full-length tracks come with a paid plan.",
      previews: "Previews in the last 24 hours", fairUse: "Previews are free, with a fair-use limit.",
      unavailable: "Your plan and usage appear here once the audio service is running.",
      paid: "Paid plans",
      from: (price: string) => `From ${price}/mo`,
      planLine: (name: string, tracks: number, monthly: string, yearly: string) => `${name}: ${tracksLabel(tracks, "en")} for ${monthly}/mo or ${yearly}/yr.`,
      checkout: " Checkout opens at launch.",
      compare: "Compare plans →",
      invoices: "Invoices", noInvoices: "No invoices yet.",
    },
    affiliate: {
      title: "Affiliate program", description: "Referral tracking isn't active yet. The code below is a sample.",
      sample: "Sample referral code", copy: "Copy code",
      how: "How it will work",
      howText: "Commission, attribution window, eligible plans and payout schedule will be announced before referrals open.",
      ask: "Ask about the program →", subject: "Affiliate%20program",
    },
    support: {
      title: "Help & support", description: "Quick answers, or write to us.",
      common: "Common questions", contact: "Contact",
      contactText: "Tell us what you were doing, the session name and any error message.",
      email: "Email support", subject: "FastMix%20support",
      placeholder: "Replace this example address with your support inbox before launch.",
    },
    guide: {
      title: "Sound guide", description: "Copy a starting point into step 2 of the mixer, then adjust it to your song.",
      topics: "Guide topics",
      tabs: { mix: "Mix prompts", master: "Master prompts", answers: "Quick answers" },
      copy: "Copy",
    },
  },
  fr: {
    mixPrompts: [
      ["Afrobeats", "Afrobeats festif, voix devant, autotune léger, un peu de réverbe, puissant et percutant"],
      ["Trap", "Trap mélodique, voix devant, autotune fort, un peu de réverbe, puissant"],
      ["Drill", "Drill sombre, voix sèche devant, autotune discret, puissant et percutant"],
      ["Reggaeton", "Reggaeton, voix devant, autotune léger, un peu de réverbe, puissant et percutant"],
      ["RnB", "RnB tout en douceur, voix chaleureuse, autotune discret, réverbe ample, garder de la dynamique"],
      ["Pop", "Pop lumineuse, voix devant, autotune léger, un peu de réverbe, puissant comme à la radio"],
      ["Lo-fi", "Lo-fi, voix douce en retrait dans le beat, un peu de réverbe, garder de la dynamique"],
      ["Acoustique", "Acoustique, voix naturelle, sans autotune, un peu de réverbe, doux et dynamique"],
    ],
    masterPrompts: [
      ["Streaming", "Prêt pour le streaming, équilibré et naturel, garder de la dynamique"],
      ["Club", "Master club puissant, basses percutantes, trap"],
      ["Chaleureux", "Chaleureux et doux, pop, volume modéré"],
      ["Démo", "Master propre pour une démo de label, dynamique naturelle"],
    ],
    answers: [
      ["Le traitement est lent", "Un aperçu prend en général une à deux minutes. Les fichiers volumineux mettent plus de temps à s'importer."],
      ["Ma voix manque de corps", "Enregistrez près du micro dans une pièce calme, puis demandez « voix devant » ou « voix plus chaleureuse »."],
      ["La voix sonne robotique", "Écrivez « autotune discret » pour une correction naturelle ou « sans autotune » pour le désactiver. « Autotune fort » donne volontairement l'effet robotique."],
      ["Quel format vais-je recevoir ?", "Avec Pro, les titres complets se téléchargent en MP3 320 kbit/s. Avec Artist, en MP3 ou en WAV. Les deux sont prêts pour les plateformes de streaming."],
      ["Comment modifier un mix ?", "À l'étape 3 du mixeur, écrivez ce qui doit changer, par exemple « voix plus forte ». Les versions précédentes restent dans votre bibliothèque."],
    ],
    deleteFailed: "Impossible de supprimer votre compte. Veuillez réessayer.",
    copied: { sample: "Code d'exemple copié. Collez-le à l'étape 2 du mixeur.", prompt: "Description copiée. Collez-la à l'étape 2 du mixeur." },
    clipboardUnavailable: "L'accès au presse-papiers n'est pas disponible dans ce navigateur.",
    dismiss: "Fermer",
    quote: (text: string) => `« ${text} »`,
    settings: {
      title: "Paramètres", description: "Votre profil et vos préférences.",
      profile: "Profil", displayName: "Nom affiché", email: "Adresse e-mail", save: "Enregistrer le profil", saved: "Profil enregistré dans ce navigateur.",
      preferences: "Préférences", browserOnly: "Enregistrées dans ce navigateur uniquement.", language: "Langue", updates: "Recevoir par e-mail les nouveautés de FastMix",
      security: "Connexion et sécurité",
      securityText: "Clerk gère votre connexion, votre mot de passe et la vérification de votre e-mail. Utilisez « Mot de passe oublié ? » sur la page de connexion pour récupérer l'accès.",
      deleteTitle: "Supprimer votre compte",
      deleteBefore: "Supprime définitivement vos sessions, vos pistes importées, vos mix et votre accès. Cette action est irréversible. Pour ne supprimer que certaines sessions, utilisez la ",
      deleteLink: "bibliothèque",
      deleteAfter: ".",
      confirmWord: "SUPPRIMER",
      confirmLabel: "Saisissez SUPPRIMER pour confirmer",
      deleting: "Suppression…",
      deleteButton: "Supprimer mon compte",
    },
    billing: {
      title: "Abonnement et facturation", description: "Votre formule et votre consommation. Le paiement ouvrira au lancement.",
      current: "Formule actuelle", fullTracks: "Titres complets ce mois-ci",
      resets: (date: string) => `Remise à zéro le ${date}.`,
      noFullTracks: "Les aperçus sont gratuits. Les titres complets sont inclus dans les forfaits payants.",
      previews: "Aperçus des dernières 24 heures", fairUse: "Les aperçus sont gratuits, dans la limite d'un usage raisonnable.",
      unavailable: "Votre formule et votre consommation s'afficheront ici dès que le service audio sera actif.",
      paid: "Forfaits payants",
      from: (price: string) => `À partir de ${price}/mois`,
      planLine: (name: string, tracks: number, monthly: string, yearly: string) => `${name} : ${tracksLabel(tracks, "fr")} pour ${monthly}/mois ou ${yearly}/an.`,
      checkout: " Le paiement ouvrira au lancement.",
      compare: "Comparer les formules →",
      invoices: "Factures", noInvoices: "Aucune facture pour l'instant.",
    },
    affiliate: {
      title: "Programme d'affiliation", description: "Le suivi des parrainages n'est pas encore actif. Le code ci-dessous est un exemple.",
      sample: "Code de parrainage d'exemple", copy: "Copier le code",
      how: "Comment ça fonctionnera",
      howText: "La commission, la durée d'attribution, les formules concernées et le calendrier des paiements seront annoncés avant l'ouverture des parrainages.",
      ask: "Se renseigner sur le programme →", subject: "Programme%20d%27affiliation",
    },
    support: {
      title: "Aide et support", description: "Des réponses rapides, ou écrivez-nous.",
      common: "Questions fréquentes", contact: "Contact",
      contactText: "Indiquez-nous ce que vous faisiez, le nom de la session et le message d'erreur éventuel.",
      email: "Écrire au support", subject: "Support%20FastMix",
      placeholder: "Remplacez cette adresse d'exemple par votre adresse de support avant le lancement.",
    },
    guide: {
      title: "Guide du son", description: "Copiez un point de départ à l'étape 2 du mixeur, puis adaptez-le à votre morceau.",
      topics: "Rubriques du guide",
      tabs: { mix: "Descriptions de mix", master: "Descriptions de master", answers: "Réponses rapides" },
      copy: "Copier",
    },
  },
};

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number }) {
  return <div className="usage-meter">
    <p><span>{label}</span><b className="mono">{used} / {limit}</b></p>
    <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used}><i style={{ width: `${limit ? Math.min(100, (used / limit) * 100) : 0}%` }} /></div>
  </div>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <section className={`card ${className}`}>{children}</section>; }
function PageHead({ title, description }: { title: string; description: string }) { return <div className="page-head"><div><h1>{title}</h1><p>{description}</p></div></div>; }

export default function AccountHub({ email }: { email: string }) {
  const path = usePathname();
  const locale = useLocale();
  const country = useCountry();
  const t = copy[locale];
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [updates, setUpdates] = useState(false);
  const [tab, setTab] = useState<GuideTab>("mix");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const clerk = useClerk();
  const router = useRouter();

  async function deleteAccount() {
    setDeleting(true);
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      const body = await response.json().catch(() => ({})) as { detail?: string; error?: string };
      if (!response.ok) throw new Error(body.detail || (body.error && serverMessage(body.error, locale)) || t.deleteFailed);
      // Drop the cached session list and profile kept in this browser.
      try { Object.keys(localStorage).filter((key) => key.startsWith("fastmix.")).forEach((key) => localStorage.removeItem(key)); } catch { /* storage unavailable */ }
      await clerk.signOut({ redirectUrl: "/" }).catch(() => router.replace("/"));
    } catch (issue) {
      setNotice(issue instanceof Error ? issue.message : t.deleteFailed);
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (!path.endsWith("/billing")) return;
    let mounted = true;
    void fetchUsage().then((result) => { if (mounted) setUsage(result); });
    return () => { mounted = false; };
  }, [path]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setName(localStorage.getItem("fastmix.profile.name") || email.split("@")[0]);
      setUpdates(localStorage.getItem("fastmix.profile.updates") === "true");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [email]);

  async function copyText(value: string, message: string) {
    try { await navigator.clipboard.writeText(value); setNotice(message); }
    catch { setNotice(t.clipboardUnavailable); }
  }

  const feedback = notice && <p className="notice-bar" role="status"><span>{notice}</span><button aria-label={t.dismiss} onClick={() => setNotice("")}>×</button></p>;

  if (path.endsWith("/settings")) {
    const s = t.settings;
    return <>
      <PageHead title={s.title} description={s.description} />
      {feedback}
      <div className="card-grid">
        <Card><h2>{s.profile}</h2><label className="field">{s.displayName}<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></label><label className="field">{s.email}<input value={email} readOnly /></label><button className="btn btn-primary" onClick={() => { const savedName = name.trim() || email.split("@")[0]; setName(savedName); localStorage.setItem("fastmix.profile.name", savedName); window.dispatchEvent(new Event("fastmix-profile")); setNotice(s.saved); }}>{s.save}</button></Card>
        <Card><h2>{s.preferences}</h2><p className="hint">{s.browserOnly}</p><label className="field">{s.language}<select value={locale} onChange={(e) => switchLocale(e.target.value as Locale)}><option value="en" lang="en">English</option><option value="fr" lang="fr">Français</option></select></label><label className="check"><input type="checkbox" checked={updates} onChange={(e) => { setUpdates(e.target.checked); localStorage.setItem("fastmix.profile.updates", String(e.target.checked)); }} /> {s.updates}</label></Card>
        <Card><h2>{s.security}</h2><p>{s.securityText}</p></Card>
        <Card><h2>{s.deleteTitle}</h2>
          <p>{s.deleteBefore}<Link className="text-link" href="/studio/library">{s.deleteLink}</Link>{s.deleteAfter}</p>
          <label className="field">{s.confirmLabel}<input value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} autoComplete="off" /></label>
          <button className="btn btn-danger-outline" disabled={deleteConfirm !== s.confirmWord || deleting} onClick={() => void deleteAccount()}>{deleting ? s.deleting : s.deleteButton}</button>
        </Card>
      </div>
    </>;
  }

  if (path.endsWith("/billing")) {
    const b = t.billing;
    const currency = currencyFor(country);
    return <>
      <PageHead title={b.title} description={b.description} />
      {feedback}
      <div className="card-grid">
        <Card><h2>{b.current}</h2>{usage ? <>
          <p className="plan-price">{planName(usage, locale)}</p>
          <UsageMeter label={b.fullTracks} used={usage.fullTracks.used} limit={usage.fullTracks.limit} />
          <p className="hint">{usage.fullTracks.limit ? b.resets(resetDate(usage, locale)) : b.noFullTracks}</p>
          <UsageMeter label={b.previews} used={usage.previews.used} limit={usage.previews.limit} />
          <p className="hint">{b.fairUse}</p>
        </> : <p>{b.unavailable}</p>}</Card>
        <Card><h2>{b.paid}</h2><p className="plan-price">{b.from(formatPrice(plans[0].price.monthly, currency, locale))}</p><p>{plans.map((plan) => b.planLine(plan.name, plan.tracks, formatPrice(plan.price.monthly, currency, locale), formatPrice(plan.price.yearly, currency, locale))).join(" ")}{b.checkout}</p><Link className="text-link" href="/pricing">{b.compare}</Link></Card>
        <Card><h2>{b.invoices}</h2><p>{b.noInvoices}</p></Card>
      </div>
    </>;
  }

  if (path.endsWith("/affiliate")) {
    const a = t.affiliate;
    return <>
      <PageHead title={a.title} description={a.description} />
      {feedback}
      <div className="card-grid">
        <Card><h2>{a.sample}</h2><p className="code">FASTMIX-PREVIEW</p><button className="btn btn-secondary" onClick={() => void copyText("FASTMIX-PREVIEW", t.copied.sample)}>{a.copy}</button></Card>
        <Card><h2>{a.how}</h2><p>{a.howText}</p><a className="text-link" href={`mailto:support@fastmix.example?subject=${a.subject}`}>{a.ask}</a></Card>
      </div>
    </>;
  }

  if (path.endsWith("/support")) {
    const s = t.support;
    return <>
      <PageHead title={s.title} description={s.description} />
      <div className="card-grid">
        <Card><h2>{s.common}</h2><div className="faq">{t.answers.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></Card>
        <Card><h2>{s.contact}</h2><p>{s.contactText}</p><a className="btn btn-primary" href={`mailto:support@fastmix.example?subject=${s.subject}`}>{s.email}</a><p className="hint">{s.placeholder}</p></Card>
      </div>
    </>;
  }

  const g = t.guide;
  const prompts = tab === "mix" ? t.mixPrompts : t.masterPrompts;
  return <>
    <PageHead title={g.title} description={g.description} />
    <div className="tabs" role="tablist" aria-label={g.topics}>{(["mix", "master", "answers"] as const).map((item) => <button role="tab" aria-selected={tab === item} key={item} onClick={() => setTab(item)}>{g.tabs[item]}</button>)}</div>
    {feedback}
    {tab === "answers" ? <Card><div className="faq">{t.answers.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></Card>
      : <div className="card-grid card-grid-3">{prompts.map(([style, prompt]) => <Card key={style} className="prompt-card"><h2>{style}</h2><p className="prompt-text">{t.quote(prompt)}</p><button className="btn btn-secondary btn-small" onClick={() => void copyText(prompt, t.copied.prompt)}>{g.copy}</button></Card>)}</div>}
  </>;
}
