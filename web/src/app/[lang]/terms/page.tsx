import type { Metadata } from "next";
import Link from "next/link";
import { SimplePage } from "@/components/site-chrome";
import { company } from "@/lib/company";
import { getLocale } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "fr" ? "Conditions d’utilisation" : "Terms of service" };
}

const sections = [
  ["service", "The service"], ["accounts", "Accounts"], ["plans", "Plans, billing and renewal"], ["cancel", "Cancellation"],
  ["refunds", "Refunds"], ["content", "Your music"], ["use", "Acceptable use"], ["copyright", "Copyright complaints"],
  ["providers", "Processing partners"], ["disclaimer", "Disclaimer"], ["liability", "Limitation of liability"],
  ["termination", "Termination"], ["law", "Governing law"], ["changes", "Changes"], ["contact", "Contact"],
];

export default async function TermsPage() {
  const locale = await getLocale();
  return locale === "fr" ? <TermsFr /> : <TermsEn />;
}

function TermsEn() {
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
        <li><b>Our order process is conducted by our online reseller Paddle.com.</b> Paddle.com is the Merchant of Record for all our orders: it processes your payment, issues your invoice and handles customer service enquiries about billing and returns. Its <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer">buyer terms</a> also apply to your purchase.</li>
        <li><b>Monthly and yearly plans</b> are billed in advance in US dollars (in euros in euro-area countries) and <b>renew automatically</b> at the end of each month or year, at the price shown at checkout, until you cancel. By subscribing you authorize recurring charges to your payment method. We email a reminder before a yearly plan renews.</li>
        <li>The <b>Lifetime</b> plan is a single payment, offered to the first 100 buyers only. It includes the monthly allowance shown at purchase for as long as {product} operates, with no renewal charges.</li>
        <li>Each plan includes a number of <b>full-length tracks</b> per calendar month, shown on the <Link href="/pricing">pricing page</Link>. Each new full-length mix or master counts as one track; previews and re-downloading a version you already rendered do not. Unused tracks don&apos;t roll over.</li>
        <li>Prices include any sales tax or VAT that applies where you live; checkout shows the tax included.</li>
        <li>We may change prices. We will tell you at least 30 days before a new price applies to your subscription, and it will apply from your next renewal.</li>
      </ul>

      <h2 id="cancel">5. Cancellation</h2>
      <p>You can cancel a monthly or yearly plan at any time from Plan &amp; billing in the studio or by emailing <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. Cancellation takes effect at the end of the current billing period, and you keep access until then. Your account then returns to Starter, and your library stays available.</p>

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
      <p>You can close your account at any time by contacting us. We may suspend or close an account that breaks these terms, puts the service or other users at risk, or where the law requires it. If we close a paid account without cause, we will refund the unused part of your subscription. Sections 6, 7, 11, 12 and 14 continue after termination.</p>

      <h2 id="law">14. Governing law</h2>
      <p>These terms are governed by the laws of the United States and of the state where {legalName} is organized, without regard to conflict-of-laws rules. Before filing a claim, contact us so we can try to resolve it informally within 30 days. If we can&apos;t, disputes go to the competent courts of that state, unless the consumer law where you live gives you the right to bring a claim locally.</p>

      <h2 id="changes">15. Changes</h2>
      <p>We may update these terms. We will change the date at the top and, for important changes, tell you by email or in the studio before they take effect. If you keep using {product} after that, you accept the new terms.</p>

      <h2 id="contact">16. Contact</h2>
      <p>Questions about these terms: <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
    </div>
  </SimplePage>;
}

const sectionsFr = [
  ["service", "Le service"], ["accounts", "Comptes"], ["plans", "Forfaits, facturation et renouvellement"], ["cancel", "Résiliation"],
  ["refunds", "Remboursements"], ["content", "Votre musique"], ["use", "Utilisation acceptable"], ["copyright", "Réclamations pour atteinte au droit d’auteur"],
  ["providers", "Partenaires de traitement"], ["disclaimer", "Exclusion de garanties"], ["liability", "Limitation de responsabilité"],
  ["termination", "Clôture du compte"], ["law", "Droit applicable"], ["changes", "Modifications"], ["contact", "Contact"],
];

