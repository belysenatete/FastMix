import type { Metadata } from "next";
import Link from "next/link";
import { SimplePage } from "@/components/site-chrome";
import { getLocale } from "@/lib/locale-server";

const copy = {
  en: {
    title: "How it works", label: "How it works", heading: "From rough tracks to a finished mix", intro: "FastMix brings your tracks, your direction and every version of the mix into one place.",
    cta: "Start a free session",
    steps: [
      ["Add your tracks", "Upload a beat and your vocal. Add doubles, backing vocals, ad-libs or instruments as separate files for more control."],
      ["Describe the sound", "Name the style and what you want to hear: “afrobeats, vocal upfront, light autotune, some reverb”."],
      ["Listen and refine", "Get a free 30-second preview. Ask for changes in a short note; every version is kept."],
      ["Download", "When it sounds right, download the full-length track as MP3 or WAV, ready for streaming."],
    ],
  },
  fr: {
    title: "Comment ça marche", label: "Comment ça marche", heading: "De vos pistes brutes à un mix fini", intro: "FastMix réunit vos pistes, vos indications et toutes les versions du mix au même endroit.",
    cta: "Commencer une session gratuite",
    steps: [
      ["Ajoutez vos pistes", "Importez un beat et votre voix. Ajoutez des doublages, des chœurs, des ad-libs ou des instruments en fichiers séparés pour plus de contrôle."],
      ["Décrivez le son", "Indiquez le style et ce que vous voulez entendre : « afrobeats, voix devant, autotune léger, un peu de réverbe »."],
      ["Écoutez et affinez", "Obtenez un aperçu gratuit de 30 secondes. Demandez des changements en une courte note ; chaque version est conservée."],
      ["Téléchargez", "Quand le son vous convient, téléchargez le titre complet en MP3 ou en WAV, prêt pour le streaming."],
    ],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: copy[locale].title };
}

export default async function SolutionPage() {
  const t = copy[await getLocale()];
  return <SimplePage label={t.label} title={t.heading} intro={t.intro}>
    <ol className="steps steps-stacked">{t.steps.map(([title, text], index) => <li key={title}><span className="step-number">{index + 1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol>
    <p className="page-actions"><Link className="btn btn-primary" href="/signup">{t.cta}</Link></p>
  </SimplePage>;
}
