import Link from "next/link";
import { SignIn, SignUp } from "@clerk/nextjs";
import { Wordmark } from "@/components/site-chrome";
import { getLocale } from "@/lib/locale-server";

const copy = {
  en: {
    back: "← Back to the site",
    signupTitle: "Create your free account",
    loginTitle: "Welcome back",
    signupLede: "Upload a beat and a vocal, describe the sound, and hear a free preview in about two minutes.",
    loginLede: "Sign in to continue your sessions and versions.",
    consent: { before: "By continuing, you agree to our ", terms: "Terms", and: " and ", privacy: "Privacy notice", after: "." },
    loginPoints: [
      ["Your sessions are waiting", "Every track, direction and version you made is saved in your library."],
      ["Pick up where you left off", "Open a session, play the latest version and refine it with a short note."],
      ["Download when it's right", "Get the full-length track as MP3 or WAV, ready for streaming."],
    ],
    signupPoints: [
      ["Add your tracks", "A beat and your vocal are all you need."],
      ["Describe the sound", "Write it in your own words: “afrobeats, vocals upfront, light autotune”."],
      ["Listen free, then refine", "Hear a free 30-second preview and ask for changes until it's right."],
    ],
  },
  fr: {
    back: "← Retour au site",
    signupTitle: "Créez votre compte gratuit",
    loginTitle: "Bon retour parmi nous",
    signupLede: "Importez un beat et une voix, décrivez le son, et écoutez un aperçu gratuit en deux minutes environ.",
    loginLede: "Connectez-vous pour reprendre vos sessions et vos versions.",
    consent: { before: "En continuant, vous acceptez nos ", terms: "Conditions", and: " et notre ", privacy: "Politique de confidentialité", after: "." },
    loginPoints: [
      ["Vos sessions vous attendent", "Chaque piste, chaque indication et chaque version que vous avez créées sont enregistrées dans votre bibliothèque."],
      ["Reprenez là où vous en étiez", "Ouvrez une session, écoutez la dernière version et affinez-la avec une courte note."],
      ["Téléchargez quand c'est prêt", "Obtenez le titre complet en MP3 ou en WAV, prêt pour le streaming."],
    ],
    signupPoints: [
      ["Ajoutez vos pistes", "Un beat et votre voix suffisent."],
      ["Décrivez le son", "Écrivez-le avec vos mots : « afrobeats, voix devant, autotune léger »."],
      ["Écoutez gratuitement, puis affinez", "Écoutez un aperçu gratuit de 30 secondes et demandez des changements jusqu'à ce que ce soit parfait."],
    ],
  },
};

export default async function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const t = copy[await getLocale()];
  const isSignup = mode === "signup";
  return <main className="auth-page">
    <div className="auth-top"><Wordmark /><Link href="/" className="text-link">{t.back}</Link></div>
    <div className="auth-layout">
      <div className="auth-intro">
        <h1>{isSignup ? t.signupTitle : t.loginTitle}</h1>
        <p className="lede">{isSignup ? t.signupLede : t.loginLede}</p>
      </div>
      <div className="auth-form">
        {isSignup ? <SignUp routing="hash" signInUrl="/login" forceRedirectUrl="/studio" appearance={appearance} /> : <SignIn routing="hash" signUpUrl="/signup" forceRedirectUrl="/studio" appearance={appearance} />}
        <p className="fine-print">{t.consent.before}<Link href="/terms">{t.consent.terms}</Link>{t.consent.and}<Link href="/privacy">{t.consent.privacy}</Link>{t.consent.after}</p>
      </div>
      {/* After the form in the markup so phones show the form without scrolling; wide screens place it under the intro. */}
      <ul className="auth-points">{(isSignup ? t.signupPoints : t.loginPoints).map(([title, text], index) => <li key={title}><span aria-hidden="true">{index + 1}</span><div><b>{title}</b><p>{text}</p></div></li>)}</ul>
    </div>
  </main>;
}

const appearance = {
  variables: {
    colorPrimary: "#c9a15a",
    colorTextOnPrimaryBackground: "#1c1b19",
    colorBackground: "#26241f",
    colorText: "#ede6d6",
    colorTextSecondary: "#a39b8a",
    colorInputBackground: "#1c1b19",
    colorInputText: "#ede6d6",
    colorNeutral: "#ede6d6",
    colorDanger: "#e8836a",
    borderRadius: "6px",
    fontFamily: "var(--font-body), system-ui, sans-serif",
  },
  elements: {
    card: "clerk-card",
    headerTitle: "clerk-title",
    header: "clerk-header",
  },
};
