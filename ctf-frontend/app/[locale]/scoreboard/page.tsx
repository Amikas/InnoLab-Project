import type { Metadata } from "next"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { resolveLocale } from "@/lib/i18n/config"
import { localizedAlternates } from "@/lib/i18n/metadata"
import Scoreboard from "@/components/scoreboard"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const dict = getDictionary(locale)
  return {
    title: dict.scoreboard.metaTitle,
    description: dict.scoreboard.description,
    alternates: localizedAlternates(locale, "/scoreboard"),
  }
}

export default async function ScoreboardPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = resolveLocale(rawLocale)
  const dict = getDictionary(locale)
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">{dict.scoreboard.title}</h1>
        <p className="text-muted-foreground mb-8">{dict.scoreboard.description}</p>
        <Scoreboard labels={dict.scoreboard} />
      </div>
    </div>
  )
}
