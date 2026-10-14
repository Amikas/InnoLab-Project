import { describe, it, expect } from "vitest";
import en from "@/lib/i18n/locales/en.json";
import de from "@/lib/i18n/locales/de.json";
import { pickLocalized, normalizeLocale, getLocalizedArray } from "@/lib/i18n/content";
import { resolveLocale } from "@/lib/i18n/config";

describe("i18n dictionaries", () => {
  it("en and de have the same top-level namespaces", () => {
    expect(Object.keys(de).sort()).toEqual(Object.keys(en).sort());
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
