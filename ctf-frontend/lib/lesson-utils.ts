export interface TocHeading {
  id: string
  text: string
  level: number
}

// Format duration helper - server-safe
export function formatDuration(minutes: number | null): string {
  if (!minutes) return 'Self-paced'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (mins === 0) return `${hours}h`
  return `${hours}h ${mins}m`
}

// Extract headings from HTML content - server-safe
export function extractHeadingsFromHtml(html: string): TocHeading[] {
  const headings: TocHeading[] = []
  const headingRegex = /<h([23])(?:[^>]*)>([^<]+)<\/h[23]>/gi
  let match

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1])
    const text = match[2].replace(/<[^>]+>/g, '').trim() // Strip any inner HTML
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    headings.push({ id, text, level })
  }

  return headings
}

// Extract headings from multiple content fields - server-safe
export function extractAllHeadings(content?: string, detailedExplanation?: string): TocHeading[] {
  const allContent = [content, detailedExplanation].filter(Boolean).join(' ')
  return extractHeadingsFromHtml(allContent)
}

export type { TocHeading as TableOfContentsHeading }