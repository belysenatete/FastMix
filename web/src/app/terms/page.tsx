import type { Metadata } from "next";
import Link from "next/link";
import { SimplePage } from "@/components/site-chrome";
import { company } from "@/lib/company";

export const metadata: Metadata = { title: "Terms of service" };

const sections = [
  ["service", "The service"], ["accounts", "Accounts"], ["plans", "Plans, billing and renewal"], ["cancel", "Cancellation"],
  ["refunds", "Refunds"], ["content", "Your music"], ["use", "Acceptable use"], ["copyright", "Copyright complaints"],
  ["providers", "Processing partners"], ["disclaimer", "Disclaimer"], ["liability", "Limitation of liability"],
  ["termination", "Termination"], ["law", "Governing law"], ["changes", "Changes"], ["contact", "Contact"],
];

export default function TermsPage() {
  const { legalName, product, supportEmail, legalUpdated } = company;
  return <SimplePage label="Legal" title="Terms of service" intro={`Last updated ${legalUpdated}. These terms are an agreement between you and ${legalName}, which operates ${product}.`}>
    <div className="prose legal">
      <nav className="legal-toc" aria-label="On this page">{sections.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>

      <h2>1. Acceptance</h2>
      <p>By creating an account or using {product}, you agree to these terms and to the <Link href="/privacy">Privacy policy</Link>. If you don&apos;t agree, don&apos;t use the service. If you use {product} for a company or label, you confirm you can accept these terms on its behalf.</p>
      <p>You must be at least 18, or at least 13 with the permission of a parent or guardian who accepts these terms for you.</p>

      <h2 id="service">2. The service</h2>
      <p>{product} is an online tool that mixes and masters audio you upload. You add a beat, vocals or a finished song, describe the sound you want, and receive an automatically processed result that you can refine and download.</p>
      <p>Results depend on the quality of your recordings. Mixing and mastering are automated, so the same files can produce slightly different results, and {product} does not fix timing, key or performance problems. We may add, change or remove features over time.</p>

      <h2 id="accounts">3. Accounts</h2>
      <p>You need an account to use the studio. Give accurate information, keep your sign-in details private, and don&apos;t share your account. You are responsible for activity on your account. Tell us at <a href={`mailto:${supportEmail}`}>{supportEmail}</a> if you think someone else has used it.</p>

      <h2 id="plans">4. Plans, billing and renewal</h2>
      <ul>
        <li><b>Starter</b> is free and includes 30-second previews. We may apply fair-use limits to prevent abuse.</li>
        <li><b>Monthly plans</b> are billed in advance in US dollars and <b>renew automatically every month</b> at the price shown at checkout until you cancel. Payments are processed by Stripe, and by subscribing you authorize recurring charges to your payment method.</li>
        <li><b>Lifetime plans</b> are a single payment for access to the plan&apos;s features and monthly allowance for as long as {product} operates the service. &quot;Lifetime&quot; refers to the life of the service, not of the buyer. Lifetime plans can&apos;t be transferred.</li>
        <li>Each plan includes a number of <b>full-length tracks</b> per calendar month, shown on the <Link href="/pricing">pricing page</Link>. Each new full-length mix or master counts as one track; previews and re-downloading a version you already rendered do not. Unused tracks don&apos;t roll over.</li>
        <li>Prices exclude any sales tax that applies where you live, which is added at checkout.</li>
        <li>We may change prices. We will tell you at least 30 days before a new price applies to your subscription, and it will apply from your next renewal. Lifetime plans already paid for are not charged again.</li>
      </ul>

      <h2 id="cancel">5. Cancellation</h2>
      <p>You can cancel a monthly plan at any time from Plan &amp; billing in the studio or by emailing <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Cancellation takes effect at the end of the current billing period, and you keep access until then. Your account then returns to Starter, and your library stays available.</p>

      <h2 id="refunds">6. Refunds</h2>
      <p>You can preview results for free before paying, so payments are non-refundable once you have used a paid plan (for example, rendered a full-length track), except where the law requires a refund.</p>
      <p>We will refund you if you were charged twice by mistake, or if a fault on our side stopped you from using the paid features and you reported it within 7 days of the charge. Send refund requests to <a href={`mailto:${supportEmail}`}>{supportEmail}</a> with your account email, the date of the charge and the reason.</p>

      <h2 id="content">7. Your music</h2>
      <p><b>You own your music.</b> You keep all rights to the audio you upload and to the mixes and masters {product} produces from it. We claim no ownership and take no royalties or credits.</p>
      <p>To run the service, you give us a limited, non-exclusive, worldwide, royalty-free license to store, copy, process and transmit your files only to provide {product} to you, including sending them to our processing partners. This license ends when you delete the files or your account, except for copies kept for a short time in backups. We do not use your audio to train AI models.</p>
      <p>Only upload audio you own or have permission to use, including any samples, beats and vocals. You are responsible for clearing rights before you release a song.</p>

      <h2 id="use">8. Acceptable use</h2>
      <p>Don&apos;t use {product} to:</p>
      <ul>
        <li>upload content that infringes someone else&apos;s copyright or other rights, or that is unlawful, hateful, harassing or sexually exploits minors;</li>
        <li>upload malware or files designed to harm the service;</li>
        <li>get around plan limits, share accounts, or use automated scripts to access the studio;</li>
        <li>probe, overload or disrupt our systems, or reverse engineer the service;</li>
        <li>resell or provide {product} processing to others as a competing service.</li>
      </ul>
      <p>We may remove content or suspend accounts that break these rules.</p>

      <h2 id="copyright">9. Copyright complaints</h2>
      <p>If you believe content on {product} infringes your copyright, send a notice to <a href={`mailto:${supportEmail}`}>{supportEmail}</a> with: your contact details, the work you own, where the content appears, a statement that you believe in good faith the use is not authorized, a statement that your notice is accurate and that you are the owner or authorized to act for the owner, and your physical or electronic signature. We respond to valid notices under the U.S. Digital Millennium Copyright Act and close the accounts of repeat infringers.</p>

      <h2 id="providers">10. Processing partners</h2>
      <p>AI mixing and mastering is performed by our processing partner, RoEx, and sign-in is handled by Clerk. When you request a mix or master, your audio is sent to RoEx to create it. These providers are listed in the <Link href="/privacy">Privacy policy</Link>.</p>
      <p>The {product} name, logo, interface and software belong to {legalName}. You may not copy or reuse them without permission.</p>

      <h2 id="disclaimer">11. Disclaimer</h2>
      <p>{product} is provided &quot;as is&quot; and &quot;as available&quot;. To the extent the law allows, we disclaim all warranties, express or implied, including merchantability, fitness for a particular purpose and non-infringement. We don&apos;t guarantee that results will meet your expectations or a professional standard for every recording, or that the service will be uninterrupted or error-free. We may pause the service for maintenance. Keep your own copies of important recordings.</p>

      <h2 id="liability">12. Limitation of liability</h2>
      <p>To the extent the law allows, {legalName} is not liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, revenue or data. Our total liability for any claim relating to {product} is limited to the amount you paid us in the three months before the event giving rise to the claim. Some places don&apos;t allow these limits, so they may not fully apply to you.</p>
      <p>You agree to cover {legalName}&apos;s reasonable costs from claims by others that arise from content you upload or your breach of these terms.</p>

      <h2 id="termination">13. Termination</h2>
      <p>You can close your account at any time by contacting us. We may suspend or close an account that breaks these terms, puts the service or other users at risk, or where the law requires it. If we close a paid account without cause, we will refund the unused part of a monthly subscription. Sections 6, 7, 11, 12 and 14 continue after termination.</p>

      <h2 id="law">14. Governing law</h2>
      <p>These terms are governed by the laws of the United States and of the state where {legalName} is organized, without regard to conflict-of-laws rules. Before filing a claim, contact us so we can try to resolve it informally within 30 days. If we can&apos;t, disputes go to the competent courts of that state, unless the consumer law where you live gives you the right to bring a claim locally.</p>

      <h2 id="changes">15. Changes</h2>
      <p>We may update these terms. We will change the date at the top and, for important changes, tell you by email or in the studio before they take effect. If you keep using {product} after that, you accept the new terms.</p>

      <h2 id="contact">16. Contact</h2>
      <p>Questions about these terms: <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
    </div>
  </SimplePage>;
}
