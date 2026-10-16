"use client"

import { useEffect, useState } from "react"
import { getTopSolvers, type LeaderboardEntry } from "@/lib/api/solves"
import type { ApiResult } from "@/lib/types"
import type { Dictionary } from "@/lib/i18n/dictionaries"

export default function Scoreboard({ labels }: { labels: Dictionary["scoreboard"] }) {
  const [result, setResult] = useState<ApiResult<LeaderboardEntry[]> | null>(null)

  useEffect(() => {
    let active = true
    getTopSolvers(100).then(response => {
      if (active) setResult(response)
    })
    return () => { active = false }
  }, [])

  if (!result) return <p role="status" className="text-muted-foreground">{labels.loading}</p>
  if (!result.success) return <p role="alert" className="text-destructive">{labels.error}</p>

  const entries = result.data ?? []
  if (entries.length === 0) return <p role="status" className="text-muted-foreground">{labels.empty}</p>

  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card">
      <table aria-label={labels.title} className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr className="border-b border-border">
            <th scope="col" className="px-6 py-4 text-left font-medium">{labels.rank}</th>
            <th scope="col" className="px-6 py-4 text-left font-medium">{labels.username}</th>
            <th scope="col" className="px-6 py-4 text-right font-medium">{labels.solved}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={entry.username} className="border-b border-border last:border-0">
              <td className="px-6 py-4 text-muted-foreground">{index + 1}</td>
              <th scope="row" className="px-6 py-4 text-left font-medium">{entry.username}</th>
              <td className="px-6 py-4 text-right tabular-nums">{entry.solveCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
