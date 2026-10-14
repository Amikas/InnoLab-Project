import type { Metadata } from "next"
import { getLocale } from "@/lib/i18n/get-locale"
import { getDictionary } from "@/lib/i18n/dictionaries"

export const metadata: Metadata = {
  title: "Scoreboard | CTF Platform",
  description: "View the CTF competition leaderboard",
}

export default async function ScoreboardPage() {
  const locale = await getLocale()
  const dict = getDictionary(locale)
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">{dict.scoreboard.title}</h1>
        <p className="text-xl text-muted-foreground">{dict.scoreboard.comingSoon}</p>
      </div>
    </div>
  )
}
