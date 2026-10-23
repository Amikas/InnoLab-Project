import type { Metadata } from "next"
import LoginForm from "@/components/login-form"
import RedirectIfAuthenticated from "@/components/redirect-if-authenticated"
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
    title: dict.login.metaTitle,
    description: dict.login.subtitle,
    alternates: localizedAlternates(locale, "/login"),
  }
}

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = resolveLocale(rawLocale)
  const dict = getDictionary(locale)
  return (
    <RedirectIfAuthenticated>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">{dict.login.welcome}</h1>
            <p className="text-muted-foreground">{dict.login.subtitle}</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </RedirectIfAuthenticated>
  )
}
