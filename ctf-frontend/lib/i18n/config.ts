"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import de from "./locales/de.json";

export const SUPPORTED_LOCALES = ["en", "de"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "en";

let initialized = false;

export function getI18nInstance() {
  if (!initialized) {
    initialized = true;
    void i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        resources: {
          en: { translation: en },
          de: { translation: de },
        },
        fallbackLng: DEFAULT_LOCALE,
        supportedLngs: [...SUPPORTED_LOCALES],
        // "Follow browser only": detect via navigator on every load,
        // do NOT persist the choice (empty caches).
        detection: {
          order: ["navigator", "htmlTag"],
          caches: [],
        },
        interpolation: { escapeValue: false },
        returnEmptyString: false,
      });
  }
  return i18n;
}

export function resolveLocale(input?: string | null): SupportedLocale {
  if (!input) return DEFAULT_LOCALE;
  const base = input.split(",")[0].split("-")[0].split("_")[0].toLowerCase().trim();
  return (SUPPORTED_LOCALES as readonly string[]).includes(base)
    ? (base as SupportedLocale)
    : DEFAULT_LOCALE;
}

export default i18n;
