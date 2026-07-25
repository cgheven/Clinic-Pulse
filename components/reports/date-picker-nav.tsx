'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'

interface DatePickerNavProps {
  /** Currently selected date as YYYY-MM-DD */
  selectedDate: string
  isToday: boolean
  /** Base path for navigation, defaults to /reports/daily */
  basePath?: string
}

/**
 * Renders the formatted date as a clickable button.
 * Clicking it triggers the native date picker via showPicker().
 * On selection, navigates to /reports/daily?date=YYYY-MM-DD.
 */
export function DatePickerNav({ selectedDate, isToday, basePath = '/reports/daily' }: DatePickerNavProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleClick() {
    const input = inputRef.current
    if (input) {
      ;(input as HTMLInputElement & { showPicker?: () => void }).showPicker?.()
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      router.push(`${basePath}?date=${value}`)
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center gap-3">
      <button
        type="button"
        onClick={handleClick}
        className="text-sm font-semibold text-foreground hover:text-primary transition-colors cursor-pointer underline-offset-2 hover:underline"
        aria-label="Open date picker"
      >
        {formatDate(selectedDate, 'EEEE, dd MMM yyyy')}
      </button>
      <input
        ref={inputRef}
        type="date"
        value={selectedDate}
        onChange={handleChange}
        className="sr-only"
        aria-label="Select report date"
        tabIndex={-1}
        style={{ colorScheme: 'dark' }}
      />
      {isToday && (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
          Today
        </span>
      )}
    </div>
  )
}
