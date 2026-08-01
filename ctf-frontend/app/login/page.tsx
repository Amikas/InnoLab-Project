import type { Metadata } from "next"
import LoginForm from "@/components/login-form"
import RedirectIfAuthenticated from "@/components/redirect-if-authenticated"

export const metadata: Metadata = {
  title: "Login | CTF Platform",
  description: "Login to your CTF training account",
}

export default function LoginPage() {
  return (
    <RedirectIfAuthenticated>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">Welcome Back</h1>
            <p className="text-muted-foreground">Login to continue your CTF journey</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </RedirectIfAuthenticated>
  )
}
