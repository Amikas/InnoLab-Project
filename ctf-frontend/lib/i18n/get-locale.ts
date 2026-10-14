import { headers } from "next/headers";
import { resolveLocale, DEFAULT_LOCALE, type SupportedLocale } from "./config";

/** Server-side: resolve locale from Accept-Language (browser only, no cookie). */
export async function getLocale(): Promise<SupportedLocale> {
  try {
    const h = await headers();
    return resolveLocale(h.get("accept-language"));
  } catch {
    return DEFAULT_LOCALE;
  }
}
