import type { Challenge } from "@/lib/types";

export type ContentLocale = "en" | "de";

export function normalizeLocale(lng?: string | null): ContentLocale {
  return lng?.toLowerCase().startsWith("de") ? "de" : "en";
}

/** Pick the German variant when locale is de and a non-empty DE value exists, else English. */
export function pickLocalized(en?: string | null, de?: string | null, locale: ContentLocale = "en"): string {
  if (locale === "de" && de && de.trim().length > 0) return de;
  return en ?? "";
}

export interface LocalizedChallenge extends Challenge {
  displayTitle: string;
  displayDescription: string;
}

export function getLocalizedChallenge(c: Challenge, locale: ContentLocale): LocalizedChallenge {
  return {
    ...c,
    displayTitle: pickLocalized(c.title, (c as Challenge & { titleDe?: string }).titleDe, locale),
    displayDescription: pickLocalized(
      c.description,
      (c as Challenge & { descriptionDe?: string }).descriptionDe,
      locale,
    ),
  };
}

export function getLocalizedArray(
  en?: string[] | null,
  de?: string[] | null,
  locale: ContentLocale = "en",
): string[] {
  if (locale === "de" && de && de.length > 0) return de;
  return en ?? [];
}
