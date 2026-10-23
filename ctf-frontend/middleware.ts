import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const LOCALES = ['en', 'de'] as const
const LOCALE_COOKIE = 'NEXT_LOCALE'

function isLocale(value: string | undefined): value is (typeof LOCALES)[number] {
  return value === 'en' || value === 'de'
}

function preferredLocale(request: NextRequest): (typeof LOCALES)[number] {
  const cookie = request.cookies.get(LOCALE_COOKIE)?.value
  if (isLocale(cookie)) return cookie

  // First language tag wins; unsupported languages fall back to English.
  const first = (request.headers.get('accept-language') ?? '')
    .split(',')[0]
    .split('-')[0]
    .trim()
    .toLowerCase()
  return first === 'de' ? 'de' : 'en'
}

function cookieOptions(request: NextRequest) {
  return {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax' as const,
    secure: request.nextUrl.protocol === 'https:',
  }
}

function isProtectedCoursePath(pathname: string, locale: string) {
  return (
    pathname === `/${locale}/courses` ||
    pathname.startsWith(`/${locale}/courses/`)
  )
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const segment = pathname.split('/')[1]

  if (isLocale(segment)) {
    if (isProtectedCoursePath(pathname, segment) && !request.cookies.has('auth_token')) {
      return NextResponse.redirect(new URL(`/${segment}/login`, request.url))
    }

    const response = NextResponse.next()
    if (request.cookies.get(LOCALE_COOKIE)?.value !== segment) {
      response.cookies.set(LOCALE_COOKIE, segment, cookieOptions(request))
    }
    return response
  }

  // Unprefixed paths resolve once to a canonical /en or /de URL. The redirect
  // depends on a cookie, so it must never be cached by a shared cache.
  const locale = preferredLocale(request)
  const target = new URL(`/${locale}${pathname === '/' ? '' : pathname}`, request.url)
  target.search = search

  const response = NextResponse.redirect(target, 308)
  response.cookies.set(LOCALE_COOKIE, locale, cookieOptions(request))
  response.headers.set('Vary', 'Accept-Language, Cookie')
  response.headers.set('Cache-Control', 'no-store')
  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
}
