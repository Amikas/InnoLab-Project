"use client";

import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { localeFromPathname, localePath, type SupportedLocale } from "./config";

/** Active locale, derived from the first URL segment. */
export function useLocale(): SupportedLocale {
  return localeFromPathname(usePathname());
}

/** Returns a function that prefixes internal paths with the active locale. */
export function useLocalePath(): (href: string) => string {
  const locale = useLocale();
  return useCallback((href: string) => localePath(locale, href), [locale]);
}
