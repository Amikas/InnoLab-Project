import { createInstance, type i18n as I18nInstance } from "i18next";
import en from "./locales/en.json";
import de from "./locales/de.json";

export const SUPPORTED_LOCALES = ["en", "de"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "en";

/** Cookie used to remember the last explicit locale choice. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

const instances = new Map<SupportedLocale, I18nInstance>();

/**
 * One read-only i18next instance per locale.
 *
 * The locale comes from the URL, never from the browser, so the server and the
 * client render the same language and the instance is safe to reuse.
 */
export function getI18nInstance(locale: SupportedLocale): I18nInstance {
  const existing = instances.get(locale);
  if (existing) return existing;

  const instance = createInstance();
  void instance.init({
    resources: {
      en: { translation: en },
      de: { translation: de },
    },
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...SUPPORTED_LOCALES],
    interpolation: { escapeValue: false },
    returnEmptyString: false,
    initAsync: false,
    react: { useSuspense: false },
  });
  instances.set(locale, instance);
  return instance;
}

export function isSupportedLocale(input?: string | null): input is SupportedLocale {
  return !!input && (SUPPORTED_LOCALES as readonly string[]).includes(input);
}

export function resolveLocale(input?: string | null): SupportedLocale {
  if (!input) return DEFAULT_LOCALE;
  const base = input.split(",")[0].split("-")[0].split("_")[0].toLowerCase().trim();
  return isSupportedLocale(base) ? base : DEFAULT_LOCALE;
}

/** Read the locale segment from a pathname such as /de/challenges. */
export function localeFromPathname(pathname?: string | null): SupportedLocale {
  const segment = (pathname ?? "").split("/")[1];
  return isSupportedLocale(segment) ? segment : DEFAULT_LOCALE;
}

/**
 * Prefix an internal href with the active locale. External URLs, hashes and
 * mailto/tel links are returned unchanged. Already-prefixed paths are
 * re-prefixed so a switcher can reuse the current path.
 */
export function localePath(locale: SupportedLocale, href: string): string {
  if (!href.startsWith("/")) return href;
  if (href.startsWith("//")) return href;

  // Keep query strings and hashes out of the path normalisation.
  const match = href.match(/^([^?#]*)([?#].*)?$/);
  let pathname = match?.[1] ?? href;
  const suffix = match?.[2] ?? "";

  const segments = pathname.split("/");
  if (isSupportedLocale(segments[1])) {
    segments[1] = locale;
    pathname = segments.join("/");
  } else {
    pathname = pathname === "/" ? "" : pathname;
    pathname = `/${locale}${pathname}`;
  }

  return `${pathname}${suffix}`;
}

export default getI18nInstance;
