import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Scan, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { requireAuth } from '@/lib/auth'
import { getPartnerPayoutReport } from '@/app/actions/reports'
import { ReportsTabNav } from '@/components/reports/reports-tab-nav'
import { PartnerPayoutTable } from '@/components/reports/partner-payout-table'
import { PdfGenerator } from '@/components/reports/pdf-generator'
import { format } from 'date-fns'

// =============================================================================
// Metadata
// =============================================================================

export const metadata: Metadata = {
  title: 'Partner Payout Report — ClinicPulse',
}

export const dynamic = 'force-dynamic'

// =============================================================================
// Helpers
// =============================================================================

function getCurrentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function offsetMonth(ym: string, delta: number): string {
  const [year, month] = ym.split('-').map(Number)
  const d = new Date(year!, month! - 1, 1)
  d.setMonth(d.getMonth() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(ym: string): string {
  const [year, month] = ym.split('-').map(Number)
  const d = new Date(year!, month! - 1, 1)
  return format(d, 'MMMM yyyy')
}

// =============================================================================
// Page
// =============================================================================

interface PageProps {
  searchParams: Promise<{ month?: string }>
}

export default async function PartnerPayoutsPage({ searchParams }: PageProps) {
  await requireAuth()

  const params = await searchParams
  const currentMonth = getCurrentYearMonth()

  const monthParam = params.month ?? currentMonth
  const isValidMonth = /^\d{4}-\d{2}$/.test(monthParam)
  const selectedMonth = isValidMonth ? monthParam : currentMonth

  const prevMonth = offsetMonth(selectedMonth, -1)
  const nextMonth = offsetMonth(selectedMonth, +1)
  const isCurrent = selectedMonth === currentMonth

  const result = await getPartnerPayoutReport(selectedMonth)

  return (
    <div className="space-y-0">
      {/* ── Tab navigation ──────────────────────────────────────────────────── */}
      <ReportsTabNav />

      <div className="space-y-6 p-6">
        {/* ── Page header ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Scan className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                X-Ray Partner Payout Report
              </h1>
              <p className="text-sm text-muted-foreground">
                Revenue split and payout amounts for all X-Ray partners
              </p>
            </div>
          </div>

          {result.success && (
            <PdfGenerator
              report={{ type: 'partners', data: result.data }}
              fileName={`partner-payouts-${selectedMonth}`}
            />
          )}
        </div>

        {/* ── Month navigation ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <Link
            href={`/reports/partners?month=${prevMonth}`}
            className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>

          <div className="flex flex-1 items-center justify-center gap-3">
            <span className="text-sm font-semibold text-foreground">
              {formatMonthLabel(selectedMonth)}
            </span>
            {isCurrent && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                Current
              </span>
            )}
          </div>

          <Link
            href={`/reports/partners?month=${nextMonth}`}
            className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
            aria-label="Next month"
            aria-disabled={isCurrent}
            tabIndex={isCurrent ? -1 : undefined}
          >
            <ChevronRight className={`h-4 w-4 ${isCurrent ? 'opacity-30' : ''}`} />
          </Link>

          {!isCurrent && (
            <Link
              href="/reports/partners"
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
            >
              This Month
            </Link>
          )}
        </div>

        {/* ── Error banner ────────────────────────────────────────────────── */}
        {!result.success && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{result.error}</p>
          </div>
        )}

        {/* ── Report content ──────────────────────────────────────────────── */}
        {result.success ? (
          <PartnerPayoutTable data={result.data} />
        ) : (
          <Card className="border-border bg-card">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No partner payout data available for this period.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
