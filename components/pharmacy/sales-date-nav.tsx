'use client'

import React from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DateInput } from '@/components/ui/date-input'

// =============================================================================
// Helpers
// =============================================================================

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]!
}

// =============================================================================
// Date navigation for /pharmacy/sales
//
// Data-free client leaf: it only pushes `?date=` so the server component can
// re-render with the new day's sales.
// =============================================================================

export function SalesDateNav({
  dateParam,
  todayStr,
}: {
  dateParam: string
  todayStr: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function navigateToDate(date: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('date', date)
    router.push(`${pathname}?${params.toString()}`)
  }

  const displayDate = new Date(dateParam + 'T00:00:00').toLocaleDateString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const isToday = dateParam === todayStr

  return (
    <>
      {/* Date navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigateToDate(shiftDate(dateParam, -1))}
          className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="max-w-xs flex-1">
          <DateInput
            value={dateParam}
            onChange={(v) => v && navigateToDate(v)}
            max={todayStr}
          />
        </div>

        <button
          onClick={() => navigateToDate(shiftDate(dateParam, 1))}
          disabled={isToday}
          className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {!isToday && (
          <button
            onClick={() => navigateToDate(todayStr)}
            className="rounded-md border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            Today
          </button>
        )}
      </div>

      {/* Date label */}
      <p className="text-[12px] text-muted-foreground">{displayDate}</p>
    </>
  )
}
