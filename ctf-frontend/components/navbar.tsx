"use client"

import Link from "@/components/localized-link"
import { usePathname, useRouter } from "next/navigation"
import { useLocalePath } from "@/lib/i18n/use-locale"
import { useState } from "react"
import { User, Menu, X, Flag, Shield } from "lucide-react"
import ThemeToggle from "@/components/theme-toggle"
import LanguageSwitcher from "@/components/language-switcher"
import { useAuth } from "@/lib/hooks/use-auth"
import { useTranslation } from "react-i18next"

export default function Navbar() {
  const { t } = useTranslation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const withLocale = useLocalePath()
  const { auth, logout } = useAuth()

  const navLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/challenges", label: t("nav.challenges") },
    { href: "/courses", label: t("nav.courses") },
    { href: "/scoreboard", label: t("nav.scoreboard") },
    { href: "/about", label: t("nav.about") },
    { href: "/help", label: t("nav.help") },
  ]

  const isActive = (href: string) => pathname === href

  const handleLogout = async () => {
    await logout()
    setMobileMenuOpen(false)
    router.push(withLocale("/"))
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-border backdrop-blur-sm bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-primary hover:opacity-80 transition-opacity"
          >
            <Flag className="w-6 h-6" />
            <span>{t("nav.platformName")}</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-6">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`font-medium transition-colors ${
                    isActive(link.href) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Auth Buttons */}
          <div className="cursor-pointer hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            <div className=" hidden md:flex items-center mr-2">
              <ThemeToggle />
            </div>
            {auth.isAuthenticated && auth.isAdmin && (
              <Link
                href="/admin"
                className="px-4 py-2 text-muted-foreground hover:text-primary transition-colors"
                title={t("nav.adminDashboard")}
              >
                <Shield className="w-5 h-5" />
              </Link>
            )}
            {auth.isAuthenticated ? (
              <>
                <Link
                  href="/profile"
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  <User className="w-5 h-5 text-secondary-foreground" />
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 cursor-pointer bg-destructive text-white dark:text-foreground rounded-lg font-medium hover:opacity-80 transition-opacity"
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  {t("nav.login")}
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-foreground hover:text-primary transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-card">
          <div className="px-4 py-4 space-y-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block py-2 font-medium transition-colors ${
                  isActive(link.href) ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="cursor-pointer pt-4 border-t border-border space-y-3">
              <div className="px-2 flex items-center gap-3">
                <ThemeToggle />
                <LanguageSwitcher />
              </div>
              {auth.isAuthenticated ? (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full px-4 py-2 text-center bg-secondary text-secondary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    <User className="w-5 h-5 text-secondary-foreground" />
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 bg-destructive text-destructive-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    {t("nav.logout")}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full px-4 py-2 text-center bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
                  >
                    {t("nav.login")}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}