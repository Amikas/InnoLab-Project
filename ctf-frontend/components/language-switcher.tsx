"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Languages, Loader2 } from "lucide-react";
import { SUPPORTED_LOCALES } from "@/lib/i18n/config";
import { I18N_SWITCH_END, I18N_SWITCH_START } from "@/components/providers/i18n-provider";

// Matches the .i18n-transition duration in globals.css (220ms) + a small buffer.
const FADE_OUT_MS = 230;

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  const [pending, setPending] = useState<string | null>(null);
  const current = (i18n.language ?? "en").split("-")[0];

  const switchTo = async (lng: string) => {
    if (lng === current || pending) return;
    // Session-only switch (no persistence per "follow browser only" decision).
    setPending(lng);
    window.dispatchEvent(new CustomEvent(I18N_SWITCH_START));
    try {
      // Let the fade-out play before swapping the strings.
      await new Promise((resolve) => setTimeout(resolve, FADE_OUT_MS));
      await i18n.changeLanguage(lng);
      // Let the new strings paint while still faded out, then fade back in.
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    } finally {
      window.dispatchEvent(new CustomEvent(I18N_SWITCH_END));
      setPending(null);
    }
  };

  return (
    <div
      className="flex items-center gap-1 rounded-lg border border-border p-1"
      role="group"
      aria-label={t("nav.language")}
      aria-busy={pending !== null}
      title={t("nav.language")}
    >
      <Languages className="ml-1 h-4 w-4 text-muted-foreground" aria-hidden />
      {SUPPORTED_LOCALES.map((lng) => {
        const isActive = current === lng;
        const isPending = pending === lng;
        return (
          <button
            key={lng}
            type="button"
            onClick={() => void switchTo(lng)}
            disabled={pending !== null}
            aria-pressed={isActive}
            className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold uppercase transition-all duration-200 disabled:cursor-wait disabled:opacity-60 ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isPending && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
            {compact ? lng.toUpperCase() : lng.toUpperCase()}
          </button>
        );
      })}
    </div>
  );
}
