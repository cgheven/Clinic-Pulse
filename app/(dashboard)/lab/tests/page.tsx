'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { TestLogTable } from '@/components/lab/test-log-table'
import { toast } from '@/hooks/use-toast'
import { getDailyTestLog } from '@/app/actions/lab'
import type { DailyTestLogResult } from '@/app/actions/lab'
import { ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react'

// =============================================================================
// Helpers
// =============================================================================

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!
}

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]!
}

// =============================================================================
// Page (client for date navigation)
// =============================================================================

export default function LabTestsPage() {
  const [date, setDate] = useState(todayISO())
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
    if (nd <= todayISO()) handleDateChange(nd)
  }

  const isToday = date === todayISO()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Test Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Filter by date to view all tests performed
          </p>
        </div>
        <Link
          href="/lab/tests/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Record Test
        </Link>
      </div>

      {/* Date controls */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          onClick={handlePrev}
          className="border-border h-9 w-9"
          title="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Input
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => handleDateChange(e.target.value)}
          className="w-44"
        />

        <Button
          variant="outline"
          size="icon"
          onClick={handleNext}
          disabled={isToday}
          className="border-border h-9 w-9"
          title="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          onClick={() => fetchLog(date)}
          disabled={isLoading || !date}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading…
            </>
          ) : (
            'View Tests'
          )}
        </Button>

        {!isToday && (
          <Button
            variant="ghost"
            onClick={() => handleDateChange(todayISO())}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Go to Today
          </Button>
        )}
      </div>

      {/* Results */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && result && (
        <TestLogTable result={result} date={date} showAddButton />
      )}

      {!isLoading && !result && hasFetched && (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <p className="text-muted-foreground">No data for this date.</p>
        </div>
      )}

      {!isLoading && !hasFetched && (
        <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <p className="text-muted-foreground text-sm">
            Select a date and click <span className="font-medium text-foreground">View Tests</span> to load the log.
          </p>
        </div>
      )}
    </div>
  )
}
