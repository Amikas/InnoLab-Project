"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  LOCALE_COOKIE,
  SUPPORTED_LOCALES,
  localeFromPathname,
  localePath,
} from "@/lib/i18n/config";

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const current = localeFromPathname(pathname);

  const hrefFor = (lng: string) => localePath(lng as "en" | "de", pathname);

  const remember = (lng: string) => {
    document.cookie = `${LOCALE_COOKIE}=${lng}; path=/; max-age=31536000; samesite=lax`;
  };

  return (
    <div
      className="flex items-center gap-1 rounded-lg border border-border p-1"
      role="group"
      aria-label={t("nav.language")}
      title={t("nav.language")}
    >
      <Languages className="ml-1 h-4 w-4 text-muted-foreground" aria-hidden />
      {SUPPORTED_LOCALES.map((lng) => {
        const isActive = current === lng;
        return (
          <Link
            key={lng}
            href={hrefFor(lng)}
            hrefLang={lng}
            onClick={() => remember(lng)}
            aria-current={isActive ? "true" : undefined}
            className={`flex cursor-pointer items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold uppercase transition-all duration-200 ${
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {compact ? lng.toUpperCase() : lng.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}
