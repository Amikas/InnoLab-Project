import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(_request: NextRequest) {
  // Keep middleware neutral: auth truth is decided by backend validation
  // through /api/user/me, not by client-side cookie presence checks.
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/challenges/:path*',
    '/profile/:path*',
    '/admin/:path*',
    '/login'
  ]
}
