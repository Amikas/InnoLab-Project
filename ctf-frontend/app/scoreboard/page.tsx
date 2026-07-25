import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Scoreboard | CTF Platform",
  description: "View the CTF competition leaderboard",
}

export default function ScoreboardPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold mb-4">Scoreboard</h1>
        <p className="text-xl text-muted-foreground">Coming soon</p>
      </div>
    </div>
  )
}
