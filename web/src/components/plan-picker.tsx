"use client";

import Link from "next/link";
import { useState } from "react";
import { Billing, formatPrice, freePlan, plans, tracksLabel } from "@/lib/plans";

const copy = {
  en: {
    billing: "Billing", monthly: "Monthly", lifetime: "Lifetime", perMonth: "/mo", once: "one-time payment", free: "Free", forever: "forever",
    popular: "Popular", noFull: "Full-length downloads on Pro and Artist", start: "Start free", choose: "Start now",
    note: "Prices in US dollars. Each new full-length version counts as one track; re-downloading a version is free. Unused tracks don't roll over. Checkout opens at launch; until then every account is on Starter.",
  },
  fr: {
    billing: "Facturation", monthly: "Mensuel", lifetime: "À vie", perMonth: "/mois", once: "paiement unique", free: "Gratuit", forever: "pour toujours",
    popular: "Populaire", noFull: "Titres complets avec Pro et Artist", start: "Commencer gratuitement", choose: "Commencer",
    note: "Prix en dollars américains. Chaque nouvelle version complète compte pour un titre ; retélécharger une version est gratuit. Les titres non utilisés ne sont pas reportés. Le paiement ouvre au lancement ; d'ici là, tous les comptes sont en Découverte.",
  },
};

/** Monthly / lifetime plan cards, styled after a console channel strip. */
export default function PlanPicker({ locale = "en" }: { locale?: "en" | "fr" }) {
  const [billing, setBilling] = useState<Billing>("monthly");
  const t = copy[locale];
  return <>
    <div className="segmented" role="group" aria-label={t.billing}>
      {(["monthly", "lifetime"] as const).map((option) => <button key={option} aria-pressed={billing === option} onClick={() => setBilling(option)}>{t[option]}</button>)}
    </div>
    <div className="plan-grid">
      <article className="plan">
        <h3>{freePlan.name[locale]}</h3>
        <p className="plan-price">{t.free} <small>{t.forever}</small></p>
        <ul>{freePlan.features.map((item) => <li key={item.en}>{item[locale]}</li>)}<li className="plan-off">{t.noFull}</li></ul>
        <Link className="btn btn-secondary" href="/signup">{t.start}</Link>
      </article>
      {plans.map((plan) => <article key={plan.id} className={`plan${plan.popular ? " plan-featured" : ""}`}>
        <h3>{plan.name}{plan.popular && <span className="chip">{t.popular}</span>}</h3>
        <p className="plan-price">{formatPrice(plan.price[billing])} <small>{billing === "monthly" ? t.perMonth : t.once}</small></p>
        <ul>
          <li><b>{tracksLabel(plan.tracks[billing], locale)}</b></li>
          <li>{plan.downloads[locale]}</li>
          {plan.features.map((item) => <li key={item.en}>{item[locale]}</li>)}
        </ul>
        <Link className={`btn ${plan.popular ? "btn-primary" : "btn-secondary"}`} href="/signup">{t.choose}</Link>
      </article>)}
    </div>
    <p className="fine-print">{t.note}</p>
  </>;
}
