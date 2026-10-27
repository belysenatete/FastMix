import Link from "next/link";
import { SignIn, SignUp } from "@clerk/nextjs";
import { Wordmark } from "@/components/site-chrome";

export default function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  return <main className="auth-page">
    <div className="auth-top"><Wordmark /><Link href="/" className="text-link">← Back to the site</Link></div>
    <div className="auth-layout">
      <div className="auth-intro">
        <h1>{isSignup ? "Create your free account" : "Welcome back"}</h1>
        <p className="lede">{isSignup ? "Upload a beat and a vocal, describe the sound, and hear a free preview in about two minutes." : "Sign in to continue your sessions and versions."}</p>
        <ul className="auth-points">{(isSignup ? signupPoints : loginPoints).map(([title, text], index) => <li key={title}><span aria-hidden="true">{index + 1}</span><div><b>{title}</b><p>{text}</p></div></li>)}</ul>
      </div>
      <div className="auth-form">
        {isSignup ? <SignUp routing="hash" signInUrl="/login" forceRedirectUrl="/studio" appearance={appearance} /> : <SignIn routing="hash" signUpUrl="/signup" forceRedirectUrl="/studio" appearance={appearance} />}
        <p className="fine-print">By continuing, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy notice</Link>.</p>
      </div>
    </div>
  </main>;
}

const loginPoints = [
  ["Your sessions are waiting", "Every track, direction and version you made is saved in your library."],
  ["Pick up where you left off", "Open a session, play the latest version and refine it with a short note."],
  ["Download when it's right", "Get the full-length track as MP3 or WAV, ready for streaming."],
];
const signupPoints = [
  ["Add your tracks", "A beat and your vocal are all you need."],
  ["Describe the sound", "Write it in your own words: “afrobeats, vocals upfront, light autotune”."],
  ["Listen free, then refine", "Hear a free 30-second preview and ask for changes until it's right."],
];

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
  },
};
