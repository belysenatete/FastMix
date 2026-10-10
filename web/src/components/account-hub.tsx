"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const styles = ["Modern pop", "Warm R&B", "Indie rock", "Bedroom pop", "Trap", "Afrobeats", "Dance pop", "Acoustic", "Dream pop", "Alt rock", "Soul", "Podcast voice"];
const mastering = ["Keep the vocal upfront and natural; control peaks without flattening the dynamics.", "Add gentle low-end weight while keeping the kick and bass distinct.", "Aim for a wide, polished pop mix with a stable centered lead vocal.", "Preserve the room tone and transients; use restrained compression.", "Tame harsh sibilance and upper mids without dulling the vocal.", "Create a warm, cohesive balance with smooth high frequencies."];

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <section className={`account-panel ${className}`}>{children}</section>; }
function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div className="account-heading"><span className="account-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>; }

export default function AccountHub({ email }: { email: string }) {
  const path = usePathname();
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("English");
  const [updates, setUpdates] = useState(false);
  const [tab, setTab] = useState("Mix prompts");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setName(localStorage.getItem("fastmix.profile.name") || email.split("@")[0]);
      setLanguage(localStorage.getItem("fastmix.profile.language") || "English");
      setUpdates(localStorage.getItem("fastmix.profile.updates") === "true");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [email]);

  async function copy(value: string, label = "Copied to clipboard") {
    try { await navigator.clipboard.writeText(value); setNotice(label); }
    catch { setNotice("Clipboard access is unavailable in this browser."); }
  }

  if (path.endsWith("/settings")) return <>
    <PageHeading eyebrow="YOUR ACCOUNT" title="Settings" description="Manage the preferences saved in this local preview." />
    <div className="account-grid">
      <Panel><h2>Profile</h2><p>Your account details for this preview workspace.</p><label className="account-field">Display name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /></label><label className="account-field">Email address<input value={email} readOnly /></label><button className="account-primary" onClick={() => { const savedName = name.trim() || email.split("@")[0]; setName(savedName); localStorage.setItem("fastmix.profile.name", savedName); window.dispatchEvent(new Event("fastmix-profile")); setNotice("Profile saved in this browser."); }}>Save profile</button></Panel>
      <Panel><h2>Preferences</h2><p>These choices stay in this browser only.</p><label className="account-field">Language<select value={language} onChange={(e) => { setLanguage(e.target.value); localStorage.setItem("fastmix.profile.language", e.target.value); }}><option>English</option><option>Français</option></select></label><label className="account-check"><input type="checkbox" checked={updates} onChange={(e) => { setUpdates(e.target.checked); localStorage.setItem("fastmix.profile.updates", String(e.target.checked)); }} /> Product update preference</label><button className="account-secondary" onClick={() => setNotice("Tutorial replay is available from the mixer welcome panel.")}>Replay the studio introduction</button></Panel>
      <Panel><h2>Sign-in &amp; security</h2><p>Clerk securely manages your sign-in, password, and email verification for this workspace.</p><div className="account-note">Use the account controls on the sign-in page if you need to recover access. Account deletion will be added with the full data removal workflow.</div></Panel>
      <Panel><h2>Account removal</h2><p>Projects can be deleted from My Library. Whole-account deletion requires a production identity and retention workflow.</p><a className="account-text-link" href="/studio/library">Manage your projects →</a></Panel>
    </div>
    {notice && <p className="account-feedback" role="status">{notice}</p>}
  </>;

  if (path.endsWith("/billing")) return <>
    <PageHeading eyebrow="YOUR PLAN" title="Plan & billing" description="Explore the plan area. Purchases are not enabled in this preview." />
    <div className="account-grid account-plans"><Panel><span className="account-eyebrow">CURRENT ACCESS</span><h2>Preview workspace</h2><p>You can explore the studio locally. No subscription is active and no payment method is attached.</p><span className="account-pill">No billing account connected</span></Panel><Panel><span className="account-eyebrow">PLAN OPTIONS</span><h2>Choose a plan</h2><p>Monthly and lifetime plan cards will be connected once prices, tax, refunds, and payment provider are configured.</p><button className="account-primary" onClick={() => setNotice("Purchases are disabled until a payment provider and approved pricing are configured.")}>Notify me when plans are ready</button></Panel></div>
    <Panel className="account-table"><h2>Invoices</h2><p>No invoices are available for this preview account.</p></Panel>
    {notice && <p className="account-feedback" role="status">{notice}</p>}
  </>;

  if (path.endsWith("/affiliate")) return <>
    <PageHeading eyebrow="SHARE FASTMIX" title="Affiliate dashboard" description="A preview of referral tools. The sample figures below are illustrative and do not represent tracked referrals or earnings." />
    <Panel className="affiliate-code"><div><span className="account-eyebrow">SAMPLE REFERRAL CODE</span><h2>FASTMIX-PREVIEW</h2><p>Referral tracking and attribution are not connected.</p></div><button className="account-primary" onClick={() => copy("FASTMIX-PREVIEW", "Sample code copied")}>Copy sample code</button></Panel>
    <div className="account-grid account-metrics">{[["Clicks", "—"], ["Sign-ups", "—"], ["Commission", "Not configured"]].map(([label, value]) => <Panel key={label}><span className="account-eyebrow">{label}</span><h2>{value}</h2><p>No live affiliate data is being collected.</p></Panel>)}</div>
    <Panel><h2>How referrals will work</h2><p>Attribution window, commission, eligible plans, fraud checks, and payout schedule need to be set before referrals can be activated.</p><a className="account-text-link" href="mailto:support@fastmix.example?subject=Affiliate%20program">Ask about the affiliate program →</a></Panel>
    {notice && <p className="account-feedback" role="status">{notice}</p>}
  </>;

  if (path.endsWith("/support")) return <>
    <PageHeading eyebrow="WE'RE HERE TO HELP" title="Support" description="Find a quick answer or send a note about your preview workspace." />
    <div className="account-grid"><Panel><h2>Common questions</h2>{[["Why is my mix taking a while?", "The local FFmpeg preview runs in a background worker. Queue and processing times depend on your local services."], ["Can I use phone-recorded vocals?", "Yes. Upload a supported audio file and keep the source recording if you want to compare versions."], ["Why does the result sound different?", "This preview balances and normalizes audio with FFmpeg. It does not use Easymix's AI model or reproduce its processing."], ["Which format can I download?", "The current preview produces a 24-bit, 48 kHz WAV output."], ["Can I redo a mix?", "Create another processing version from the mixer; prior completed versions remain in the library."]].map(([q, a]) => <details className="account-faq" key={q}><summary>{q}</summary><p>{a}</p></details>)}</Panel><Panel><h2>Contact</h2><p>Share what you were doing and include the session name and any error message.</p><a className="account-primary account-button-link" href="mailto:support@fastmix.example?subject=FastMix%20preview%20support">Email support</a><p className="account-caption">Replace this example address with your support inbox before launch.</p></Panel></div>
  </>;

  return <>
    <PageHeading eyebrow="LEARN YOUR SOUND" title="Sound guide" description="Copy a starting point, then adjust it to fit the recording. Prompts guide the local workflow; they do not activate AI processing." />
    <div className="account-tabs" role="tablist" aria-label="Sound guide topics">{["Mix prompts", "Mastering prompts", "Quick answers"].map((item) => <button role="tab" aria-selected={tab === item} className={tab === item ? "selected" : ""} key={item} onClick={() => setTab(item)}>{item}</button>)}</div>
    {tab === "Mix prompts" && <div className="account-grid">{styles.map((style) => <Panel key={style} className="prompt-card"><span className="account-eyebrow">STYLE STARTER</span><h2>{style}</h2><p>Balance the lead vocal clearly over the instrumental. Keep transients natural, leave space between parts, and avoid harsh top end.</p><button className="account-secondary" onClick={() => copy(`Mix style: ${style}. Balance the lead vocal clearly over the instrumental. Keep transients natural, leave space between parts, and avoid harsh top end.`, "Mix prompt copied")}>Copy prompt</button></Panel>)}</div>}
    {tab === "Mastering prompts" && <div className="account-grid">{mastering.map((prompt, i) => <Panel key={prompt} className="prompt-card"><span className="account-eyebrow">MASTERING TIP {String(i + 1).padStart(2, "0")}</span><p className="prompt-quote">“{prompt}”</p><button className="account-secondary" onClick={() => copy(prompt, "Mastering prompt copied")}>Copy prompt</button></Panel>)}</div>}
    {tab === "Quick answers" && <Panel>{[["Processing is slow", "Large audio files take longer to upload and process. Check that local worker services are running."], ["Phone vocals sound thin", "Use an uncompressed source when available and avoid recording too close to reflective surfaces."], ["The vocal sounds robotic", "This preview does not apply pitch correction or AI vocal effects."], ["What is the output format?", "WAV, 24-bit PCM at 48 kHz."], ["How do I redo a mix?", "Start another mix from your project. Completed versions stay available in the library."]].map(([q, a]) => <details className="account-faq" key={q}><summary>{q}</summary><p>{a}</p></details>)}</Panel>}
    {notice && <p className="account-feedback" role="status">{notice}</p>}
  </>;
}
