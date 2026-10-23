import type { Metadata } from "next"
import { Shield, Users, Target, Zap } from "lucide-react"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { resolveLocale } from "@/lib/i18n/config"
import { localizedAlternates } from "@/lib/i18n/metadata"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const dict = getDictionary(locale)
  return {
    title: dict.about.metaTitle,
    description: dict.about.metaDesc,
    alternates: localizedAlternates(locale, ""),
  }
}

export default async function AboutPage({
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
        <h1 className="text-4xl font-bold mb-6 text-center">{dict.about.title}</h1>

        <div className="bg-card p-8 rounded-lg border border-border mb-8">
          <p className="text-lg text-muted-foreground mb-6">{dict.about.intro1}</p>
          <p className="text-muted-foreground mb-6">{dict.about.intro2}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card p-6 rounded-lg border border-border">
            <Shield className="w-12 h-12 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">{dict.about.missionTitle}</h2>
            <p className="text-muted-foreground">{dict.about.missionDesc}</p>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border">
            <Users className="w-12 h-12 text-secondary mb-4" />
            <h2 className="text-xl font-semibold mb-2">{dict.about.communityTitle}</h2>
            <p className="text-muted-foreground">{dict.about.communityDesc}</p>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border">
            <Target className="w-12 h-12 text-accent mb-4" />
            <h2 className="text-xl font-semibold mb-2">{dict.about.skillsTitle}</h2>
            <p className="text-muted-foreground">{dict.about.skillsDesc}</p>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border">
            <Zap className="w-12 h-12 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">{dict.about.learningTitle}</h2>
            <p className="text-muted-foreground">{dict.about.learningDesc}</p>
          </div>
        </div>

        <div className="bg-card p-8 rounded-lg border border-border">
          <h2 className="text-2xl font-semibold mb-4">{dict.about.differentTitle}</h2>
          <ul className="space-y-3 text-muted-foreground">
            {[dict.about.point1, dict.about.point2, dict.about.point3, dict.about.point4, dict.about.point5].map(
              (point) => (
                <li key={point} className="flex items-start gap-3">
                  <span className="text-primary mt-1">•</span>
                  <span>{point}</span>
                </li>
              ),
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
