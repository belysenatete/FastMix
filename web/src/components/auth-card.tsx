import Link from "next/link";
import { SignIn, SignUp } from "@clerk/nextjs";

export default function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const isSignup = mode === "signup";
  return <main className="auth-page"><Link href="/" className="auth-home">← Back to FastMix</Link><div className="auth-card"><Link href="/" className="brand"><span className="brand-mark" aria-hidden="true"><i/><i/><i/><i/><i/></span><span>fastmix<span className="brand-dot">.</span></span></Link><div className="auth-kicker">YOUR ARTIST WORKSPACE</div><h1>{isSignup ? "Make a little room." : "Welcome to your studio."}</h1><p className="auth-subtitle">{isSignup ? "Create your account and bring your next idea into the studio." : "Sign in and pick up where your next mix begins."}</p><div className="clerk-auth">{isSignup ? <SignUp routing="hash" signInUrl="/login" forceRedirectUrl="/studio" appearance={appearance} /> : <SignIn routing="hash" signUpUrl="/signup" forceRedirectUrl="/studio" appearance={appearance} />}</div><p className="auth-legal">By continuing, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy notice</Link>.</p></div><div className="auth-footer">A calmer place to shape your sound.</div></main>;
}

const appearance = {
  variables: {
    colorPrimary: "#c8f36b",
    colorBackground: "#121815",
    colorText: "#edf2ec",
    colorTextSecondary: "#97a198",
    borderRadius: "2px",
  },
  elements: {
    rootBox: "clerk-root",
    card: "clerk-card",
    headerTitle: "clerk-title",
    headerSubtitle: "clerk-subtitle",
    socialButtonsBlockButton: "clerk-social-button",
    formButtonPrimary: "clerk-primary-button",
    formFieldInput: "clerk-input",
    footerActionLink: "clerk-link",
    dividerLine: "clerk-divider",
    dividerText: "clerk-divider-text",
  },
};
