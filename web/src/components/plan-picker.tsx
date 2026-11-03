"use client";

import Link from "next/link";
import { useState } from "react";
import { useCountry, useLocale } from "@/components/locale-provider";
import { Billing, currencyFor, formatPrice, freePlan, lifetimeOffer, monthlyEquivalent, plans, tracksLabel } from "@/lib/plans";

const copy = {
  en: {
    billing: "Billing", monthly: "Monthly", yearly: "Yearly · 2 months free", perMonth: "/mo", perYear: "/yr", billedYearly: (amount: string) => `${amount}/mo, billed yearly`, free: "Free", forever: "forever",
    popular: "Popular", noFull: "Full-length downloads on paid plans", start: "Start free", choose: "Start now",
    lifetimeLabel: "Launch offer", lifetimeTitle: "Pay once, mix for life.", once: "once",
    lifetimeText: (limit: number) => `For the first ${limit} buyers only. No subscription, no renewal.`,
    lifetimeCta: "Get lifetime access",
    note: "Each new full-length version counts as one track; re-downloading a version is free. Unused tracks don't roll over.",
  },
  fr: {
    billing: "Facturation", monthly: "Mensuel", yearly: "Annuel · 2 mois offerts", perMonth: "/mois", perYear: "/an", billedYearly: (amount: string) => `soit ${amount}/mois, facturé à l'année`, free: "Gratuit", forever: "pour toujours",
    popular: "Populaire", noFull: "Titres complets avec les forfaits payants", start: "Commencer gratuitement", choose: "Commencer",
    lifetimeLabel: "Offre de lancement", lifetimeTitle: "Payez une fois, mixez à vie.", once: "une seule fois",
    lifetimeText: (limit: number) => `Réservé aux ${limit} premiers acheteurs. Sans abonnement, sans renouvellement.`,
    lifetimeCta: "Obtenir l'accès à vie",
    note: "Chaque nouvelle version complète compte pour un titre ; retélécharger une version est gratuit. Les titres non utilisés ne sont pas reportés.",
  },
};

/** Monthly / yearly plan cards, styled after a console channel strip, plus the lifetime launch offer. */
export default function PlanPicker() {
  const locale = useLocale();
  const currency = currencyFor(useCountry());
  const [billing, setBilling] = useState<Billing>("monthly");
  const t = copy[locale];
  const price = (amount: number) => formatPrice(amount, currency, locale);
  return <>
    <div className="segmented" role="group" aria-label={t.billing}>
      {(["monthly", "yearly"] as const).map((option) => <button key={option} aria-pressed={billing === option} onClick={() => setBilling(option)}>{t[option]}</button>)}
    </div>
    <div className="plan-grid plan-grid-4">
      <article className="plan">
        <h3>{freePlan.name[locale]}</h3>
        <p className="plan-price">{t.free} <small>{t.forever}</small></p>
        <ul>{freePlan.features.map((item) => <li key={item.en}>{item[locale]}</li>)}<li className="plan-off">{t.noFull}</li></ul>
        <Link className="btn btn-secondary" href="/signup">{t.start}</Link>
      </article>
      {plans.map((plan) => <article key={plan.id} className={`plan${plan.popular ? " plan-featured" : ""}`}>
        <h3>{plan.name}{plan.popular && <span className="chip">{t.popular}</span>}</h3>
        <p className="plan-price">{price(plan.price[billing])} <small>{billing === "monthly" ? t.perMonth : t.perYear}</small></p>
        {billing === "yearly" && <p className="plan-sub">{t.billedYearly(price(monthlyEquivalent(plan)))}</p>}
        <ul>
          <li><b>{tracksLabel(plan.tracks, locale)}</b></li>
          <li>{plan.downloads[locale]}</li>
          {plan.features.map((item) => <li key={item.en}>{item[locale]}</li>)}
        </ul>
        <Link className={`btn ${plan.popular ? "btn-primary" : "btn-secondary"}`} href="/signup">{t.choose}</Link>
      </article>)}
    </div>
    <article className="plan plan-lifetime">
      <div>
        <p className="label">{t.lifetimeLabel}</p>
        <h3>{lifetimeOffer.name[locale]}</h3>
        <p className="plan-lifetime-title">{t.lifetimeTitle}</p>
        <p className="plan-sub">{t.lifetimeText(lifetimeOffer.limit)}</p>
      </div>
      <ul>
        <li><b>{tracksLabel(lifetimeOffer.tracks, locale)}</b></li>
        <li>{lifetimeOffer.downloads[locale]}</li>
      </ul>
      <div className="plan-lifetime-buy">
        <p className="plan-price">{price(lifetimeOffer.price)} <small>{t.once}</small></p>
        <Link className="btn btn-primary" href="/signup">{t.lifetimeCta}</Link>
      </div>
    </article>
    <p className="fine-print">{t.note}</p>
  </>;
}
