"use client";

import { createContext, ReactNode, useContext, useSyncExternalStore } from "react";
import { COUNTRY_COOKIE, Locale, LOCALE_COOKIE } from "@/lib/locale";

const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

/** The page's language in Client Components. Server Components use getLocale() from "@/lib/locale-server". */
export function useLocale(): Locale {
  return useContext(LocaleContext);
}

const noSubscription = () => () => {};
function readCountry() {
  const match = document.cookie.match(new RegExp(`(?:^|; )${COUNTRY_COOKIE}=([A-Z]{2})`));
  return match ? match[1] : null;
}

/** The visitor's country (two letters) from the cookie proxy.ts sets; null before hydration and when unknown. */
export function useCountry(): string | null {
  return useSyncExternalStore(noSubscription, readCountry, () => null);
}

/** Save the visitor's choice and reload, so every page (and the router's cache) switches language. */
export function switchLocale(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}
