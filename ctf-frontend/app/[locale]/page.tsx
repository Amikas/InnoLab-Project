import { CtaSection } from "@/components/cta-section"
import type React from "react"
import type { Metadata } from "next"
import Link from "@/components/localized-link"
import { Shield, Target, Trophy, Users } from "lucide-react"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { resolveLocale } from "@/lib/i18n/config"
import { localizedAlternates } from "@/lib/i18n/metadata"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const dict = getDictionary(locale)
  return {
    title: dict.home.title,
    description: dict.home.subtitle,
    alternates: localizedAlternates(locale, ""),
  }
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const dict = getDictionary(resolveLocale(locale))
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto text-center">
<h1 className="text-5xl md:text-7xl font-bold mb-6 text-primary leading-tight">
  {dict.home.title}
</h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            {dict.home.subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/challenges"
              className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              {dict.home.startChallenges}
            </Link>
            <Link
              href="/courses"
              className="px-8 py-4 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              {dict.home.browseCourses}
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">{dict.home.whyUs}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Shield className="w-12 h-12 text-primary" />}
              title={dict.home.realWorldTitle}
              description={dict.home.realWorldDesc}
            />
            <FeatureCard
              icon={<Target className="w-12 h-12 text-primary" />}
              title={dict.home.categoriesTitle}
              description={dict.home.categoriesDesc}
            />
            <FeatureCard
              icon={<Trophy className="w-12 h-12 text-primary" />}
              title={dict.home.scoringTitle}
              description={dict.home.scoringDesc}
            />
            <FeatureCard
              icon={<Users className="w-12 h-12 text-primary" />}
              title={dict.home.communityTitle}
              description={dict.home.communityDesc}
            />
          </div>
        </div>
      </section>

      <CtaSection />
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 bg-card rounded-lg border border-border hover:border-primary transition-colors">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

