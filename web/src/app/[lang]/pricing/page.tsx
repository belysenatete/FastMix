import type { Metadata } from "next";
import Link from "next/link";
import PlanPicker from "@/components/plan-picker";
import { SimplePage } from "@/components/site-chrome";
import { getLocale } from "@/lib/locale-server";

const copy = {
  en: { title: "Pricing", label: "Pricing", heading: "Less than one studio session.", intro: "Preview as much as you like for free. Pick a plan when you're ready to download full-length tracks." },
  fr: { title: "Tarifs", label: "Tarifs", heading: "Moins cher qu'une session en studio.", intro: "Créez autant d'aperçus que vous le souhaitez, gratuitement. Choisissez un forfait quand vous êtes prêt à télécharger des titres complets." },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: copy[locale].title };
}

export default async function PricingPage() {
  const locale = await getLocale();
  const t = copy[locale];
  return <SimplePage label={t.label} title={t.heading} intro={t.intro}>
    <PlanPicker />
    {locale === "fr" ? <div className="prose legal">
      <h2>Comment les titres sont comptés</h2>
      <p>Un titre correspond à un mix ou un master complet que vous choisissez de générer. Les aperçus et les notes pour affiner sont toujours gratuits et ne consomment jamais de titre. Si vous affinez un morceau et générez la nouvelle version en entier, cela compte pour un titre de plus. Retélécharger une version déjà générée est gratuit.</p>
      <h2>Mensuel ou annuel</h2>
      <p>Les deux incluent le même nombre de titres chaque mois. Les forfaits mensuels se renouvellent chaque mois ; les forfaits annuels sont payés une fois par an et coûtent le prix de dix mois. Vous pouvez résilier l&apos;un ou l&apos;autre à tout moment ; il reste actif jusqu&apos;à la fin de la période payée. Consultez les <Link href="/terms">Conditions</Link> pour la résiliation et les remboursements.</p>
    </div> : <div className="prose legal">
      <h2>How tracks are counted</h2>
      <p>A track is one full-length mix or master that you choose to render. Previews and refinement notes are always free and never use a track. If you refine a song and render the new version in full, that counts as another track. Downloading a version you already rendered is free.</p>
      <h2>Monthly or yearly</h2>
      <p>Both include the same tracks every month. Monthly plans renew each month; yearly plans are paid once a year and cost the same as ten months. Either can be cancelled at any time and stays active until the end of the period you paid for. See the <Link href="/terms">Terms</Link> for cancellation and refunds.</p>
    </div>}
  </SimplePage>;
}
