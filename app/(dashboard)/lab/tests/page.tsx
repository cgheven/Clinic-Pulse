'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { TestLogTable } from '@/components/lab/test-log-table'
import { toast } from '@/hooks/use-toast'
import { getDailyTestLog } from '@/app/actions/lab'
import type { DailyTestLogResult } from '@/app/actions/lab'
import { getTodayPKT } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react'

// =============================================================================
// Helpers
// =============================================================================

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]!
}

// =============================================================================
// Page (client for date navigation)
// =============================================================================

export default function LabTestsPage() {
  const [date, setDate] = useState(getTodayPKT())
  const [result, setResult] = useState<DailyTestLogResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [, startTransition] = useTransition()
  const [hasFetched, setHasFetched] = useState(false)

  function fetchLog(d: string) {
    setIsLoading(true)
    startTransition(async () => {
      const res = await getDailyTestLog(d)
      setIsLoading(false)
      setHasFetched(true)
      if (res.success) {
        setResult(res.data)
      } else {
        toast({
          title: 'Failed to load tests',
          description: res.error,
          variant: 'destructive',
        })
      }
    })
  }

  function handleDateChange(newDate: string) {
    setDate(newDate)
    setResult(null)
    setHasFetched(false)
  }

  function handlePrev() {
    const nd = offsetDate(date, -1)
    handleDateChange(nd)
  }

  function handleNext() {
    const nd = offsetDate(date, 1)
    if (nd <= getTodayPKT()) handleDateChange(nd)
  }

  const isToday = date === getTodayPKT()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Daily Test Log</h1>
        <Button size="sm" asChild>
          <Link href="/lab/tests/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Record Test
          </Link>
        </Button>
      </div>

      {/* Date controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          className="h-8 w-8 shrink-0 border-border"
          title="Previous day"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>

        <DateInput
          value={date}
          max={getTodayPKT()}
          onChange={(v) => handleDateChange(v)}
          className="w-40 h-8 text-sm"
        />

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={isToday}
          className="h-8 w-8 shrink-0 border-border"
          title="Next day"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        <Button
          size="sm"
          onClick={() => fetchLog(date)}
          disabled={isLoading || !date}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Loading…
            </>
          ) : (
            'View Tests'
          )}
        </Button>

        {!isToday && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleDateChange(getTodayPKT())}
            className="text-[12px] text-muted-foreground hover:text-foreground"
          >
            Today
          </Button>
        )}
      </div>

      {/* Results */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && result && (
        <TestLogTable result={result} date={date} showAddButton />
      )}

      {!isLoading && !result && hasFetched && (
        <div className="rounded-xl border border-dashed border-border bg-card py-12 text-center">
          <p className="text-sm text-muted-foreground">No data for this date.</p>
        </div>
      )}

      {!isLoading && !hasFetched && (
        <div className="rounded-xl border border-dashed border-border bg-card py-12 text-center">
          <p className="text-sm text-muted-foreground">
            Select a date and click{' '}
            <span className="font-medium text-foreground">View Tests</span> to load the log.
          </p>
        </div>
      )}
    </div>
  )
}
