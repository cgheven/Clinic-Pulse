'use client'

import { useRef } from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DateInputProps {
  value: string
  onChange: (value: string) => void
  id?: string
  className?: string
  min?: string
  max?: string
  required?: boolean
  disabled?: boolean
  'aria-label'?: string
}

function formatDisplay(value: string): string {
  if (!value) return 'Pick a date'
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return value
  const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  return d.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function DateInput({
  value,
  onChange,
  id,
  className,
  min,
  max,
  required,
  disabled,
  'aria-label': ariaLabel,
}: DateInputProps) {
  const ref = useRef<HTMLInputElement>(null)

  return (
    // `className` is applied to BOTH the wrapper and the trigger button.
    // The wrapper needs it for layout (w-40, flex-1, shrink-0), but the button
    // is what actually owns the border, height and text size — so caller
    // classes like `h-8` or `border-destructive` have to reach it too, or they
    // silently do nothing. cn() is tailwind-merge, so caller classes listed
    // last correctly override the defaults below.
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => ref.current?.showPicker()}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm transition-colors',
          'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/40',
          value ? 'text-foreground' : 'text-muted-foreground',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <span>{formatDisplay(value)}</span>
        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      <input
        ref={ref}
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0"
        style={{ colorScheme: 'dark' }}
      />
    </div>
  )
}
