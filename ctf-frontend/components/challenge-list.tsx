"use client"

import { useState } from "react"
import Link from "@/components/localized-link"
import { Search } from "lucide-react"
import type { Challenge } from "@/lib/types"
import { useTranslation } from "react-i18next"
import { getLocalizedChallenge } from "@/lib/i18n/content"

interface ChallengeListProps {
  challenges: Challenge[]
}

export default function ChallengeList({ challenges }: ChallengeListProps) {
  const { t, i18n } = useTranslation()
  const locale = (i18n.language ?? "en").split("-")[0] as "en" | "de"
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all")

  const categories = [
    "all",
    "binary-exploitation",
    "cryptography",
    "forensics",
    "reverse-engineering",
    "web-exploitation",
  ]
  const difficulties = ["all", "easy", "medium", "hard"]

  const filteredChallenges = challenges.filter((challenge) => {
    const localized = getLocalizedChallenge(challenge, locale)
    const matchesSearch =
      localized.displayTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      localized.displayDescription.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === "all" || challenge.category === selectedCategory
    const matchesDifficulty = selectedDifficulty === "all" || challenge.difficulty === selectedDifficulty

    return matchesSearch && matchesCategory && matchesDifficulty
  })

  return (
    <div>
      {/* Filters */}
      <div className="bg-card p-6 rounded-lg border border-border mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t("challenges.search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "all"
                  ? t("challenges.allCategories")
                  : cat
                      .split("-")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}
              </option>
            ))}
          </select>

          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {difficulties.map((diff) => (
              <option key={diff} value={diff}>
                {diff === "all" ? t("challenges.allDifficulties") : diff.charAt(0).toUpperCase() + diff.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Challenge Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredChallenges.map((challenge) => (
          <ChallengeCard key={challenge.id} challenge={challenge} locale={locale} />
        ))}
      </div>

      {filteredChallenges.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">{t("challenges.noFound")}</p>
        </div>
      )}
    </div>
  )
}

function ChallengeCard({ challenge, locale }: { challenge: Challenge; locale: "en" | "de" }) {
  const { t } = useTranslation()
  const localized = getLocalizedChallenge(challenge, locale)
  const difficultyColors = {
    easy: "text-green-500",
    medium: "text-yellow-500",
    hard: "text-red-500",
  }

  return (
    <Link href={`/challenges/${challenge.id}`}>
      <div className="bg-card p-6 rounded-lg border border-border hover:border-primary transition-all hover:scale-105 h-full">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-xl font-semibold">{localized.displayTitle}</h3>
          <span className={`text-sm font-semibold ${difficultyColors[challenge.difficulty]}`}>
            {challenge.difficulty.toUpperCase()}
          </span>
        </div>

        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">{localized.displayDescription}</p>

        <div className="flex justify-between items-center">
          <span className="text-xs px-3 py-1 bg-primary/10 text-primary rounded-full">
            {challenge.category
              .split("-")
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(" ")}
          </span>
          <span className="text-sm font-semibold text-accent">{challenge.points} {t("challenges.pts")}</span>
        </div>

        {challenge.solved && (
          <div className="mt-4 pt-4 border-t border-border">
            <span className="text-xs text-accent font-semibold"> {t("challenges.solved")}</span>
          </div>
        )}
      </div>
    </Link>
  )
}
