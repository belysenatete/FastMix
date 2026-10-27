"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatPrice, plans } from "@/lib/plans";
import { fetchUsage, resetDate, Usage } from "@/lib/usage";

const mixPrompts = [
  ["Afrobeats", "Afrobeats party, vocals upfront, light autotune, some reverb, loud and punchy"],
  ["Trap", "Melodic trap, vocals upfront, hard autotune, some reverb, loud"],
  ["Drill", "Dark drill, dry vocal upfront, subtle autotune, punchy and loud"],
  ["Reggaeton", "Reggaeton, vocals upfront, light autotune, some reverb, loud and punchy"],
  ["RnB", "Smooth RnB, warm vocal, subtle autotune, lush reverb, keep it dynamic"],
  ["Pop", "Bright pop, vocals upfront, light autotune, some reverb, radio loud"],
  ["Lo-fi", "Lo-fi, soft vocal blended into the beat, some reverb, keep it dynamic"],
  ["Acoustic", "Acoustic, natural vocal, no autotune, some reverb, gentle and dynamic"],
];
const masterPrompts = [
  ["Streaming", "Streaming-ready, balanced and natural, keep it dynamic"],
  ["Club", "Loud club master, punchy low end, trap"],
  ["Warm", "Warm and smooth, pop, not too loud"],
  ["Demo", "Clean master for a label demo, natural dynamics"],
];
const answers = [
  ["Processing is slow", "A preview usually takes one to two minutes. Large files take longer to upload."],
  ["My vocal sounds thin", "Record close to the microphone in a quiet room, then ask for “vocal upfront” or “warmer vocal”."],
  ["The vocal sounds robotic", "Write “subtle autotune” for natural correction or “no autotune” to turn it off. “Hard autotune” gives the robotic effect on purpose."],
  ["Which format do I get?", "Pro downloads full tracks as 320 kbps MP3. Artist can download MP3 or WAV. Both are ready for streaming platforms."],
  ["How do I change a mix?", "Under step 3 in the mixer, write what should change, for example “vocal louder”. Earlier versions stay in your library."],
];

function UsageMeter({ label, used, limit }: { label: string; used: number; limit: number }) {
  return <div className="usage-meter">
    <p><span>{label}</span><b className="mono">{used} / {limit}</b></p>
    <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={used}><i style={{ width: `${limit ? Math.min(100, (used / limit) * 100) : 0}%` }} /></div>
  </div>;
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <section className={`card ${className}`}>{children}</section>; }
function PageHead({ title, description }: { title: string; description: string }) { return <div className="page-head"><div><h1>{title}</h1><p>{description}</p></div></div>; }

