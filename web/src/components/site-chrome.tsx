"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { switchLocale, useLocale } from "@/components/locale-provider";
import type { Locale } from "@/lib/locale";

export type { Locale };

const labels = {
  en: { how: "How it works", listen: "Listen", pricing: "Pricing", faq: "FAQ", login: "Log in", start: "Start mixing", menu: "Menu", close: "Close", home: "FastMix home", mainNav: "Main", tagline: "Mix and master your vocals in minutes.", product: "Product", account: "Account", legal: "Legal", guide: "Sound guide", signup: "Create account", privacy: "Privacy", terms: "Terms", cookies: "Cookies" },
  fr: { how: "Comment ça marche", listen: "Écouter", pricing: "Tarifs", faq: "FAQ", login: "Connexion", start: "Commencer", menu: "Menu", close: "Fermer", home: "Accueil FastMix", mainNav: "Navigation principale", tagline: "Mixez et masterisez vos voix en quelques minutes.", product: "Produit", account: "Compte", legal: "Mentions", guide: "Guide du son", signup: "Créer un compte", privacy: "Confidentialité", terms: "Conditions", cookies: "Cookies" },
};

/** The FastMix logo (raw-to-mixed waveform beside the wordmark), linking home or to the studio. */
export function Wordmark({ href = "/", label }: { href?: string; label?: string }) {
  const locale = useLocale();
  // A plain <img>: the logo is a small static SVG, so next/image's optimization adds nothing.
  // eslint-disable-next-line @next/next/no-img-element
  return <Link href={href} className="wordmark" aria-label={label ?? labels[locale].home}><img src="/brand/fastmix-logo.svg" alt="" width={433} height={128} /></Link>;
}

function LocaleSwitch({ locale }: { locale: Locale }) {
  const choose = (next: Locale) => { if (next !== locale) switchLocale(next); };
  return <div className="segmented segmented-small" role="group" aria-label={locale === "fr" ? "Langue" : "Language"}>
    <button aria-pressed={locale === "en"} lang="en" onClick={() => choose("en")}>EN</button>
    <button aria-pressed={locale === "fr"} lang="fr" onClick={() => choose("fr")}>FR</button>
  </div>;
}

/** Header shared by every public page, with the language switch. */
export function SiteHeader() {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const t = labels[locale];

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);

  const links = <><Link href="/#how">{t.how}</Link><Link href="/#listen">{t.listen}</Link><Link href="/#pricing">{t.pricing}</Link><Link href="/faq">{t.faq}</Link></>;
  return <header className="site-header">
    <div className="container site-header-inner">
      <Wordmark />
      <nav className="site-links" aria-label={t.mainNav}>{links}</nav>
      <div className="site-actions">
        <LocaleSwitch locale={locale} />
        <Link className="site-login" href="/login">{t.login}</Link>
        <Link className="btn btn-primary" href="/signup">{t.start}</Link>
        <button className="btn btn-ghost menu-toggle" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(!open)}>{open ? t.close : t.menu}</button>
      </div>
    </div>
    {open && <nav id="site-menu" className="site-menu container" aria-label={t.menu} onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>
      {links}<Link href="/login">{t.login}</Link>
      <LocaleSwitch locale={locale} />
    </nav>}
  </header>;
}

export function SiteFooter() {
  const t = labels[useLocale()];
  return <footer className="site-footer">
    <div className="container footer-grid">
      <div><Wordmark /><p>{t.tagline}</p></div>
      <div><h2>{t.product}</h2><Link href="/#how">{t.how}</Link><Link href="/#pricing">{t.pricing}</Link><Link href="/faq">{t.faq}</Link></div>
      <div><h2>{t.account}</h2><Link href="/login">{t.login}</Link><Link href="/signup">{t.signup}</Link><Link href="/studio/guide">{t.guide}</Link></div>
      <div><h2>{t.legal}</h2><Link href="/privacy">{t.privacy}</Link><Link href="/terms">{t.terms}</Link><Link href="/cookies">{t.cookies}</Link></div>
    </div>
    <div className="container footer-base">© 2026 FastMix</div>
  </footer>;
}

/** Layout for short informational pages (FAQ, pricing, legal). */
export function SimplePage({ label, title, intro, children }: { label: string; title: string; intro?: string; children?: ReactNode }) {
  return <>
    <SiteHeader />
    <main className="container simple-page">
      <p className="label">{label}</p>
      <h1>{title}</h1>
      {intro && <p className="lede">{intro}</p>}
      {children}
    </main>
    <SiteFooter />
  </>;
}
