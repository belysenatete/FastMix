import { lang } from "next/root-params";
import { isLocale, Locale } from "@/lib/locale";

/** The page's language in Server Components (the [lang] root segment). Client Components use useLocale(). */
export async function getLocale(): Promise<Locale> {
  const value = await lang();
  return isLocale(value) ? value : "en";
}
