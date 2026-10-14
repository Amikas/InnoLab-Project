"use client";

import { useEffect, useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { getI18nInstance } from "@/lib/i18n/config";

export const I18N_SWITCH_START = "i18n:switch-start";
export const I18N_SWITCH_END = "i18n:switch-end";

export default function I18nProvider({ children }: { children: ReactNode }) {
  const i18n = getI18nInstance();
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    document.documentElement.lang = i18n.language?.split("-")[0] ?? "en";
    const onLangChanged = (lng: string) => {
      document.documentElement.lang = lng.split("-")[0];
    };
    const onSwitchStart = () => setSwitching(true);
    const onSwitchEnd = () => setSwitching(false);
    i18n.on("languageChanged", onLangChanged);
    window.addEventListener(I18N_SWITCH_START, onSwitchStart);
    window.addEventListener(I18N_SWITCH_END, onSwitchEnd);
    return () => {
      i18n.off("languageChanged", onLangChanged);
      window.removeEventListener(I18N_SWITCH_START, onSwitchStart);
      window.removeEventListener(I18N_SWITCH_END, onSwitchEnd);
    };
  }, [i18n]);

  return (
    <I18nextProvider i18n={i18n}>
      <div
        className={`i18n-transition ${switching ? "i18n-switching" : ""}`}
        aria-busy={switching}
      >
        {children}
      </div>
    </I18nextProvider>
  );
}
