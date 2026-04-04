'use client'

import { useMemo } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check, AlertTriangle, AlertCircle, Info, ShieldAlert, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { detectCodeVariant, type CodeVariant } from './lesson/code-block'

// Custom style to remove background from each line
const customOneDark = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: 'transparent',
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent',
  },
}

function detectLanguage(className: string): string {
  if (!className) return 'text'
  const langMap: Record<string, string> = {
    'language-php': 'php',
    'language-python': 'python',
    'language-js': 'javascript',
    'language-javascript': 'javascript',
    'language-sql': 'sql',
    'language-c': 'c',
    'language-cpp': 'cpp',
    'language-java': 'java',
    'language-bash': 'bash',
    'language-sh': 'bash',
    'language-html': 'html',
    'language-css': 'css',
    'language-json': 'json',
    'language-xml': 'xml',
    'language-yaml': 'yaml',
    'language-yml': 'yaml',
    'language-ruby': 'ruby',
    'language-go': 'go',
    'language-rust': 'rust',
  }
  
  for (const [key, lang] of Object.entries(langMap)) {
    if (className.includes(key)) return lang
  }
  return 'text'
}

// Extract explicit variant from class attribute (e.g., "language-php vulnerable")
// Priority: explicit class > heuristic detection (fallback)
function getExplicitVariant(className: string): CodeVariant | null {
  if (!className) return null
  
  const classes = className.toLowerCase().split(/\s+/)
  
  if (classes.includes('vulnerable')) {
    return 'vulnerable'
  }
  if (classes.includes('secure')) {
    return 'secure'
  }
  
  return null
}

// Callout detection patterns
type CalloutType = 'danger' | 'warning' | 'info' | 'success'

function detectCallout(html: string): { type: CalloutType; content: string } | null {
  const patterns: Record<CalloutType, RegExp[]> = {
    danger: [
      /<div[^>]*class="[^"]*danger[^"]*"[^>]*>/i,
      /<div[^>]*class="[^"]*alert-danger[^"]*"[^>]*>/i,
      /⚠️|🚨|❌|danger/i,
    ],
    warning: [
      /<div[^>]*class="[^"]*warning[^"]*"[^>]*>/i,
      /<div[^>]*class="[^"]*alert-warning[^"]*"[^>]*>/i,
      /⚠️|warning|caution/i,
    ],
    info: [
      /<div[^>]*class="[^"]*info[^"]*"[^>]*>/i,
      /<div[^>]*class="[^"]*alert-info[^"]*"[^>]*>/i,
      /ℹ️|info/i,
    ],
    success: [
      /<div[^>]*class="[^"]*success[^"]*"[^>]*>/i,
      /<div[^>]*class="[^"]*alert-success[^"]*"[^>]*>/i,
      /✅|success|✓/i,
    ],
  }

  for (const [type, regexes] of Object.entries(patterns) as [CalloutType, RegExp[]][]) {
    if (regexes.some(r => r.test(html))) {
      return { type, content: html }
    }
  }
  return null
}

// Callout component for inline rendering
function CalloutBlock({ type, content }: { type: CalloutType; content: string }) {
  const config = {
    danger: {
      icon: AlertTriangle,
      borderColor: 'border-l-red-500',
      bgColor: 'bg-red-500/5',
      iconColor: 'text-red-500',
    },
    warning: {
      icon: AlertCircle,
      borderColor: 'border-l-yellow-500',
      bgColor: 'bg-yellow-500/5',
      iconColor: 'text-yellow-500',
    },
    info: {
      icon: Info,
      borderColor: 'border-l-blue-500',
      bgColor: 'bg-blue-500/5',
      iconColor: 'text-blue-500',
    },
    success: {
      icon: ShieldCheck,
      borderColor: 'border-l-green-500',
      bgColor: 'bg-green-500/5',
      iconColor: 'text-green-500',
    },
  }

  const { icon: Icon, borderColor, bgColor, iconColor } = config[type]
  
  // Clean the content - remove any outer wrapper tags
  const cleanContent = content.replace(/<div[^>]*>|<\/div>/gi, '').trim()

  return (
    <div className={cn('flex gap-3 rounded-r-lg p-4 border-l-4 my-4', borderColor, bgColor)}>
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', iconColor)} />
      <div 
        className="text-sm text-foreground leading-relaxed"
        dangerouslySetInnerHTML={{ __html: cleanContent }}
      />
    </div>
  )
}

interface CodeBlockWithCopyProps { 
  code: string
  language?: string
  variant?: CodeVariant
}

