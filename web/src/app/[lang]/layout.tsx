import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import { LocaleProvider } from "@/components/locale-provider";
import { locales } from "@/lib/locale";
import { getLocale } from "@/lib/locale-server";
import "../globals.css";

const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body", display: "swap" });
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

// Shared-link previews need absolute image URLs. Vercel sets VERCEL_PROJECT_PRODUCTION_URL at build time;
// NEXT_PUBLIC_SITE_URL overrides it once the site has its own domain.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");

const meta = {
  en: {
    title: "FastMix - Mix and master your vocals in minutes",
    description: "Upload your beat and vocals, describe the sound in plain words, and get a mix you can refine until it's right.",
    locale: "en_US", alternate: "fr_FR",
  },
  fr: {
    title: "FastMix - Mixez et masterisez vos voix en quelques minutes",
    description: "Importez votre beat et vos voix, décrivez le son avec vos mots, et obtenez un mix que vous pouvez affiner jusqu'à ce qu'il soit parfait.",
    locale: "fr_FR", alternate: "en_US",
  },
};

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

// The share image itself is opengraph-image.jpg (and twitter-image.jpg) in this folder; Next adds its tags.
export async function generateMetadata(): Promise<Metadata> {
  const m = meta[await getLocale()];
  return {
    metadataBase: new URL(siteUrl),
    title: { default: m.title, template: "%s | FastMix" },
    description: m.description,
    openGraph: { type: "website", siteName: "FastMix", title: m.title, description: m.description, url: "/", locale: m.locale, alternateLocale: [m.alternate] },
    twitter: { card: "summary_large_image", title: m.title, description: m.description },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${body.variable} ${display.variable} ${mono.variable}`}>
      <body>
        <ClerkProvider localization={locale === "fr" ? frFR : undefined}>
          <LocaleProvider locale={locale}>{children}</LocaleProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
