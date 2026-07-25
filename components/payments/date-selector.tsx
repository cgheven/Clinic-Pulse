'use client'

import { useRouter } from 'next/navigation'
import { DateInput } from '@/components/ui/date-input'

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

  function handleChange(v: string) {
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      router.push(`/payments?date=${v}`)
    }
  }

  return (
    // DateInput already renders its own bordered trigger with a calendar icon,
    // so it needs no wrapping label border or second icon.
    <DateInput
      value={currentDate}
      onChange={handleChange}
      className="w-[170px]"
      aria-label="Select date"
    />
  )
}
