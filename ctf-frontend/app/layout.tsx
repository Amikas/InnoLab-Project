import type React from "react"
import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import Navbar from "@/components/navbar"
import Footer from "@/components/footer"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/lib/hooks/use-auth"
import I18nProvider from "@/components/providers/i18n-provider"
import { getLocale } from "@/lib/i18n/get-locale"
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

export const metadata: Metadata = {
  title: "CTF Training Platform",
  description: "Master cybersecurity skills through hands-on Capture The Flag challenges",
  keywords: ["CTF", "cybersecurity", "hacking", "training", "challenges"]
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  return (
    <html lang={locale} className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col font-sans">
        <ThemeProvider attribute="class" defaultTheme="system">
          <I18nProvider>
            <AuthProvider>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </AuthProvider>
          </I18nProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}