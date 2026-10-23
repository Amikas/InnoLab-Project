import type { SupportedLocale } from "./config";

/** Canonical + hreflang alternates for a locale-prefixed page. */
export function localizedAlternates(locale: SupportedLocale, path = "") {
  const suffix = path && path !== "/" ? path : "";
  return {
    canonical: `/${locale}${suffix}`,
    languages: {
      en: `/en${suffix}`,
      de: `/de${suffix}`,
    },
  };
}
