import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const body = Barlow({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-body", display: "swap" });
const display = Barlow_Condensed({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

// Shared-link previews need absolute image URLs. Vercel sets VERCEL_PROJECT_PRODUCTION_URL at build time;
// NEXT_PUBLIC_SITE_URL overrides it once the site has its own domain.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
const description = "Upload your beat and vocals, describe the sound in plain words, and get a mix you can refine until it's right.";

// The share image itself is app/opengraph-image.jpg (and twitter-image.jpg); Next adds its tags.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "FastMix - Mix and master your vocals in minutes",
    template: "%s | FastMix",
  },
  description,
  openGraph: {
    type: "website",
    siteName: "FastMix",
    title: "FastMix - Mix and master your vocals in minutes",
    description,
    url: "/",
    locale: "en_US",
    alternateLocale: ["fr_FR"],
  },
  twitter: { card: "summary_large_image", title: "FastMix - Mix and master your vocals in minutes", description },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} ${mono.variable}`}>
      <body><ClerkProvider>{children}</ClerkProvider></body>
    </html>
  );
}
