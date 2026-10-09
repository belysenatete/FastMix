"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function AuthCard({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [email, setEmail] = useState("artist@fastmix.local");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const isSignup = mode === "signup";

  async function enterDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Couldn't open the demo workspace.");
      router.push("/studio");
      router.refresh();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Couldn't open the demo workspace.");
      setPending(false);
    }
  }

  return <main className="auth-page"><Link href="/" className="auth-home">← Back to FastMix</Link><div className="auth-card"><Link href="/" className="brand"><span className="brand-mark" aria-hidden="true"><i/><i/><i/><i/><i/></span><span>fastmix<span className="brand-dot">.</span></span></Link><div className="auth-kicker">LOCAL PREVIEW</div><h1>{isSignup ? "Make a little room." : "Welcome to your studio."}</h1><p className="auth-subtitle">{isSignup ? "Open a local preview workspace and explore the FastMix workflow." : "Pick up where your next mix begins."}</p><div className="demo-notice"><span>i</span><p>This is a development demo. It does not create a production account or store a password. Google sign-in and real email authentication are not configured yet.</p></div><form onSubmit={enterDemo}><label htmlFor="demo-email">Email for this local preview</label><input id="demo-email" autoComplete="email" type="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /><button className="button button-lime auth-submit" disabled={pending}>{pending ? "Opening your studio…" : "Continue to demo studio"}<span>↗</span></button>{error && <p className="form-error" role="alert">{error}</p>}</form><div className="auth-divider"><span>PREVIEW ACCESS</span></div><div className="auth-method"><span className="preview-lock">◇</span><span><b>No password needed</b><small>Use any email address in local preview mode</small></span><span className="method-status">LOCAL</span></div><p className="auth-switch">{isSignup ? "Already have a workspace?" : "New to FastMix?"} <Link href={isSignup ? "/login" : "/signup"}>{isSignup ? "Log in" : "Create a preview"}</Link></p><p className="auth-legal">By continuing, you agree to our <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy notice</Link>.</p></div><div className="auth-footer">A calmer place to shape your sound.</div></main>;
}
