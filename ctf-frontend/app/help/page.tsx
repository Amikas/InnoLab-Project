import type { Metadata } from "next"
import { MessageCircle, BookOpen, Shield, Mail } from "lucide-react"
import { getLocale } from "@/lib/i18n/get-locale"
import { getDictionary } from "@/lib/i18n/dictionaries"

export const metadata: Metadata = {
  title: "Help | CTF Platform",
  description: "Get help and support for the CTF platform",
}

export default async function HelpPage() {
  const locale = await getLocale()
  const dict = getDictionary(locale)
  const faqs = [
    { q: dict.help.q1, a: dict.help.a1 },
    { q: dict.help.q2, a: dict.help.a2 },
    { q: dict.help.q3, a: dict.help.a3 },
    { q: dict.help.q4, a: dict.help.a4 },
    { q: dict.help.q5, a: dict.help.a5 },
    { q: dict.help.q6, a: dict.help.a6 },
  ]
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-center">{dict.help.title}</h1>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-card p-6 rounded-lg border border-border hover:border-primary transition-colors">
            <MessageCircle className="w-12 h-12 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">{dict.help.forumTitle}</h2>
            <p className="text-muted-foreground mb-4">{dict.help.forumDesc}</p>
            <a href="#forum" className="text-primary hover:underline font-medium">
              {dict.help.forumLink} →
            </a>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border hover:border-primary transition-colors">
            <BookOpen className="w-12 h-12 text-secondary mb-4" />
            <h2 className="text-xl font-semibold mb-2">{dict.help.docsTitle}</h2>
            <p className="text-muted-foreground mb-4">{dict.help.docsDesc}</p>
            <a href="#docs" className="text-primary hover:underline font-medium">
              {dict.help.docsLink} →
            </a>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border hover:border-primary transition-colors">
            <Shield className="w-12 h-12 text-accent mb-4" />
            <h2 className="text-xl font-semibold mb-2">{dict.help.rulesTitle}</h2>
            <p className="text-muted-foreground mb-4">{dict.help.rulesDesc}</p>
            <a href="#rules" className="text-primary hover:underline font-medium">
              {dict.help.rulesLink} →
            </a>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border hover:border-primary transition-colors">
            <Mail className="w-12 h-12 text-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">{dict.help.contactTitle}</h2>
            <p className="text-muted-foreground mb-4">{dict.help.contactDesc}</p>
            <a href="#contact" className="text-primary hover:underline font-medium">
              {dict.help.contactLink} →
            </a>
          </div>
        </div>

        <div id="faq" className="bg-card p-8 rounded-lg border border-border mb-8">
          <h2 className="text-2xl font-semibold mb-6">{dict.help.faqTitle}</h2>
          <div className="space-y-6">
            {faqs.map((f) => (
              <div key={f.q}>
                <h3 className="text-lg font-semibold mb-2">{f.q}</h3>
                <p className="text-muted-foreground">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        <div id="contact" className="bg-card p-8 rounded-lg border border-border">
          <h2 className="text-2xl font-semibold mb-4">{dict.help.contactHeading}</h2>
          <p className="text-muted-foreground mb-6">{dict.help.contactText}</p>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-primary" />
              <a href="mailto:support@technikum-wien.at" className="text-primary hover:underline">
                support@technikum-wien.at
              </a>
            </div>
            <p className="text-sm text-muted-foreground">{dict.help.contactNote}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
