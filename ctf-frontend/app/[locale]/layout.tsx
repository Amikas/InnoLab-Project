import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import { notFound } from "next/navigation"
import "../globals.css"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/hooks/use-auth"
import I18nProvider from "@/components/providers/i18n-provider"
import { getDictionary } from "@/lib/i18n/dictionaries"
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  isSupportedLocale,
  resolveLocale,
} from "@/lib/i18n/config"
import { Toaster } from "@/components/ui/sonner"

// Font configuration
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale: raw } = await params
  const locale = resolveLocale(raw)
  const dict = getDictionary(locale)
  return {
    title: dict.home.title,
    description: dict.home.subtitle,
    keywords: ["CTF", "cybersecurity", "hacking", "training", "challenges"],
  }
}

export default async function RootLayout({ children, params }: LayoutProps) {
  const { locale: raw } = await params
  if (!isSupportedLocale(raw)) notFound()
  const locale = raw ?? DEFAULT_LOCALE

  return (
    <html lang={locale} className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col font-sans">
        <ThemeProvider attribute="class" defaultTheme="system">
          <I18nProvider locale={locale}>
            <AuthProvider>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer locale={locale} />
            </AuthProvider>
          </I18nProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
