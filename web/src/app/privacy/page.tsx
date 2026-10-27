import type { Metadata } from "next";
import Link from "next/link";
import { SimplePage } from "@/components/site-chrome";
import { company } from "@/lib/company";

export const metadata: Metadata = { title: "Privacy policy" };

const providers = [
  ["Clerk", "Sign-in, passwords and email verification", "Account details, sign-in method, IP address and device information"],
  ["RoEx", "AI mixing and mastering", "The audio files and settings for the mix or master you request"],
  ["Stripe", "Payments (when paid plans are enabled)", "Billing details and card information, which we never see"],
  ["Hosting and storage providers", "Running the website, database and private file storage", "All data described on this page"],
];

export default function PrivacyPage() {
  const { legalName, product, privacyEmail, legalUpdated } = company;
  return <SimplePage label="Legal" title="Privacy policy" intro={`Last updated ${legalUpdated}. This policy explains what ${legalName} collects when you use ${product}, why, and the choices you have. We don't sell your personal information.`}>
    <div className="prose legal">
      <h2>1. What we collect</h2>
      <ul>
        <li><b>Account details:</b> your email address, optional name, and how you sign in. Passwords are handled by Clerk and are never stored by us in readable form.</li>
        <li><b>Your audio:</b> the files you upload and the mixes, masters and previews created from them, with their names, sizes and lengths.</li>
        <li><b>Your directions:</b> the sound descriptions and refinement notes you write, and the settings chosen from them.</li>
        <li><b>Usage:</b> sessions, versions, processing status and errors, and the number of tracks used on your plan.</li>
        <li><b>Device and network:</b> IP address, browser type and the cookies described in our <Link href="/cookies">Cookie policy</Link>.</li>
        <li><b>Billing:</b> your plan, invoices and payment status. Card numbers go directly to Stripe.</li>
        <li><b>Support:</b> messages you send us.</li>
      </ul>
      <p>We don&apos;t collect sensitive data such as government IDs, and we don&apos;t use advertising trackers.</p>

      <h2>2. How we use it</h2>
      <ul>
        <li>to provide {product}: process your audio, save your sessions and versions, and deliver downloads;</li>
        <li>to manage your account, plan and payments;</li>
        <li>to keep the service secure and prevent abuse of free previews and plan limits;</li>
        <li>to answer support requests and send service emails, such as receipts and important changes;</li>
        <li>to send product updates, only if you opt in, and you can opt out at any time;</li>
        <li>to meet legal, tax and accounting obligations.</li>
      </ul>
      <p><b>We do not use your audio to train AI models</b>, and we never share it for marketing.</p>

      <h2>3. Who we share it with</h2>
      <p>We share data only with providers that help us run {product}, under contracts that limit their use to providing their service to us:</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Providers we share data with"><table className="legal-table">
        <thead><tr><th>Provider</th><th>Purpose</th><th>Data</th></tr></thead>
        <tbody>{providers.map(([name, purpose, data]) => <tr key={name}><td>{name}</td><td>{purpose}</td><td>{data}</td></tr>)}</tbody>
      </table></div>
      <p>RoEx is based in the United Kingdom and handles files it processes under its own terms. We may also disclose information when the law requires it, to protect our users or the service, or as part of a merger or sale of the business, in which case this policy continues to apply.</p>

      <h2>4. How long we keep it</h2>
      <ul>
        <li><b>Audio and sessions:</b> until you delete them from your library or close your account. Deleting a session removes its files from our storage.</li>
        <li><b>Account details:</b> while your account is open, then deleted or anonymized within 30 days of closing it.</li>
        <li><b>Support messages:</b> up to 2 years.</li>
        <li><b>Billing records:</b> up to 7 years, as tax law requires.</li>
        <li><b>Backups:</b> deleted data leaves our backups within 90 days.</li>
      </ul>

      <h2>5. Security</h2>
      <p>Data is encrypted in transit with HTTPS. Audio is kept in private storage and is only reachable through links that expire after 15 minutes and are issued only to your account. Access to production systems is restricted. No system is perfectly secure, so please use a strong password and keep copies of important recordings.</p>

      <h2>6. Your choices and rights</h2>
      <p>You can update your profile in Settings and delete sessions and audio from your library at any time. You can also ask us to access, correct, export or delete your personal information by emailing <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>. We reply within 30 days and may need to confirm your identity first.</p>
      <p>Depending on where you live, including California and other U.S. states, the UK or the EU, you may have further rights, such as to object to or limit certain processing, or to appeal a decision about your request. We don&apos;t sell or share personal information for cross-context behavioral advertising, and we don&apos;t treat you differently for using your rights.</p>

      <h2>7. Children</h2>
      <p>{product} is not directed to children under 13, and we don&apos;t knowingly collect their information. Users aged 13 to 17 need a parent or guardian&apos;s permission. If you believe a child under 13 has given us information, contact us and we will delete it.</p>

      <h2>8. International processing</h2>
      <p>{legalName} is based in the United States. Our providers may process data in the United States, the United Kingdom and other countries. When data moves between countries, we rely on our providers&apos; contractual and security safeguards.</p>

      <h2>9. Changes</h2>
      <p>We will update this policy when our practices change and show the new date at the top. For important changes, we will tell you by email or in the studio.</p>

      <h2>10. Contact</h2>
      <p>{legalName}, operator of {product}: <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.</p>
    </div>
  </SimplePage>;
}
