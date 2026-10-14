"use client";

import { useEffect, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { getI18nInstance } from "@/lib/i18n/config";

export default function I18nProvider({ children }: { children: ReactNode }) {
  const i18n = getI18nInstance();

  useEffect(() => {
    document.documentElement.lang = i18n.language?.split("-")[0] ?? "en";
    const onLangChanged = (lng: string) => {
      document.documentElement.lang = lng.split("-")[0];
    };
    i18n.on("languageChanged", onLangChanged);
    return () => {
      i18n.off("languageChanged", onLangChanged);
    };
  }, [i18n]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
