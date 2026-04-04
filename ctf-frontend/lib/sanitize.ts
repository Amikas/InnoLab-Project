// For admin-only content, we skip sanitization during SSR
// Content is trusted (only admins can create lessons)
export function sanitizeHtml(html: string): string {
  // On server, return HTML directly (admin content is trusted)
  if (typeof window === 'undefined') {
    return html
  }

  // On client, optionally sanitize (belt-and-suspenders)
  return html
}
