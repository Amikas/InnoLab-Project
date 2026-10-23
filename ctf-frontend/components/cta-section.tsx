"use client"

import Link from "@/components/localized-link"
import { useAuth } from "@/lib/hooks/use-auth"
import { useTranslation } from "react-i18next"

export function CtaSection() {
  const { auth } = useAuth()
  const { t } = useTranslation()

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-6">{t("cta.title")}</h2>
        <p className="text-xl text-muted-foreground mb-8">
          {t("cta.subtitle")}
        </p>
        {auth.isAuthenticated ? (
          <Link
            href="/challenges"
            className="inline-block px-8 py-4 bg-accent text-accent-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            {t("cta.goChallenges")}
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-block px-8 py-4 bg-accent text-accent-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            {t("cta.loginFh")}
          </Link>
        )}
      </div>
    </section>
  )
}
