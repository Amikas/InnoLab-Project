import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Cheap gate only: a missing cookie can never be authenticated, so redirect
  // before rendering. Token validity is still decided by the backend through
  // /api/user/me in the server page guard (requireAuth), never by cookie
  // presence alone.
  const { pathname } = request.nextUrl
  if (
    (pathname === '/courses' || pathname.startsWith('/courses/')) &&
    !request.cookies.has('auth_token')
  ) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/challenges/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/courses/:path*',
    '/login'
  ]
}
