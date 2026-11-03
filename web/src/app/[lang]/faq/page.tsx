import type { Metadata } from "next";
import Link from "next/link";
import { SimplePage } from "@/components/site-chrome";
import { getLocale } from "@/lib/locale-server";

const copy = {
  en: {
    title: "FAQ", label: "Help", heading: "Frequently asked questions", intro: "Short answers to the questions artists ask most.",
    guide: "Open the sound guide", contact: "Contact us",
    items: [
      ["How does FastMix work?", "Add your beat and vocal tracks, describe the sound you want, and FastMix creates a free 30-second preview. Refine it with short notes, then download the full track."],
      ["How long does a mix take?", "A preview usually takes one to two minutes. Getting the full track after a preview takes a few seconds."],
      ["My vocals sound like a phone recording", "Record in a quiet room, close to the microphone, and avoid clipping. Then ask for “vocal upfront” or “warmer vocal” in your direction."],
      ["The autotune sounds robotic", "Autotune only runs when your direction asks for it. Write “subtle autotune” for natural correction or “hard autotune” for the effect, and add the key (for example “in A minor”) to keep notes in the scale."],
      ["Can I download WAV?", "Yes, on the Artist plan. Pro downloads 320 kbps MP3. Both are kept under −1 dBTP so they're ready for streaming platforms."],
      ["Can I redo a mix?", "Yes. Each note creates a new version, and earlier versions stay in your library."],
      ["My track is missing bass", "Check that the bass is in your beat file, then ask for “more low end” or “punchier” in your note."],
    ],
  },
  fr: {
    title: "FAQ", label: "Aide", heading: "Questions fréquentes", intro: "Des réponses courtes aux questions que les artistes posent le plus souvent.",
    guide: "Ouvrir le Guide du son", contact: "Nous contacter",
    items: [
      ["Comment fonctionne FastMix ?", "Ajoutez votre beat et vos pistes de voix, décrivez le son que vous voulez, et FastMix crée un aperçu gratuit de 30 secondes. Affinez-le avec de courtes notes, puis téléchargez le titre complet."],
      ["Combien de temps prend un mix ?", "Un aperçu prend généralement une à deux minutes. Obtenir le titre complet après un aperçu ne prend que quelques secondes."],
      ["Ma voix sonne comme un enregistrement au téléphone", "Enregistrez dans une pièce calme, près du micro, sans saturer. Demandez ensuite « voix devant » ou « voix plus chaude » dans votre description."],
      ["L'autotune sonne robotique", "L'autotune ne s'applique que si votre description le demande. Écrivez « autotune léger » pour une correction naturelle ou « autotune fort » pour l'effet, et précisez la tonalité (par exemple « en la mineur ») pour garder les notes dans la gamme."],
      ["Puis-je télécharger en WAV ?", "Oui, avec le forfait Artist. Pro télécharge en MP3 320 kbps. Les deux restent sous −1 dBTP et sont donc prêts pour les plateformes de streaming."],
      ["Puis-je refaire un mix ?", "Oui. Chaque note crée une nouvelle version, et les versions précédentes restent dans votre bibliothèque."],
      ["Mon titre manque de basses", "Vérifiez que la basse figure bien dans votre fichier de beat, puis demandez « plus de basses » ou « plus de punch » dans votre note."],
    ],
  },
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: copy[locale].title };
}

export default async function FAQPage() {
  const t = copy[await getLocale()];
  return <SimplePage label={t.label} title={t.heading} intro={t.intro}>
    <div className="faq">{t.items.map(([question, answer]) => <details key={question}><summary>{question}</summary><p>{answer}</p></details>)}</div>
    <p className="page-actions"><Link className="btn btn-primary" href="/studio/guide">{t.guide}</Link><a className="btn btn-secondary" href="mailto:hello@fastmix.example">{t.contact}</a></p>
  </SimplePage>;
}
