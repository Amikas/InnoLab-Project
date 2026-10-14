import en from "./locales/en.json";
import de from "./locales/de.json";
import type { SupportedLocale } from "./config";

const dictionaries = { en, de } as const;

export function getDictionary(locale: SupportedLocale) {
  return dictionaries[locale] ?? dictionaries.en;
}

export type Dictionary = typeof en;
