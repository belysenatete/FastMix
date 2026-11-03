import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { detectLocale, isLocale, LOCALE_COOKIE } from "@/lib/locale";

const UNLOCALIZED = /^\/(api|trpc|__clerk)(\/|$)/;
const LOCALIZED = /^\/(en|fr)(\/|$)/;

// Pages live under app/[lang]. Each request is rewritten to the visitor's language (their saved choice, else their
// country or browser language), so the address bar keeps plain URLs like /pricing.
export default clerkMiddleware((_auth, request) => {
  const { pathname } = request.nextUrl;
  if (UNLOCALIZED.test(pathname) || LOCALIZED.test(pathname)) return;
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : detectLocale(request.headers.get("x-vercel-ip-country"), request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.rewrite(url);
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|mp3|txt)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
