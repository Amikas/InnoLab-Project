import type React from "react"
import Link from "next/link"
import { Shield, Target, Trophy, Users } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-background">
        <div className="max-w-7xl mx-auto text-center">
<h1 className="text-5xl md:text-7xl font-bold mb-6 text-primary leading-tight">
  CTF Training Platform
</h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Master cybersecurity skills through hands-on Capture The Flag challenges
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/challenges"
              className="px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Start Challenges
            </Link>
            <Link
              href="/courses"
              className="px-8 py-4 bg-secondary text-secondary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              Browse Courses
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Why Train With Us?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<Shield className="w-12 h-12 text-primary" />}
              title="Real-World Skills"
              description="Practice with challenges based on actual security scenarios"
            />
            <FeatureCard
              icon={<Target className="w-12 h-12 text-primary" />}
              title="Multiple Categories"
              description="Binary exploitation, cryptography, forensics, and more"
            />
            <FeatureCard
              icon={<Trophy className="w-12 h-12 text-primary" />}
              title="Competitive Scoring"
              description="Track your progress and compete on the leaderboard"
            />
            <FeatureCard
              icon={<Users className="w-12 h-12 text-primary" />}
              title="Community Driven"
              description="Learn from others and share your knowledge"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Start Your Journey?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of security enthusiasts learning and competing
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-4 bg-accent text-accent-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Login with your FH credentials
          </Link>
        </div>
      </section>
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

