/** Site languages. Pages live under app/[lang]; proxy.ts rewrites each request to the visitor's language, so URLs stay the same. */
export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];
export const LOCALE_COOKIE = "fastmix-locale";

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "fr";
}

// Countries where French is an official or main language of public life (ISO 3166-1 alpha-2), including French overseas territories.
// Canada is left out: most Canadians prefer English, and French-speaking Canadians are caught by their browser language.
const FRENCH_COUNTRIES = new Set([
  "FR", "BE", "CH", "LU", "MC",
  "SN", "CI", "CM", "CD", "CG", "GA", "ML", "BF", "NE", "TD", "BJ", "TG", "GN", "MG", "RW", "BI", "DJ", "KM", "CF", "GQ", "SC", "MR",
  "MA", "DZ", "TN", "HT", "VU",
  "GP", "MQ", "GF", "RE", "YT", "PM", "BL", "MF", "NC", "PF", "WF",
]);

/** Language for a visitor who hasn't chosen one: French in French-speaking countries or when the browser's first language is French, else English. */
export function detectLocale(country: string | null, acceptLanguage: string | null): Locale {
  if (country && FRENCH_COUNTRIES.has(country.toUpperCase())) return "fr";
  const first = acceptLanguage?.split(",")[0]?.trim().toLowerCase() ?? "";
  return first === "fr" || first.startsWith("fr-") ? "fr" : "en";
}