export default function AccountHub({ email }: { email: string }) {
  const path = usePathname();
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("English");
  const [updates, setUpdates] = useState(false);
  const [tab, setTab] = useState("Mix prompts");
  const [usage, setUsage] = useState<Usage | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const clerk = useClerk();
  const router = useRouter();

  async function deleteAccount() {
    setDeleting(true);
    try {
      const response = await fetch("/api/account", { method: "DELETE" });
      const body = await response.json().catch(() => ({})) as { detail?: string; error?: string };
      if (!response.ok) throw new Error(body.detail || body.error || "Your account could not be deleted. Please retry.");
      // Drop the cached session list and profile kept in this browser.
      try { Object.keys(localStorage).filter((key) => key.startsWith("fastmix.")).forEach((key) => localStorage.removeItem(key)); } catch { /* storage unavailable */ }
      await clerk.signOut({ redirectUrl: "/" }).catch(() => router.replace("/"));
    } catch (issue) {
      setNotice(issue instanceof Error ? issue.message : "Your account could not be deleted. Please retry.");
      setDeleting(false);
    }
  }

  useEffect(() => {
    if (!path.endsWith("/billing")) return;
    let mounted = true;
    void fetchUsage().then((result) => { if (mounted) setUsage(result); });
    return () => { mounted = false; };
  }, [path]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setName(localStorage.getItem("fastmix.profile.name") || email.split("@")[0]);
      setLanguage(localStorage.getItem("fastmix.profile.language") || "English");
      setUpdates(localStorage.getItem("fastmix.profile.updates") === "true");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [email]);

  async function copy(value: string, label = "Copied") {
    try { await navigator.clipboard.writeText(value); setNotice(`${label}. Paste it into step 2 of the mixer.`); }
    catch { setNotice("Clipboard access is unavailable in this browser."); }
  }

  const feedback = notice && <p className="notice-bar" role="status"><span>{notice}</span><button aria-label="Dismiss" onClick={() => setNotice("")}>×</button></p>;

  if (path.endsWith("/settings")) return <>
    <PageHead title="Settings" description="Your profile and preferences." />
    {feedback}
    <div className="card-grid">
      <Card><h2>Profile</h2><label className="field">Display name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></label><label className="field">Email address<input value={email} readOnly /></label><button className="btn btn-primary" onClick={() => { const savedName = name.trim() || email.split("@")[0]; setName(savedName); localStorage.setItem("fastmix.profile.name", savedName); window.dispatchEvent(new Event("fastmix-profile")); setNotice("Profile saved in this browser."); }}>Save profile</button></Card>
      <Card><h2>Preferences</h2><p className="hint">Saved in this browser only.</p><label className="field">Language<select value={language} onChange={(e) => { setLanguage(e.target.value); localStorage.setItem("fastmix.profile.language", e.target.value); }}><option>English</option><option>Français</option></select></label><label className="check"><input type="checkbox" checked={updates} onChange={(e) => { setUpdates(e.target.checked); localStorage.setItem("fastmix.profile.updates", String(e.target.checked)); }} /> Email me about product updates</label></Card>
      <Card><h2>Sign-in and security</h2><p>Clerk manages your sign-in, password and email verification. Use “Forgot password” on the sign-in page to recover access.</p></Card>
      <Card><h2>Delete your account</h2>
        <p>Deletes your sessions, uploaded tracks, mixes and sign-in for good. This can&apos;t be undone. To remove only some sessions, use the <Link className="text-link" href="/studio/library">library</Link>.</p>
        <label className="field">Type DELETE to confirm<input value={deleteConfirm} onChange={(event) => setDeleteConfirm(event.target.value)} autoComplete="off" /></label>
        <button className="btn btn-danger-outline" disabled={deleteConfirm !== "DELETE" || deleting} onClick={() => void deleteAccount()}>{deleting ? "Deleting…" : "Delete my account"}</button>
      </Card>
    </div>
  </>;

  if (path.endsWith("/billing")) return <>
    <PageHead title="Plan & billing" description="Your plan and what you have used. Checkout opens at launch." />
    {feedback}
    <div className="card-grid">
      <Card><h2>Current plan</h2>{usage ? <>
        <p className="plan-price">{usage.planName}</p>
        <UsageMeter label="Full-length tracks this month" used={usage.fullTracks.used} limit={usage.fullTracks.limit} />
        <p className="hint">{usage.fullTracks.limit ? `Resets on ${resetDate(usage)}.` : "Previews are free. Full-length tracks come with Pro and Artist."}</p>
        <UsageMeter label="Previews in the last 24 hours" used={usage.previews.used} limit={usage.previews.limit} />
        <p className="hint">Previews are free, with a fair-use limit.</p>
      </> : <p>Your plan and usage appear here once the audio service is running.</p>}</Card>
      <Card><h2>Pro and Artist</h2><p className="plan-price">From {formatPrice(plans[0].price.monthly)}/mo</p><p>{plans.map((plan) => `${plan.name}: ${plan.tracks} full-length tracks a month for ${formatPrice(plan.price.monthly)}/mo or ${formatPrice(plan.price.yearly)}/yr.`).join(" ")} Checkout opens at launch.</p><Link className="text-link" href="/pricing">Compare plans →</Link></Card>
      <Card><h2>Invoices</h2><p>No invoices yet.</p></Card>
    </div>
  </>;

  if (path.endsWith("/affiliate")) return <>
    <PageHead title="Affiliate program" description="Referral tracking isn't active yet. The code below is a sample." />
    {feedback}
    <div className="card-grid">
      <Card><h2>Sample referral code</h2><p className="code">FASTMIX-PREVIEW</p><button className="btn btn-secondary" onClick={() => void copy("FASTMIX-PREVIEW", "Sample code copied")}>Copy code</button></Card>
      <Card><h2>How it will work</h2><p>Commission, attribution window, eligible plans and payout schedule will be announced before referrals open.</p><a className="text-link" href="mailto:support@fastmix.example?subject=Affiliate%20program">Ask about the program →</a></Card>
    </div>
  </>;

  if (path.endsWith("/support")) return <>
    <PageHead title="Help & support" description="Quick answers, or write to us." />
    <div className="card-grid">
      <Card><h2>Common questions</h2><div className="faq">{answers.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></Card>
      <Card><h2>Contact</h2><p>Tell us what you were doing, the session name and any error message.</p><a className="btn btn-primary" href="mailto:support@fastmix.example?subject=FastMix%20support">Email support</a><p className="hint">Replace this example address with your support inbox before launch.</p></Card>
    </div>
  </>;

  const prompts = tab === "Mix prompts" ? mixPrompts : masterPrompts;
  return <>
    <PageHead title="Sound guide" description="Copy a starting point into step 2 of the mixer, then adjust it to your song." />
    <div className="tabs" role="tablist" aria-label="Guide topics">{["Mix prompts", "Master prompts", "Quick answers"].map((item) => <button role="tab" aria-selected={tab === item} key={item} onClick={() => setTab(item)}>{item}</button>)}</div>
    {feedback}
    {tab === "Quick answers" ? <Card><div className="faq">{answers.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></Card>
      : <div className="card-grid card-grid-3">{prompts.map(([style, prompt]) => <Card key={style} className="prompt-card"><h2>{style}</h2><p className="prompt-text">“{prompt}”</p><button className="btn btn-secondary btn-small" onClick={() => void copy(prompt, "Prompt copied")}>Copy</button></Card>)}</div>}
  </>;
}