function TermsFr() {
  const { legalName, product, supportEmail, legalUpdatedFr } = company;
  return <SimplePage label="Juridique" title="Conditions d’utilisation" intro={`Dernière mise à jour : ${legalUpdatedFr}. Les présentes conditions constituent un accord entre vous et ${legalName}, qui exploite ${product}.`}>
    <div className="prose legal">
      <nav className="legal-toc" aria-label="Sur cette page">{sectionsFr.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>

      <h2>1. Acceptation</h2>
      <p>En créant un compte ou en utilisant {product}, vous acceptez les présentes conditions ainsi que la <Link href="/privacy">Politique de confidentialité</Link>. Si vous ne les acceptez pas, n’utilisez pas le service. Si vous utilisez {product} pour le compte d’une entreprise ou d’un label, vous confirmez être habilité à accepter ces conditions en son nom.</p>
      <p>Vous devez avoir au moins 18 ans, ou au moins 13 ans avec l’autorisation d’un parent ou d’un tuteur légal qui accepte ces conditions pour vous.</p>

      <h2 id="service">2. Le service</h2>
      <p>{product} est un outil en ligne qui mixe et masterise l’audio que vous importez. Vous ajoutez un beat, des voix ou un morceau fini, vous décrivez le son que vous souhaitez, et vous recevez un résultat traité automatiquement que vous pouvez affiner et télécharger.</p>
      <p>Les résultats dépendent de la qualité de vos enregistrements. Le mixage et le mastering sont automatisés : les mêmes fichiers peuvent donc produire des résultats légèrement différents, et {product} ne corrige pas les problèmes de rythme, de tonalité ou d’interprétation. Nous pouvons ajouter, modifier ou retirer des fonctionnalités au fil du temps.</p>

      <h2 id="accounts">3. Comptes</h2>
      <p>Vous avez besoin d’un compte pour utiliser le studio. Fournissez des informations exactes, gardez vos identifiants de connexion confidentiels et ne partagez pas votre compte. Vous êtes responsable de l’activité de votre compte. Prévenez-nous à <a href={`mailto:${supportEmail}`}>{supportEmail}</a> si vous pensez que quelqu’un d’autre l’a utilisé.</p>

      <h2 id="plans">4. Forfaits, facturation et renouvellement</h2>
      <ul>
        <li><b>Starter</b> est gratuit et comprend des aperçus de 30 secondes. Nous pouvons appliquer des limites d’usage raisonnable pour prévenir les abus.</li>
        <li><b>Nos commandes sont traitées par notre revendeur en ligne Paddle.com.</b> Paddle.com est le vendeur officiel (Merchant of Record) de toutes nos commandes : il traite votre paiement, émet votre facture et répond aux demandes concernant la facturation et les remboursements. Ses <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" rel="noopener noreferrer">conditions acheteur</a> s’appliquent également à votre achat.</li>
        <li><b>Les forfaits mensuels et annuels</b> sont facturés d’avance en dollars américains (en euros dans les pays de la zone euro) et <b>se renouvellent automatiquement</b> à la fin de chaque mois ou de chaque année, au prix affiché lors du paiement, jusqu’à ce que vous les résiliiez. En vous abonnant, vous autorisez des prélèvements récurrents sur votre moyen de paiement. Nous vous envoyons un rappel par e-mail avant le renouvellement d’un forfait annuel.</li>
        <li>Le forfait <b>À vie</b> est un paiement unique, proposé aux 100 premiers acheteurs uniquement. Il comprend le quota mensuel indiqué lors de l’achat aussi longtemps que {product} est en service, sans frais de renouvellement.</li>
        <li>Chaque forfait comprend un nombre de <b>titres complets</b> par mois civil, indiqué sur la <Link href="/pricing">page des tarifs</Link>. Chaque nouveau mix ou master complet compte pour un titre ; les aperçus et le nouveau téléchargement d’une version déjà générée ne comptent pas. Les titres non utilisés ne sont pas reportés.</li>
        <li>Les prix incluent les éventuelles taxes sur les ventes ou la TVA applicables dans votre lieu de résidence ; le montant de la taxe est indiqué lors du paiement.</li>
        <li>Nous pouvons modifier nos prix. Nous vous préviendrons au moins 30 jours avant qu’un nouveau prix s’applique à votre abonnement, et il s’appliquera à partir de votre prochain renouvellement.</li>
      </ul>

      <h2 id="cancel">5. Résiliation</h2>
      <p>Vous pouvez résilier un forfait mensuel ou annuel à tout moment depuis la rubrique Forfait et facturation du studio ou en écrivant à <a href={`mailto:${supportEmail}`}>{supportEmail}</a>. La résiliation prend effet à la fin de la période de facturation en cours, et vous conservez l’accès jusqu’à cette date. Votre compte repasse ensuite au forfait Starter, et votre bibliothèque reste disponible.</p>

      <h2 id="refunds">6. Remboursements</h2>
      <p>Vous pouvez écouter un aperçu gratuit des résultats avant de payer : les paiements ne sont donc pas remboursables dès lors que vous avez utilisé un forfait payant (par exemple, en générant un titre complet), sauf lorsque la loi impose un remboursement.</p>
      <p>Nous vous rembourserons si vous avez été débité deux fois par erreur, ou si une défaillance de notre part vous a empêché d’utiliser les fonctionnalités payantes et que vous l’avez signalée dans les 7 jours suivant le prélèvement. Envoyez vos demandes de remboursement à <a href={`mailto:${supportEmail}`}>{supportEmail}</a> en indiquant l’adresse e-mail de votre compte, la date du prélèvement et le motif.</p>

      <h2 id="content">7. Votre musique</h2>
      <p><b>Votre musique vous appartient.</b> Vous conservez tous les droits sur l’audio que vous importez ainsi que sur les mix et masters que {product} produit à partir de celui-ci. Nous ne revendiquons aucune propriété et ne prélevons ni redevances ni crédits.</p>
      <p>Pour faire fonctionner le service, vous nous accordez une licence limitée, non exclusive, mondiale et gratuite pour stocker, copier, traiter et transmettre vos fichiers, uniquement afin de vous fournir {product}, y compris en les envoyant à nos partenaires de traitement. Cette licence prend fin lorsque vous supprimez les fichiers ou votre compte, à l’exception des copies conservées pendant une courte durée dans nos sauvegardes. Nous n’utilisons pas votre audio pour entraîner des modèles d’IA.</p>
      <p>N’importez que de l’audio dont vous êtes propriétaire ou que vous êtes autorisé à utiliser, y compris les samples, beats et voix. Il vous appartient d’obtenir les droits nécessaires avant de publier un morceau.</p>

      <h2 id="use">8. Utilisation acceptable</h2>
      <p>N’utilisez pas {product} pour :</p>
      <ul>
        <li>importer un contenu qui porte atteinte au droit d’auteur ou à d’autres droits d’autrui, ou qui est illégal, haineux, harcelant ou qui exploite sexuellement des mineurs ;</li>
        <li>importer des logiciels malveillants ou des fichiers conçus pour nuire au service ;</li>
        <li>contourner les limites des forfaits, partager des comptes ou utiliser des scripts automatisés pour accéder au studio ;</li>
        <li>sonder, surcharger ou perturber nos systèmes, ou procéder à l’ingénierie inverse du service ;</li>
        <li>revendre le traitement de {product} ou le fournir à des tiers sous la forme d’un service concurrent.</li>
      </ul>
      <p>Nous pouvons retirer des contenus ou suspendre des comptes qui enfreignent ces règles.</p>

      <h2 id="copyright">9. Réclamations pour atteinte au droit d’auteur</h2>
      <p>Si vous estimez qu’un contenu présent sur {product} porte atteinte à vos droits d’auteur, envoyez une notification à <a href={`mailto:${supportEmail}`}>{supportEmail}</a> comprenant : vos coordonnées, l’œuvre dont vous êtes titulaire, l’endroit où le contenu apparaît, une déclaration indiquant que vous estimez de bonne foi que l’utilisation n’est pas autorisée, une déclaration attestant que votre notification est exacte et que vous êtes le titulaire des droits ou êtes autorisé à agir en son nom, ainsi que votre signature manuscrite ou électronique. Nous donnons suite aux notifications valables conformément au Digital Millennium Copyright Act américain et fermons les comptes des contrevenants récidivistes.</p>

      <h2 id="providers">10. Partenaires de traitement</h2>
      <p>Le mixage et le mastering par IA sont réalisés par notre partenaire de traitement, RoEx, et la connexion est gérée par Clerk. Lorsque vous demandez un mix ou un master, votre audio est envoyé à RoEx pour le créer. Ces prestataires sont mentionnés dans la <Link href="/privacy">Politique de confidentialité</Link>.</p>
      <p>Le nom, le logo, l’interface et le logiciel {product} appartiennent à {legalName}. Vous ne pouvez pas les copier ni les réutiliser sans autorisation.</p>

      <h2 id="disclaimer">11. Exclusion de garanties</h2>
      <p>{product} est fourni « en l’état » et « selon disponibilité ». Dans la mesure permise par la loi, nous excluons toute garantie, expresse ou implicite, y compris les garanties de qualité marchande, d’adéquation à un usage particulier et d’absence de contrefaçon. Nous ne garantissons pas que les résultats répondront à vos attentes ou à un niveau professionnel pour chaque enregistrement, ni que le service sera ininterrompu ou exempt d’erreurs. Nous pouvons suspendre le service pour maintenance. Conservez vos propres copies de vos enregistrements importants.</p>

      <h2 id="liability">12. Limitation de responsabilité</h2>
      <p>Dans la mesure permise par la loi, {legalName} n’est pas responsable des dommages indirects, accessoires, spéciaux, consécutifs ou punitifs, ni des pertes de bénéfices, de chiffre d’affaires ou de données. Notre responsabilité totale pour toute réclamation liée à {product} est limitée au montant que vous nous avez payé au cours des trois mois précédant le fait à l’origine de la réclamation. Certaines juridictions n’autorisent pas ces limitations, qui peuvent donc ne pas s’appliquer entièrement à vous.</p>
      <p>Vous acceptez de prendre en charge les frais raisonnables de {legalName} résultant de réclamations de tiers liées au contenu que vous importez ou à votre manquement aux présentes conditions.</p>

      <h2 id="termination">13. Clôture du compte</h2>
      <p>Vous pouvez fermer votre compte à tout moment en nous contactant. Nous pouvons suspendre ou fermer un compte qui enfreint les présentes conditions, qui met en danger le service ou d’autres utilisateurs, ou lorsque la loi l’exige. Si nous fermons un compte payant sans motif, nous vous rembourserons la partie non utilisée de votre abonnement. Les articles 6, 7, 11, 12 et 14 restent en vigueur après la clôture.</p>

      <h2 id="law">14. Droit applicable</h2>
      <p>Les présentes conditions sont régies par le droit des États-Unis et de l’État dans lequel {legalName} est constituée, sans égard aux règles de conflit de lois. Avant d’engager une action, contactez-nous afin que nous puissions tenter de résoudre le différend à l’amiable dans un délai de 30 jours. À défaut, les litiges sont portés devant les tribunaux compétents de cet État, sauf si le droit de la consommation de votre lieu de résidence vous permet d’agir localement.</p>

      <h2 id="changes">15. Modifications</h2>
      <p>Nous pouvons mettre à jour les présentes conditions. Nous modifierons la date indiquée en haut de la page et, en cas de changement important, nous vous en informerons par e-mail ou dans le studio avant son entrée en vigueur. Si vous continuez à utiliser {product} par la suite, vous acceptez les nouvelles conditions.</p>

      <h2 id="contact">16. Contact</h2>
      <p>Pour toute question sur ces conditions : <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
    </div>
  </SimplePage>;
}
