'use client'

import { AlertTriangle, AlertCircle, Info, CheckCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type CalloutType = 'danger' | 'warning' | 'info' | 'success'

interface CalloutProps {
  type: CalloutType
  title?: string
  children: React.ReactNode
  className?: string
  dismissible?: boolean
  onDismiss?: () => void
}

const calloutConfig = {
  danger: {
    icon: AlertTriangle,
    borderColor: 'border-l-red-500',
    bgColor: 'bg-red-500/5',
    iconColor: 'text-red-500',
    title: 'Danger',
  },
  warning: {
    icon: AlertCircle,
    borderColor: 'border-l-yellow-500',
    bgColor: 'bg-yellow-500/5',
    iconColor: 'text-yellow-500',
    title: 'Warning',
  },
  info: {
    icon: Info,
    borderColor: 'border-l-blue-500',
    bgColor: 'bg-blue-500/5',
    iconColor: 'text-blue-500',
    title: 'Info',
  },
  success: {
    icon: CheckCircle,
    borderColor: 'border-l-green-500',
    bgColor: 'bg-green-500/5',
    iconColor: 'text-green-500',
    title: 'Success',
  },
}

export function Callout({ type, title, children, className, dismissible, onDismiss }: CalloutProps) {
  const config = calloutConfig[type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'relative flex gap-3 rounded-r-lg p-4 border-l-4',
        config.borderColor,
        config.bgColor,
        className
      )}
    >
      <Icon className={cn('w-5 h-5 shrink-0 mt-0.5', config.iconColor)} />
      <div className="flex-1 min-w-0">
        {(title || config.title) && (
          <p className={cn('font-semibold mb-1', config.iconColor)}>
            {title || config.title}
          </p>
        )}
        <div className="text-sm text-muted-foreground leading-relaxed">
          {children}
        </div>
      </div>
      {dismissible && onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded hover:bg-muted/50 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}

// Compact inline callout for use within prose content
interface InlineCalloutProps {
  type: CalloutType
  children: React.ReactNode
  className?: string
}

export function InlineCallout({ type, children, className }: InlineCalloutProps) {
  const config = calloutConfig[type]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-start gap-2 my-4 p-3 rounded-lg border border-l-4',
        config.borderColor,
        config.bgColor,
        className
      )}
    >
      <Icon className={cn('w-4 h-4 shrink-0 mt-0.5', config.iconColor)} />
      <div className="text-sm text-foreground leading-relaxed">
        {children}
      </div>
    </div>
  )
}

export { calloutConfig }
export type { CalloutType }