import { describe, it, expect } from "vitest";
import en from "@/lib/i18n/locales/en.json";
import de from "@/lib/i18n/locales/de.json";
import { pickLocalized, normalizeLocale, getLocalizedArray } from "@/lib/i18n/content";
import {
  localeFromPathname,
  localePath,
  resolveLocale,
} from "@/lib/i18n/config";

function flatten(value: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === "object") Object.assign(out, flatten(child, path));
    else out[path] = String(child);
  }
  return out;
}

const enKeys = flatten(en);
const deKeys = flatten(de);

describe("i18n dictionaries", () => {
  it("en and de expose exactly the same keys", () => {
    expect(Object.keys(deKeys).sort()).toEqual(Object.keys(enKeys).sort());
  });

  it("has no empty German values", () => {
    const empty = Object.entries(deKeys)
      .filter(([, value]) => value.trim() === "")
      .map(([key]) => key);
    expect(empty).toEqual([]);
  });

  it("nav/footer/home/cta/login keys are translated (not identical to English)", () => {
    expect(de.nav.home).not.toBe(en.nav.home);
    expect(de.home.title).not.toBe(en.home.title);
    expect(de.login.submit).not.toBe(en.login.submit);
  });

  it("uses formal Sie tone in German CTA/login", () => {
    expect(de.cta.loginFh).toMatch(/Sie/);
    expect(de.login.subtitle).toMatch(/Sie/);
  });
});

describe("locale helpers", () => {
  it("resolves de variants and falls back to en", () => {
    expect(resolveLocale("de-AT, de;q=0.9, en;q=0.8")).toBe("de");
    expect(resolveLocale("en-US")).toBe("en");
    expect(resolveLocale(null)).toBe("en");
    expect(resolveLocale("fr")).toBe("en");
  });

  it("reads the locale from the first path segment", () => {
    expect(localeFromPathname("/de/challenges")).toBe("de");
    expect(localeFromPathname("/en/courses/owasp")).toBe("en");
    expect(localeFromPathname("/challenges")).toBe("en");
    expect(localeFromPathname(null)).toBe("en");
  });

  it("prefixes and re-prefixes internal paths without touching external URLs", () => {
    expect(localePath("de", "/challenges")).toBe("/de/challenges");
    expect(localePath("en", "/de/challenges")).toBe("/en/challenges");
    expect(localePath("de", "/")).toBe("/de");
    expect(localePath("de", "/help#faq")).toBe("/de/help#faq");
    expect(localePath("de", "https://example.org")).toBe("https://example.org");
    expect(localePath("de", "mailto:test@example.org")).toBe("mailto:test@example.org");
  });

  it("picks German content with English fallback", () => {
    expect(pickLocalized("Hello", "Hallo", "de")).toBe("Hallo");
    expect(pickLocalized("Hello", "", "de")).toBe("Hello");
    expect(pickLocalized("Hello", null, "de")).toBe("Hello");
    expect(pickLocalized("Hello", "Hallo", "en")).toBe("Hello");
    expect(normalizeLocale("de-AT")).toBe("de");
    expect(normalizeLocale("en-US")).toBe("en");
    expect(getLocalizedArray(["a"], ["b"], "de")).toEqual(["b"]);
    expect(getLocalizedArray(["a"], [], "de")).toEqual(["a"]);
  });
});