function CodeBlockWithCopy({ code, language = 'text', variant = 'default' }: CodeBlockWithCopyProps) {
  const [copied, setCopied] = React.useState(false)
  const VariantIcon = variant === 'vulnerable' ? ShieldAlert : variant === 'secure' ? ShieldCheck : null

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const variantStyles = {
    default: {
      headerBg: 'bg-muted/50',
      headerBorder: 'border-border',
      borderAccent: 'border-l-primary',
      bgAccent: 'bg-primary/5',
    },
    vulnerable: {
      headerBg: 'bg-red-500/10',
      headerBorder: 'border-red-500/30',
      borderAccent: 'border-l-red-500',
      bgAccent: 'bg-red-500/5',
    },
    secure: {
      headerBg: 'bg-green-500/10',
      headerBorder: 'border-green-500/30',
      borderAccent: 'border-l-green-500',
      bgAccent: 'bg-green-500/5',
    },
  }

  const style = variantStyles[variant]
  const displayLanguage = language.charAt(0).toUpperCase() + language.slice(1)

  return (
    <div className={cn('relative group rounded-lg overflow-hidden my-4 border border-l-4', style.borderAccent, style.bgAccent)}>
      <div className={cn('flex items-center justify-between px-4 py-2 border-b', style.headerBg, style.headerBorder)}>
        <div className="flex items-center gap-2">
          {VariantIcon && <VariantIcon className={cn('w-4 h-4', variant === 'vulnerable' ? 'text-red-500' : 'text-green-500')} />}
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {variant === 'vulnerable' ? 'Vulnerable' : variant === 'secure' ? 'Secure' : displayLanguage}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className={cn('cursor-pointer','p-1.5 rounded transition-all hover:bg-background/50', copied ? 'text-green-500' : 'text-muted-foreground')}
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={customOneDark}
        customStyle={{ 
          margin: 0, 
          padding: '1rem 1.25rem', 
          background: 'transparent', 
          fontSize: '0.8125rem', 
          lineHeight: '1.6'
        }}
        showLineNumbers={false}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

// Need React for state
import React from 'react'

interface LessonContentProps {
  content: string
}

export default function LessonContent({ content }: LessonContentProps) {
  if (!content) return null

  // Parse HTML and extract code blocks for special rendering
  const codeBlockRegex = /<pre><code(?: class="([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g
  
  let lastIndex = 0
  const elements: React.ReactNode[] = []
  let match
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before code block
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index)
      
      // Check if this text contains a callout
      const calloutMatch = textBefore.match(/<div[^>]*>(?:⚠️|ℹ️|✅|❌|warning|danger|info|success)(?:[^<]*)<\/div>/i)
      
      if (calloutMatch) {
        const calloutHtml = calloutMatch[0]
        const calloutType = detectCallout(calloutHtml)
        
        if (calloutType) {
          // Extract text content from callout and render as callout component
          const textContent = calloutHtml.replace(/<[^>]+>/g, '').trim()
          elements.push(
            <CalloutBlock key={`callout-${match.index}`} type={calloutType.type} content={textContent} />
          )
        } else {
          elements.push(
            <div 
              key={`text-${lastIndex}`}
              className="lesson-content-html"
              dangerouslySetInnerHTML={{ __html: textBefore }}
            />
          )
        }
      } else {
        elements.push(
          <div 
            key={`text-${lastIndex}`}
            className="lesson-content-html"
            dangerouslySetInnerHTML={{ __html: textBefore }}
          />
        )
      }
    }
    
    const className = match[1] || ''
    const code = match[2]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .trim()
    
    const language = detectLanguage(className)
    
    // Explicit class takes priority, fallback to heuristic detection
    const explicitVariant = getExplicitVariant(className)
    const variant = explicitVariant || detectCodeVariant(code, language)
    
    elements.push(
      <CodeBlockWithCopy 
        key={`code-${match.index}`}
        code={code}
        language={language}
        variant={variant}
      />
    )
    
    lastIndex = match.index + match[0].length
  }
  
  // Add remaining content after last code block
  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex)
    elements.push(
      <div 
        key={`text-${lastIndex}`}
        className="lesson-content-html"
        dangerouslySetInnerHTML={{ __html: textAfter }}
      />
    )
  }
  
  return <div className="lesson-content space-y-4">{elements}</div>
}

// Export helper for detecting callouts in content
export function hasCallout(content: string): boolean {
  return detectCallout(content) !== null
}