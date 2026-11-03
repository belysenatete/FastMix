/**
 * Public plan catalogue, shared by the landing page, the pricing page and the billing screen.
 *
 * Allowances are sized against the RoEx Tonn cost of one paid full-length render
 * (250 credits, $2.50 on the smallest credit pack; previews are free) plus Paddle fees
 * and a hosting share, so a plan keeps a margin even when its allowance is fully used.
 * The cost math is recorded in projectTracker.md under "Pricing model"; update both together.
 */
export type Billing = "monthly" | "yearly";
type Text = { en: string; fr: string };

export type Plan = {
  id: "lite" | "pro" | "artist";
  name: string;
  popular?: boolean;
  price: Record<Billing, number>;
  /** Full-length tracks (mix or master) included each calendar month, on either billing period. */
  tracks: number;
  downloads: Text;
  features: Text[];
};

const shared: Text[] = [
  { en: "Unlimited 30-second previews", fr: "Aperçus de 30 secondes illimités" },
  { en: "Refinement notes and version history", fr: "Notes d'ajustement et historique des versions" },
  { en: "Streaming-ready loudness", fr: "Volume prêt pour le streaming" },
  { en: "You own 100% of your music", fr: "Vous gardez 100 % de vos droits" },
];

export const plans: Plan[] = [
  {
    id: "lite",
    name: "Lite",
    price: { monthly: 14.99, yearly: 149 },
    tracks: 2,
    downloads: { en: "MP3 downloads", fr: "Téléchargement en MP3" },
    features: shared,
  },
  {
    id: "pro",
    name: "Pro",
    price: { monthly: 34.99, yearly: 349 },
    tracks: 6,
    downloads: { en: "MP3 downloads", fr: "Téléchargement en MP3" },
    features: shared,
  },
  {
    id: "artist",
    name: "Artist",
    popular: true,
    price: { monthly: 49.99, yearly: 499 },
    tracks: 10,
    downloads: { en: "MP3 + WAV downloads", fr: "Téléchargement en MP3 + WAV" },
    features: [...shared, { en: "Priority support", fr: "Support prioritaire" }],
  },
];

export const freePlan = {
  name: { en: "Starter", fr: "Découverte" },
  features: [
    { en: "Unlimited 30-second previews", fr: "Aperçus de 30 secondes illimités" },
    { en: "Refinement notes and version history", fr: "Notes d'ajustement et historique des versions" },
    { en: "Sound guide", fr: "Guide du son" },
  ] as Text[],
};

/** One payment, no renewal, for the first 100 buyers (decided 2026-11-03). Its allowance is the "lifetime" plan in worker/app/plans.py. */
export const lifetimeOffer = {
  name: { en: "Lifetime", fr: "À vie" },
  price: 249,
  tracks: 4,
  limit: 100,
  downloads: { en: "MP3 + WAV downloads", fr: "Téléchargement en MP3 + WAV" },
};

export type Currency = "USD" | "EUR";

// Visitors in these countries pay in euros, at the same numbers as the dollar prices (decided 2026-11-03).
// Keep in step with the EUR price overrides in Paddle (brand/payments/paddle-catalog.cjs).
export const EURO_COUNTRIES = new Set(["AT", "BE", "BG", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES", "MC", "AD", "SM", "VA", "GP", "MQ", "GF", "RE", "YT", "PM", "BL", "MF"]);

export function currencyFor(country: string | null | undefined): Currency {
  return country && EURO_COUNTRIES.has(country.toUpperCase()) ? "EUR" : "USD";
}

/** "$34.99", "€249" in English; "34,99 €", "249 €" in French. Whole amounts drop the decimals. */
export function formatPrice(amount: number, currency: Currency = "USD", locale: "en" | "fr" = "en") {
  const digits = Number.isInteger(amount) ? 0 : 2;
  return new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-US", { style: "currency", currency, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount);
}

export function tracksLabel(count: number, locale: "en" | "fr") {
  return locale === "fr" ? `${count} titres complets par mois` : `${count} full-length tracks a month`;
}

/** Yearly price spread over twelve months, for the "per month, billed yearly" line. */
export function monthlyEquivalent(plan: Plan) {
  return Math.floor((plan.price.yearly / 12) * 100) / 100;
}
