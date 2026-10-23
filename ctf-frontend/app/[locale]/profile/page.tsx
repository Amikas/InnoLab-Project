import Link from "@/components/localized-link"
import { Trophy, Award, Zap, Clock } from "lucide-react"
import { getUserProfile } from "@/lib/api/profile"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { resolveLocale } from "@/lib/i18n/config"

export const dynamic = 'force-dynamic'

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const profile = await getUserProfile()
  const { locale: rawLocale } = await params
  const locale = resolveLocale(rawLocale)
  const dict = getDictionary(locale)

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-xl font-bold text-primary-foreground">
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profile.username}</h1>
              <p className="text-muted-foreground text-sm">{profile.email}</p>
            </div>
          </div>
          <p className="text-muted-foreground text-sm">
            {dict.profile.memberSince} {profile.memberSince} • {dict.profile.rank}: {profile.rank}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-lg p-4">
            <Trophy className="w-5 h-5 text-primary mb-2" />
            <p className="text-muted-foreground text-xs mb-1">{dict.profile.points}</p>
            <p className="text-xl font-bold">{profile.totalPoints}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <Award className="w-5 h-5 text-primary mb-2" />
            <p className="text-muted-foreground text-xs mb-1">{dict.profile.solved}</p>
            <p className="text-xl font-bold">{profile.challengesSolved}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <Zap className="w-5 h-5 text-primary mb-2" />
            <p className="text-muted-foreground text-xs mb-1">{dict.profile.streak}</p>
            <p className="text-xl font-bold">{profile.streak}{dict.profile.days}</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-4">
            <Clock className="w-5 h-5 text-primary mb-2" />
            <p className="text-muted-foreground text-xs mb-1">{dict.profile.time}</p>
            <p className="text-xl font-bold">{profile.timeSpent}</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">{dict.profile.recent}</h2>
          <div className="space-y-2">
            {profile.recentSubmissions.map((sub, idx) => (
              <div key={idx} className="flex justify-between items-center p-3 bg-background rounded text-sm">
                <div>
                  <p className="font-medium">{sub.challenge}</p>
                  <p className="text-xs text-muted-foreground">{sub.category}</p>
                </div>
                <div className="text-right">
                  <span className={sub.solved ? "text-accent" : "text-destructive"}>{sub.solved ? "" : ""}</span>
                  <p className="text-xs text-muted-foreground">{sub.time}</p>
                </div>
              </div>
            ))}
          </div>
          <Link href="/challenges" className="text-primary text-sm mt-4 inline-block hover:underline">
            {dict.profile.viewAll} →
          </Link>
        </div>
      </div>
    </div>
  )
}
