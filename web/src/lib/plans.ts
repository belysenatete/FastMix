/**
 * Public plan catalogue, shared by the landing page, the pricing page and the billing screen.
 *
 * Allowances are sized against the RoEx Tonn cost of one paid full-length render
 * (250 credits, $2.50 on the smallest credit pack; previews are free) plus Stripe fees
 * and a hosting share, so a plan keeps a margin even when its allowance is fully used.
 * The cost math is recorded in projectTracker.md under "Pricing model"; update both together.
 */
export type Billing = "monthly" | "lifetime";
type Text = { en: string; fr: string };

export type Plan = {
  id: "pro" | "artist";
  name: string;
  popular?: boolean;
  price: Record<Billing, number>;
  /** Full-length tracks (mix or master) included each calendar month. */
  tracks: Record<Billing, number>;
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
    id: "pro",
    name: "Pro",
    price: { monthly: 34.99, lifetime: 219 },
    tracks: { monthly: 6, lifetime: 2 },
    downloads: { en: "MP3 downloads", fr: "Téléchargement en MP3" },
    features: shared,
  },
  {
    id: "artist",
    name: "Artist",
    popular: true,
    price: { monthly: 49.99, lifetime: 309 },
    tracks: { monthly: 10, lifetime: 4 },
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

export function formatPrice(amount: number) {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

export function tracksLabel(count: number, locale: "en" | "fr") {
  return locale === "fr" ? `${count} titres complets par mois` : `${count} full-length tracks a month`;
}
