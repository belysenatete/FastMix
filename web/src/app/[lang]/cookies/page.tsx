import type { Metadata } from "next";
import Link from "next/link";
import { SimplePage } from "@/components/site-chrome";
import { company } from "@/lib/company";
import { getLocale } from "@/lib/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return { title: locale === "fr" ? "Politique relative aux cookies" : "Cookie policy" };
}

const cookies = [
  ["__session, __client_uat and related Clerk cookies", "Keep you signed in and protect your account", "Cookie, set by Clerk", "Session or up to 1 year"],
  ["fastmix.profile.*", "Remember your display name, language and email preference", "Browser storage", "Until you clear it"],
  ["fastmix.projects.v1, fastmix.active-project.v1", "Keep a copy of your session list and reopen the session you last worked on", "Browser storage", "Until you clear it"],
];

export default async function CookiesPage() {
  const locale = await getLocale();
  return locale === "fr" ? <CookiesFr /> : <CookiesEn />;
}

function CookiesEn() {
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

const cookiesFr = [
  ["__session, __client_uat et cookies Clerk associés", "Vous garder connecté et protéger votre compte", "Cookie, déposé par Clerk", "Durée de la session ou jusqu’à 1 an"],
  ["fastmix.profile.*", "Mémoriser votre nom d’affichage, votre langue et votre préférence d’e-mails", "Stockage du navigateur", "Jusqu’à ce que vous l’effaciez"],
  ["fastmix.projects.v1, fastmix.active-project.v1", "Conserver une copie de votre liste de sessions et rouvrir la dernière session sur laquelle vous avez travaillé", "Stockage du navigateur", "Jusqu’à ce que vous l’effaciez"],
];

function CookiesFr() {
  const { product, privacyEmail, legalUpdatedFr } = company;
  return <SimplePage label="Juridique" title="Politique relative aux cookies" intro={`Dernière mise à jour : ${legalUpdatedFr}. ${product} utilise uniquement les cookies et le stockage du navigateur nécessaires au fonctionnement du service. Nous n’utilisons pas de cookies d’analyse d’audience ni de cookies publicitaires.`}>
    <div className="prose legal">
      <h2>Ce que nous utilisons</h2>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Cookies et stockage du navigateur que nous utilisons"><table className="legal-table">
        <thead><tr><th>Nom</th><th>Finalité</th><th>Type</th><th>Durée de conservation</th></tr></thead>
        <tbody>{cookiesFr.map(([name, purpose, type, duration]) => <tr key={name}><td>{name}</td><td>{purpose}</td><td>{type}</td><td>{duration}</td></tr>)}</tbody>
      </table></div>

      <h2>Vos choix</h2>
      <p>Ces cookies étant nécessaires pour vous connecter et utiliser le studio, nous ne demandons pas votre consentement avant de les déposer. Vous pouvez bloquer ou supprimer les cookies dans les paramètres de votre navigateur, mais vous ne pourrez alors plus vous connecter. Effacer le stockage de votre navigateur réinitialise vos préférences enregistrées.</p>

      <h2>Modifications</h2>
      <p>Si nous ajoutons un jour des cookies d’analyse d’audience ou d’autres cookies facultatifs, nous mettrons à jour cette page et demanderons votre consentement avant de les déposer, lorsque la loi l’exige.</p>
      <p>Questions : <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>. Consultez également notre <Link href="/privacy">Politique de confidentialité</Link>.</p>
    </div>
  </SimplePage>;
}
