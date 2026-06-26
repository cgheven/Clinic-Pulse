'use client'

import { useRouter } from 'next/navigation'
import { CalendarDays } from 'lucide-react'

interface DateSelectorProps {
  /** Currently selected date as YYYY-MM-DD */
  currentDate: string
}

/**
 * A minimal date-picker that pushes `?date=YYYY-MM-DD` to the payments route
 * when the user changes the date. The page (server component) re-renders with
 * fresh data without any client-side data fetching.
 */
export function DateSelector({ currentDate }: DateSelectorProps) {
  const router = useRouter()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      router.push(`/payments?date=${value}`)
    }
  }

  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground transition-colors hover:border-primary/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        type="date"
        value={currentDate}
        onChange={handleChange}
        className="bg-transparent text-sm text-foreground outline-none"
        aria-label="Select date"
      />
    </label>
  )
}
