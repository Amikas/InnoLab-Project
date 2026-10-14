import type { Metadata } from "next"
import LoginForm from "@/components/login-form"
import RedirectIfAuthenticated from "@/components/redirect-if-authenticated"
import { getLocale } from "@/lib/i18n/get-locale"
import { getDictionary } from "@/lib/i18n/dictionaries"

export const metadata: Metadata = {
  title: "Login | CTF Platform",
  description: "Login to your CTF training account",
}

export default async function LoginPage() {
  const locale = await getLocale()
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
