import type { Metadata } from "next";
import Link from "next/link";
import { SimplePage } from "@/components/site-chrome";
import { company } from "@/lib/company";
import { getLocale } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "fr" ? "Politique de confidentialité" : "Privacy policy" };
}

const providers = [
  ["Clerk", "Sign-in, passwords and email verification", "Account details, sign-in method, IP address and device information"],
  ["RoEx", "AI mixing and mastering", "The audio files and settings for the mix or master you request"],
  ["Paddle", "Payments, invoices and sales tax, as our reseller and Merchant of Record", "Billing details and card information, which we never see"],
  ["Hosting and storage providers", "Running the website, database and private file storage", "All data described on this page"],
];

export default async function PrivacyPage() {
  const locale = await getLocale();
  return locale === "fr" ? <PrivacyFr /> : <PrivacyEn />;
}

function PrivacyEn() {
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
        <li><b>Billing:</b> your plan, invoices and payment status. Card numbers go directly to Paddle.</li>
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

const providersFr = [
  ["Clerk", "Connexion, mots de passe et vérification de l’adresse e-mail", "Données de compte, mode de connexion, adresse IP et informations sur l’appareil"],
  ["RoEx", "Mixage et mastering par IA", "Les fichiers audio et les réglages du mix ou du master que vous demandez"],
  ["Paddle", "Paiements, factures et taxes, en tant que revendeur et vendeur officiel (Merchant of Record)", "Coordonnées de facturation et informations de carte bancaire, que nous ne voyons jamais"],
  ["Prestataires d’hébergement et de stockage", "Fonctionnement du site, de la base de données et du stockage privé des fichiers", "Toutes les données décrites sur cette page"],
];

function PrivacyFr() {
  const { legalName, product, privacyEmail, legalUpdatedFr } = company;
  return <SimplePage label="Juridique" title="Politique de confidentialité" intro={`Dernière mise à jour : ${legalUpdatedFr}. Cette politique explique quelles données ${legalName} collecte lorsque vous utilisez ${product}, pourquoi, et quels choix s’offrent à vous. Nous ne vendons pas vos informations personnelles.`}>
    <div className="prose legal">
      <h2>1. Ce que nous collectons</h2>
      <ul>
        <li><b>Données de compte :</b> votre adresse e-mail, votre nom (facultatif) et votre mode de connexion. Les mots de passe sont gérés par Clerk et nous ne les conservons jamais sous une forme lisible.</li>
        <li><b>Votre audio :</b> les fichiers que vous importez ainsi que les mix, masters et aperçus créés à partir de ceux-ci, avec leurs noms, tailles et durées.</li>
        <li><b>Vos indications :</b> les descriptions de son et les notes que vous rédigez pour affiner un résultat, ainsi que les réglages choisis à partir de celles-ci.</li>
        <li><b>Utilisation :</b> les sessions, les versions, l’état des traitements et les erreurs, ainsi que le nombre de titres utilisés dans le cadre de votre forfait.</li>
        <li><b>Appareil et réseau :</b> l’adresse IP, le type de navigateur et les cookies décrits dans notre <Link href="/cookies">Politique relative aux cookies</Link>.</li>
        <li><b>Facturation :</b> votre forfait, vos factures et l’état de vos paiements. Les numéros de carte sont transmis directement à Paddle.</li>
        <li><b>Assistance :</b> les messages que vous nous envoyez.</li>
      </ul>
      <p>Nous ne collectons pas de données sensibles, comme des pièces d’identité officielles, et nous n’utilisons pas de traceurs publicitaires.</p>

      <h2>2. Comment nous les utilisons</h2>
      <ul>
        <li>pour fournir {product} : traiter votre audio, enregistrer vos sessions et vos versions, et mettre vos fichiers à disposition au téléchargement ;</li>
        <li>pour gérer votre compte, votre forfait et vos paiements ;</li>
        <li>pour assurer la sécurité du service et empêcher les abus des aperçus gratuits et des limites des forfaits ;</li>
        <li>pour répondre aux demandes d’assistance et envoyer des e-mails liés au service, comme les reçus et les changements importants ;</li>
        <li>pour envoyer des nouveautés sur le produit, uniquement si vous l’acceptez ; vous pouvez vous désinscrire à tout moment ;</li>
        <li>pour respecter nos obligations légales, fiscales et comptables.</li>
      </ul>
      <p><b>Nous n’utilisons pas votre audio pour entraîner des modèles d’IA</b>, et nous ne le partageons jamais à des fins de marketing.</p>

      <h2>3. Avec qui nous les partageons</h2>
      <p>Nous partageons des données uniquement avec les prestataires qui nous aident à faire fonctionner {product}, dans le cadre de contrats qui limitent leur utilisation à la fourniture de leur service pour notre compte :</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Prestataires avec lesquels nous partageons des données"><table className="legal-table">
        <thead><tr><th>Prestataire</th><th>Finalité</th><th>Données</th></tr></thead>
        <tbody>{providersFr.map(([name, purpose, data]) => <tr key={name}><td>{name}</td><td>{purpose}</td><td>{data}</td></tr>)}</tbody>
      </table></div>
      <p>RoEx est établie au Royaume-Uni et traite les fichiers qu’elle reçoit selon ses propres conditions. Nous pouvons également communiquer des informations lorsque la loi l’exige, pour protéger nos utilisateurs ou le service, ou dans le cadre d’une fusion ou d’une cession de l’entreprise, auquel cas la présente politique continue de s’appliquer.</p>

      <h2>4. Combien de temps nous les conservons</h2>
      <ul>
        <li><b>Audio et sessions :</b> jusqu’à ce que vous les supprimiez de votre bibliothèque ou que vous fermiez votre compte. La suppression d’une session efface ses fichiers de notre stockage.</li>
        <li><b>Données de compte :</b> tant que votre compte est ouvert, puis supprimées ou anonymisées dans les 30 jours suivant sa fermeture.</li>
        <li><b>Messages d’assistance :</b> jusqu’à 2 ans.</li>
        <li><b>Données de facturation :</b> jusqu’à 7 ans, comme l’exige la législation fiscale.</li>
        <li><b>Sauvegardes :</b> les données supprimées disparaissent de nos sauvegardes dans un délai de 90 jours.</li>
      </ul>

      <h2>5. Sécurité</h2>
      <p>Les données sont chiffrées en transit grâce au protocole HTTPS. L’audio est conservé dans un stockage privé et n’est accessible que par des liens qui expirent au bout de 15 minutes et qui sont délivrés uniquement à votre compte. L’accès aux systèmes de production est restreint. Aucun système n’est parfaitement sûr : nous vous invitons donc à utiliser un mot de passe robuste et à conserver des copies de vos enregistrements importants.</p>

      <h2>6. Vos choix et vos droits</h2>
      <p>Vous pouvez modifier votre profil dans les Paramètres et supprimer des sessions et de l’audio de votre bibliothèque à tout moment. Vous pouvez également nous demander d’accéder à vos informations personnelles, de les rectifier, de les exporter ou de les supprimer en écrivant à <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>. Nous répondons dans un délai de 30 jours et pouvons avoir besoin de vérifier votre identité au préalable.</p>
      <p>Selon votre lieu de résidence, notamment en Californie et dans d’autres États américains, au Royaume-Uni ou dans l’Union européenne, vous pouvez disposer de droits supplémentaires, comme celui de vous opposer à certains traitements ou d’en demander la limitation, ou de contester une décision relative à votre demande. Nous ne vendons ni ne partageons d’informations personnelles à des fins de publicité comportementale inter-contextuelle, et nous ne vous traitons pas différemment parce que vous exercez vos droits.</p>

      <h2>7. Enfants</h2>
      <p>{product} ne s’adresse pas aux enfants de moins de 13 ans, et nous ne collectons pas sciemment leurs informations. Les utilisateurs âgés de 13 à 17 ans doivent obtenir l’autorisation d’un parent ou d’un tuteur légal. Si vous pensez qu’un enfant de moins de 13 ans nous a communiqué des informations, contactez-nous et nous les supprimerons.</p>

      <h2>8. Traitement international</h2>
      <p>{legalName} est établie aux États-Unis. Nos prestataires peuvent traiter des données aux États-Unis, au Royaume-Uni et dans d’autres pays. Lorsque des données sont transférées d’un pays à un autre, nous nous appuyons sur les garanties contractuelles et de sécurité de nos prestataires.</p>

      <h2>9. Modifications</h2>
      <p>Nous mettrons à jour cette politique lorsque nos pratiques évolueront et indiquerons la nouvelle date en haut de la page. En cas de changement important, nous vous en informerons par e-mail ou dans le studio.</p>

      <h2>10. Contact</h2>
      <p>{legalName}, exploitant de {product} : <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>.</p>
    </div>
  </SimplePage>;
}
