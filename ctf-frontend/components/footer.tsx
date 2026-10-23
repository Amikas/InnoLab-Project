import Link from "@/components/localized-link"
import { Github, Mail, Flag } from "lucide-react"
import { getDictionary } from "@/lib/i18n/dictionaries"
import type { SupportedLocale } from "@/lib/i18n/config"

export default async function Footer({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale)
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary mb-4">
              <Flag className="w-6 h-6" />
              <span>{dict.nav.platformName}</span>
            </Link>
            <p className="text-muted-foreground mb-4 max-w-md">
              {dict.footer.tagline}
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com/3Llmm/InnoLab-Project"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="mailto:support@technikum-wien.at"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">{dict.footer.quickLinks}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/challenges" className="text-muted-foreground hover:text-primary transition-colors">
                  {dict.footer.challenges}
                </Link>
              </li>
              <li>
                <Link href="/courses" className="text-muted-foreground hover:text-primary transition-colors">
                  {dict.footer.courses}
                </Link>
              </li>
              <li>
                <Link href="/scoreboard" className="text-muted-foreground hover:text-primary transition-colors">
                  {dict.footer.scoreboard}
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
                  {dict.footer.aboutUs}
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">{dict.footer.support}</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/help" className="text-muted-foreground hover:text-primary transition-colors">
                  {dict.footer.helpCenter}
                </Link>
              </li>
              <li>
                <Link href="/help#faq" className="text-muted-foreground hover:text-primary transition-colors">
                  {dict.footer.faq}
                </Link>
              </li>
              <li>
                <Link href="/help#contact" className="text-muted-foreground hover:text-primary transition-colors">
                  {dict.footer.contactUs}
                </Link>
              </li>
              <li>
                <Link href="/help#rules" className="text-muted-foreground hover:text-primary transition-colors">
                  {dict.footer.rules}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} {dict.footer.copyright}</p>
        </div>
      </div>
    </footer>
  )
}
