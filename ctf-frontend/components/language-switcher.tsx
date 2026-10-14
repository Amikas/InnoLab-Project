"use client";

import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { SUPPORTED_LOCALES } from "@/lib/i18n/config";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  const current = (i18n.language ?? "en").split("-")[0];

  const switchTo = (lng: string) => {
    // Session-only switch (no persistence per "follow browser only" decision).
    void i18n.changeLanguage(lng);
  };

  return (
    <div
      className="flex items-center gap-1 rounded-lg border border-border p-1"
      role="group"
      aria-label={t("nav.language")}
      title={t("nav.language")}
    >
      <Languages className="ml-1 h-4 w-4 text-muted-foreground" aria-hidden />
      {SUPPORTED_LOCALES.map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => switchTo(lng)}
          aria-pressed={current === lng}
          className={`cursor-pointer rounded-md px-2 py-1 text-xs font-semibold uppercase transition-colors ${
            current === lng
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {compact ? lng.toUpperCase() : lng.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
