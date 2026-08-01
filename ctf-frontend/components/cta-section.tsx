"use client"

import Link from "next/link"
import { useAuth } from "@/lib/hooks/use-auth"

export function CtaSection() {
  const { auth } = useAuth()

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl font-bold mb-6">Ready to Start Your Journey?</h2>
        <p className="text-xl text-muted-foreground mb-8">
          Join thousands of security enthusiasts learning and competing
        </p>
        {auth.isAuthenticated ? (
          <Link
            href="/challenges"
            className="inline-block px-8 py-4 bg-accent text-accent-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Go to Challenges
          </Link>
        ) : (
          <Link
            href="/login"
            className="inline-block px-8 py-4 bg-accent text-accent-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            Login with your FH credentials
          </Link>
        )}
      </div>
    </section>
  )
}
