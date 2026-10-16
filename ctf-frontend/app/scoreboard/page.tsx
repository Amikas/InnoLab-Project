import type { Metadata } from "next"
import { getLocale } from "@/lib/i18n/get-locale"
import { getDictionary } from "@/lib/i18n/dictionaries"
import Scoreboard from "@/components/scoreboard"

export const metadata: Metadata = {
  title: "Scoreboard | CTF Platform",
  description: "View the CTF competition leaderboard",
}

export default async function ScoreboardPage() {
  const locale = await getLocale()
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
