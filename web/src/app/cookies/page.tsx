import type { Metadata } from "next";
import Link from "next/link";
import { SimplePage } from "@/components/site-chrome";
import { company } from "@/lib/company";

export const metadata: Metadata = { title: "Cookie policy" };

const cookies = [
  ["__session, __client_uat and related Clerk cookies", "Keep you signed in and protect your account", "Cookie, set by Clerk", "Session or up to 1 year"],
  ["fastmix.profile.*", "Remember your display name, language and email preference", "Browser storage", "Until you clear it"],
  ["fastmix.projects.v1, fastmix.active-project.v1", "Keep a copy of your session list and reopen the session you last worked on", "Browser storage", "Until you clear it"],
];

export default function CookiesPage() {
  const { product, privacyEmail, legalUpdated } = company;
  return <SimplePage label="Legal" title="Cookie policy" intro={`Last updated ${legalUpdated}. ${product} only uses cookies and browser storage that the service needs to work. We don't use analytics or advertising cookies.`}>
    <div className="prose legal">
      <h2>What we use</h2>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Cookies and browser storage we use"><table className="legal-table">
        <thead><tr><th>Name</th><th>Purpose</th><th>Type</th><th>Kept for</th></tr></thead>
        <tbody>{cookies.map(([name, purpose, type, duration]) => <tr key={name}><td>{name}</td><td>{purpose}</td><td>{type}</td><td>{duration}</td></tr>)}</tbody>
      </table></div>

      <h2>Your choices</h2>
      <p>Because these cookies are needed to sign in and use the studio, we don&apos;t ask for consent before setting them. You can block or delete cookies in your browser settings, but you won&apos;t be able to sign in without them. Clearing your browser storage resets your saved preferences.</p>

      <h2>Changes</h2>
      <p>If we ever add analytics or other optional cookies, we will update this page and ask for your consent where the law requires it before setting them.</p>
      <p>Questions: <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>. See also our <Link href="/privacy">Privacy policy</Link>.</p>
    </div>
  </SimplePage>;
}
