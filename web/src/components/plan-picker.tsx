"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { takePendingCheckout, useCheckout } from "@/components/checkout";
import { useCountry, useLocale } from "@/components/locale-provider";
import { Billing, currencyFor, formatPrice, freePlan, lifetimeOffer, monthlyEquivalent, plans, tracksLabel } from "@/lib/plans";

const copy = {
  en: {
    billing: "Billing", monthly: "Monthly", yearly: "Yearly · 2 months free", perMonth: "/mo", perYear: "/yr", billedYearly: (amount: string) => `${amount}/mo, billed yearly`, free: "Free", forever: "forever",
    popular: "Popular", noFull: "Full-length downloads on paid plans", start: "Start free", choose: "Start now",
    lifetimeLabel: "Launch offer", lifetimeTitle: "Pay once, mix for life.", once: "once",
    lifetimeText: (limit: number) => `For the first ${limit} buyers only. No subscription, no renewal.`,
    lifetimeCta: "Get lifetime access", left: (left: number, limit: number) => `${left} of ${limit} left`, soldOut: "Sold out", opening: "Opening checkout…",
    note: "Each new full-length version counts as one track; re-downloading a version is free. Unused tracks don't roll over.",
  },
  fr: {
    billing: "Facturation", monthly: "Mensuel", yearly: "Annuel · 2 mois offerts", perMonth: "/mois", perYear: "/an", billedYearly: (amount: string) => `soit ${amount}/mois, facturé à l'année`, free: "Gratuit", forever: "pour toujours",
    popular: "Populaire", noFull: "Titres complets avec les forfaits payants", start: "Commencer gratuitement", choose: "Commencer",
    lifetimeLabel: "Offre de lancement", lifetimeTitle: "Payez une fois, mixez à vie.", once: "une seule fois",
    lifetimeText: (limit: number) => `Réservé aux ${limit} premiers acheteurs. Sans abonnement, sans renouvellement.`,
    lifetimeCta: "Obtenir l'accès à vie", left: (left: number, limit: number) => `Plus que ${left} sur ${limit}`, soldOut: "Épuisé", opening: "Ouverture du paiement…",
    note: "Chaque nouvelle version complète compte pour un titre ; retélécharger une version est gratuit. Les titres non utilisés ne sont pas reportés.",
  },
};

/**
 * Monthly / yearly plan cards, styled after a console channel strip, plus the lifetime launch offer.
 * Buttons open Paddle checkout (or send signed-out visitors to sign up first). In the studio the free card is hidden.
 */
export default function PlanPicker({ inStudio = false, onChanged }: { inStudio?: boolean; onChanged?: () => void }) {
  const locale = useLocale();
  const currency = currencyFor(useCountry());
  const [billing, setBilling] = useState<Billing>("monthly");
  const [lifetimeLeft, setLifetimeLeft] = useState<number | null>(null);
  const checkout = useCheckout();
  const t = copy[locale];
  const { start, changed } = checkout;

  useEffect(() => {
    let mounted = true;
    fetch("/api/billing/lifetime").then((r) => r.json()).then((body) => { if (mounted && typeof body.left === "number") setLifetimeLeft(body.left); }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  // A plan picked before signing up resumes here once the visitor reaches the studio's billing page.
  useEffect(() => {
    if (!inStudio) return;
    const pending = takePendingCheckout();
    if (pending) void start(pending);
  }, [inStudio, start]);

  useEffect(() => { if (changed) onChanged?.(); }, [changed, onChanged]);
  const soldOut = lifetimeLeft === 0;
  const price = (amount: number) => formatPrice(amount, currency, locale);
  return <>
    <div className="segmented" role="group" aria-label={t.billing}>
      {(["monthly", "yearly"] as const).map((option) => <button key={option} aria-pressed={billing === option} onClick={() => setBilling(option)}>{t[option]}</button>)}
    </div>
    <div className="plan-grid plan-grid-4">
      {!inStudio && <article className="plan">
        <h3>{freePlan.name[locale]}</h3>
        <p className="plan-price">{t.free} <small>{t.forever}</small></p>
        <ul>{freePlan.features.map((item) => <li key={item.en}>{item[locale]}</li>)}<li className="plan-off">{t.noFull}</li></ul>
        <Link className="btn btn-secondary" href="/signup">{t.start}</Link>
      </article>}
      {plans.map((plan) => <article key={plan.id} className={`plan${plan.popular ? " plan-featured" : ""}`}>
        <h3>{plan.name}{plan.popular && <span className="chip">{t.popular}</span>}</h3>
        <p className="plan-price">{price(plan.price[billing])} <small>{billing === "monthly" ? t.perMonth : t.perYear}</small></p>
        {billing === "yearly" && <p className="plan-sub">{t.billedYearly(price(monthlyEquivalent(plan)))}</p>}
        <ul>
          <li><b>{tracksLabel(plan.tracks, locale)}</b></li>
          <li>{plan.downloads[locale]}</li>
          {plan.features.map((item) => <li key={item.en}>{item[locale]}</li>)}
        </ul>
        <button className={`btn ${plan.popular ? "btn-primary" : "btn-secondary"}`} disabled={checkout.busy} onClick={() => void start({ plan: plan.id, billing })}>{t.choose}</button>
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
        <button className="btn btn-primary" disabled={checkout.busy || soldOut} onClick={() => void start({ plan: "lifetime", billing: "once" })}>{soldOut ? t.soldOut : t.lifetimeCta}</button>
        {lifetimeLeft !== null && !soldOut && <p className="plan-lifetime-left">{t.left(lifetimeLeft, lifetimeOffer.limit)}</p>}
      </div>
    </article>
    {(checkout.busy || checkout.error) && <p className={checkout.error ? "error-text" : "hint"} role="status">{checkout.error || t.opening}</p>}
    <p className="fine-print">{t.note}</p>
  </>;
}
