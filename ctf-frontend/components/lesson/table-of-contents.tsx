'use client'

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Menu, X, ChevronRight } from 'lucide-react'

interface TocHeading {
  id: string
  text: string
  level: number
}

interface TableOfContentsProps {
  headings: TocHeading[]
  className?: string
}

export function TableOfContents({ headings, className }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('')
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  // Extract headings from content if not provided
  useEffect(() => {
    if (headings.length > 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        })
      },
      { rootMargin: '-80px 0px -80% 0px' }
    )

    document.querySelectorAll('h2[id], h3[id]').forEach((el) => {
      observer.observe(el)
    })

    return () => observer.disconnect()
  }, [headings])

  // Auto-generate IDs for headings without them
  useEffect(() => {
    document.querySelectorAll('.lesson-content h2, .lesson-content h3').forEach((el) => {
      if (!el.id) {
        const text = el.textContent?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || ''
        el.id = text
      }
    })
  }, [])

  const scrollToHeading = useCallback((id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const offset = 96 // Account for sticky header
      const top = element.getBoundingClientRect().top + window.scrollY - offset
      window.scrollTo({ top, behavior: 'smooth' })
      setIsMobileOpen(false)
    }
  }, [])

  if (headings.length === 0) {
    return null
  }

  // Group headings by level
  const h2Headings = headings.filter((h) => h.level === 2)
  const h3Headings = headings.filter((h) => h.level === 3)

  // Desktop TOC
  const DesktopTOC = () => (
    <nav className="sticky top-24 space-y-1 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        On this page
      </p>
      {h2Headings.map((heading) => (
        <div key={heading.id}>
          <button
            onClick={() => scrollToHeading(heading.id)}
            className={cn(
              'block w-full text-left py-1.5 text-sm transition-colors',
              activeId === heading.id
                ? 'text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {heading.text}
          </button>
          {h3Headings
            .filter((h) => {
              const h2Index = h2Headings.findIndex((h2) => h2.id === heading.id)
              const h3Index = h3Headings.findIndex((h3) => h3.id === h.id)
              const nextH2Index = h2Headings.findIndex((h2, i) => i > h2Index && h2.level === 2)
              return h3Index > h2Index && (nextH2Index === -1 || h3Index < nextH2Index)
            })
            .map((h3) => (
              <button
                key={h3.id}
                onClick={() => scrollToHeading(h3.id)}
                className={cn(
                  'block w-full text-left py-1 pl-4 text-sm transition-colors',
                  activeId === h3.id
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground/70 hover:text-foreground'
                )}
              >
                {h3.text}
              </button>
            ))}
        </div>
      ))}
    </nav>
  )

  // Mobile TOC button and drawer
  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className={cn(
          'lg:hidden fixed bottom-4 right-4 z-40',
          'flex items-center gap-2 px-4 py-2.5 rounded-full',
          'bg-primary text-primary-foreground shadow-lg',
          'hover:bg-primary/90 transition-all'
        )}
      >
        <Menu className="w-4 h-4" />
        <span className="text-sm font-medium">Contents</span>
      </button>

      {/* Mobile drawer overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          'lg:hidden fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw]',
          'bg-background border-l border-border shadow-xl',
          'transform transition-transform duration-300 ease-out',
          isMobileOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Contents</h3>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {headings.map((heading) => (
            <button
              key={heading.id}
              onClick={() => scrollToHeading(heading.id)}
              className={cn(
                'block w-full text-left py-2 text-sm transition-colors',
                heading.level === 3 && 'pl-4 text-muted-foreground/70',
                activeId === heading.id
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <ChevronRight className="inline w-3 h-3 mr-1" />
              {heading.text}
            </button>
          ))}
        </nav>
      </div>

      {/* Desktop sidebar */}
      <div className={cn('hidden lg:block', className)}>
        <DesktopTOC />
      </div>
    </>
  )
}

export type { TocHeading }