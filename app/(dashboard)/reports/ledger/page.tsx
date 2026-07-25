import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  AlertTriangle,
  Stethoscope,
  Users,
  TrendingDown,
  Banknote,
  Clock,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { requireAuth } from '@/lib/auth'
import { getDailyLedger } from '@/app/actions/ledger'
import { DatePickerNav } from '@/components/reports/date-picker-nav'
import { LedgerSkeleton } from '@/components/reports/ledger-skeleton'
import { formatCurrencyPaisas, getTodayPKT, formatDate } from '@/lib/utils'

// =============================================================================
// Metadata
// =============================================================================

export const metadata: Metadata = {
  title: 'Daily Cash Ledger — ClinicPulse',
}

export const dynamic = 'force-dynamic'

// =============================================================================
// Helpers
// =============================================================================

function offsetDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]!
}

function staffTypeLabel(t: string): string {
  switch (t) {
    case 'full_time':
      return 'Full Time'
    case 'part_time':
      return 'Part Time'
    case 'shift_based':
      return 'Shift Based'
    default:
      return t
  }
}

function doctorInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

// =============================================================================
// Streamed content
//
// The ledger aggregation used to block the whole page (header + date nav
// included). It now resolves inside its own Suspense boundary so the
// navigation paints immediately.
// =============================================================================

async function LedgerContent({ selectedDate }: { selectedDate: string }) {
  const result = await getDailyLedger(selectedDate)

  return (
    <>
        {/* ── Error banner ─────────────────────────────────────────────── */}
        {!result.success && (
          <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{result.error}</p>
          </div>
        )}

        {result.success && (
          <>
            {/* ── Summary stat row ─────────────────────────────────────── */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Total visits */}
              <Card className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">Total Visits</p>
                    <div className="rounded-lg p-1.5 bg-info/10">
                      <Users className="h-3.5 w-3.5 text-info" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground">{result.data.total_visits}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {result.data.doctor_entries.filter((e) => e.visits_total > 0).length} doctor
                    {result.data.doctor_entries.filter((e) => e.visits_total > 0).length !== 1
                      ? 's'
                      : ''}{' '}
                    active
                  </p>
                </CardContent>
              </Card>

              {/* Gross fee */}
              <Card className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">Gross OPD Fee</p>
                    <div className="rounded-lg p-1.5 bg-primary/10">
                      <Banknote className="h-3.5 w-3.5 text-primary" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrencyPaisas(result.data.total_gross_fee_paisas)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">all visits</p>
                </CardContent>
              </Card>

              {/* Collected */}
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">Collected (Paid)</p>
                    <div className="rounded-lg p-1.5 bg-success/10">
                      <TrendingDown className="h-3.5 w-3.5 text-success" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-success">
                    {formatCurrencyPaisas(result.data.total_collected_paisas)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">cash in hand</p>
                </CardContent>
              </Card>

              {/* Due */}
              <Card className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">Due / Pending</p>
                    <div className="rounded-lg p-1.5 bg-warning/10">
                      <Clock className="h-3.5 w-3.5 text-warning" />
                    </div>
                  </div>
                  <p className="text-xl font-bold text-warning">
                    {formatCurrencyPaisas(result.data.total_due_paisas)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">unpaid fees</p>
                </CardContent>
              </Card>
            </div>

            {/* ── Doctor Cash Ledger ────────────────────────────────────── */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {/* Section header */}
              <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  OPD Cash — Per Doctor
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatDate(selectedDate, 'dd MMM yyyy')}
                </span>
              </div>

              {/* Column headers */}
              <div className="hidden border-b border-border/50 sm:grid sm:grid-cols-[1fr_64px_120px_120px_120px_130px] items-center gap-x-3 px-4 py-1.5">
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                  Doctor
                </span>
                <span className="text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                  Visits
                </span>
                <span className="text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                  Gross Fee
                </span>
                <span className="text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                  Collected
                </span>
                <span className="text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                  Due
                </span>
                <span className="text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                  Commission
                </span>
              </div>

              {/* Doctor rows */}
              <div className="divide-y divide-border/50">
                {result.data.doctor_entries.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No doctor records found.
                  </div>
                ) : (
                  result.data.doctor_entries.map((d) => {
                    const initials = doctorInitials(d.doctor_name)
                    const isCommission = d.earning_model === 'commission'
                    const hasActivity = d.visits_total > 0

                    return (
                      <div
                        key={d.doctor_id}
                        className={`grid grid-cols-[1fr_auto] gap-x-3 px-4 py-3 transition-colors hover:bg-muted/20 sm:grid-cols-[1fr_64px_120px_120px_120px_130px] sm:items-center ${
                          !hasActivity ? 'opacity-50' : ''
                        }`}
                      >
                        {/* Doctor identity */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {initials || <Stethoscope className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-foreground">
                              Dr. {d.doctor_name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {d.specialization && (
                                <span className="text-[11px] text-muted-foreground truncate">
                                  {d.specialization}
                                </span>
                              )}
                              <Badge
                                variant="secondary"
                                className={
                                  isCommission
                                    ? 'h-4 px-1 text-[9px] bg-success/10 text-success border-success/20'
                                    : 'h-4 px-1 text-[9px] bg-info/10 text-info border-info/20'
                                }
                              >
                                {isCommission
                                  ? `${d.commission_pct ?? 0}% comm`
                                  : 'Salaried'}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {/* Mobile: condensed stats block */}
                        <div className="flex flex-col items-end gap-0.5 sm:contents">
                          {/* Visits */}
                          <span className="text-right text-[13px] font-semibold tabular-nums text-foreground sm:col-start-2">
                            {d.visits_total}
                            <span className="sm:hidden text-[11px] font-normal text-muted-foreground ml-1">
                              visits
                            </span>
                          </span>

                          {/* Gross fee — desktop only */}
                          <span className="hidden text-right text-[12px] tabular-nums text-muted-foreground sm:block">
                            {formatCurrencyPaisas(d.gross_fee_paisas)}
                          </span>

                          {/* Collected (paid + partial received) */}
                          <div className="text-right sm:contents">
                            <span className="text-[13px] font-semibold tabular-nums text-success sm:text-[12px]">
                              {formatCurrencyPaisas(d.collected_paisas + d.partial_paid_paisas)}
                              <span className="sm:hidden text-[11px] font-normal text-muted-foreground ml-1">
                                collected
                              </span>
                            </span>
                            {d.partial_paid_paisas > 0 && (
                              <span className="block text-[10px] text-warning/80 sm:hidden">
                                incl. {formatCurrencyPaisas(d.partial_paid_paisas)} partial
                              </span>
                            )}
                          </div>

                          {/* Due — desktop only (pure due + partial remainder) */}
                          <span className="hidden text-right text-[12px] tabular-nums text-warning sm:block">
                            {(() => {
                              const partialRemainder = Math.max(0, d.gross_fee_paisas - d.collected_paisas - d.due_paisas - d.partial_paid_paisas)
                              const totalDue = d.due_paisas + partialRemainder
                              return totalDue > 0 ? formatCurrencyPaisas(totalDue) : '—'
                            })()}
                          </span>

                          {/* Commission */}
                          <span className="text-right text-[13px] font-semibold tabular-nums text-primary sm:text-[12px]">
                            {isCommission
                              ? formatCurrencyPaisas(d.commission_earned_paisas)
                              : '—'}
                            <span className="sm:hidden text-[11px] font-normal text-muted-foreground ml-1">
                              {isCommission ? 'comm' : ''}
                            </span>
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Footer totals */}
              {result.data.doctor_entries.length > 0 && (
                <div className="hidden border-t border-border bg-muted/20 sm:grid sm:grid-cols-[1fr_64px_120px_120px_120px_130px] items-center gap-x-3 px-4 py-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">Total</span>
                  <span className="text-right text-[12px] font-bold tabular-nums text-foreground">
                    {result.data.total_visits}
                  </span>
                  <span className="text-right text-[12px] font-bold tabular-nums text-foreground">
                    {formatCurrencyPaisas(result.data.total_gross_fee_paisas)}
                  </span>
                  <span className="text-right text-[12px] font-bold tabular-nums text-success">
                    {formatCurrencyPaisas(result.data.total_collected_paisas)}
                  </span>
                  <span className="text-right text-[12px] font-bold tabular-nums text-warning">
                    {result.data.total_due_paisas > 0
                      ? formatCurrencyPaisas(result.data.total_due_paisas)
                      : '—'}
                  </span>
                  <span className="text-right text-[12px] font-bold tabular-nums text-primary">
                    {formatCurrencyPaisas(result.data.total_commission_paisas)}
                  </span>
                </div>
              )}
            </div>

            {/* ── Staff Section (stub) ──────────────────────────────────── */}
            <div className="overflow-hidden rounded-xl border border-border bg-card">
              <div className="border-b border-border bg-muted/20 px-4 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Staff Cash Ledger
                </span>
              </div>

              {/* Coming-soon notice */}
              <div className="flex items-start gap-3 border-b border-border/50 bg-warning/5 px-4 py-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <p className="text-sm text-muted-foreground">
                  Staff cash ledger requires per-transaction staff assignment — coming soon.
                  Showing staff roster with monthly salary for reference.
                </p>
              </div>

              {/* Staff column headers */}
              {result.data.staff_entries.length > 0 && (
                <div className="hidden border-b border-border/50 sm:grid sm:grid-cols-[1fr_120px_160px] items-center gap-x-3 px-4 py-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                    Staff Member
                  </span>
                  <span className="text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                    Type
                  </span>
                  <span className="text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                    Monthly Salary
                  </span>
                </div>
              )}

              {/* Staff rows */}
              <div className="divide-y divide-border/50">
                {result.data.staff_entries.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No active staff records found.
                  </div>
                ) : (
                  result.data.staff_entries.map((s) => {
                    const initials = s.name
                      .split(' ')
                      .slice(0, 2)
                      .map((n: string) => n[0]?.toUpperCase() ?? '')
                      .join('')

                    return (
                      <div
                        key={s.staff_id}
                        className="grid grid-cols-[1fr_auto] items-center gap-x-3 px-4 py-2.5 transition-colors hover:bg-muted/20 sm:grid-cols-[1fr_120px_160px]"
                      >
                        {/* Staff identity */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                            {initials || <Users className="h-3.5 w-3.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[13px] font-medium text-foreground">
                              {s.name}
                            </p>
                            {s.department && (
                              <p className="text-[11px] text-muted-foreground">{s.department}</p>
                            )}
                          </div>
                        </div>

                        {/* Type */}
                        <span className="text-right text-[11px] text-muted-foreground sm:text-left">
                          {staffTypeLabel(s.staff_type)}
                        </span>

                        {/* Salary — desktop only */}
                        <span className="hidden text-right text-[12px] tabular-nums text-muted-foreground sm:block">
                          {formatCurrencyPaisas(s.monthly_salary)}
                          <span className="ml-1 text-[10px] text-muted-foreground/60">/mo</span>
                        </span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </>
        )}

        {/* Empty state if no data at all */}
        {!result.success && (
          <Card className="border-border bg-card">
            <CardContent className="py-12 text-center">
              <p className="text-sm text-muted-foreground">
                No ledger data available for this date.
              </p>
            </CardContent>
          </Card>
        )}
    </>
  )
}

// =============================================================================
// Page
// =============================================================================

interface PageProps {
  searchParams: Promise<{ date?: string }>
}

export default async function DailyLedgerPage({ searchParams }: PageProps) {
  await requireAuth()

  const params = await searchParams
  const today = getTodayPKT()

  const dateParam = params.date ?? today
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
  const selectedDate = isValidDate ? dateParam : today

  const prevDate = offsetDate(selectedDate, -1)
  const nextDate = offsetDate(selectedDate, +1)
  const isToday = selectedDate === today

  return (
      <div className="space-y-6 p-6">
        {/* ── Page header ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Daily Cash Ledger
              </h1>
              <p className="text-sm text-muted-foreground">
                OPD cash collections per doctor — collected, due &amp; commission
              </p>
            </div>
          </div>
        </div>

        {/* ── Date navigation ───────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <Link
            href={`/reports/ledger?date=${prevDate}`}
            className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
            aria-label="Previous day"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>

          <DatePickerNav selectedDate={selectedDate} isToday={isToday} basePath="/reports/ledger" />

          <Link
            href={`/reports/ledger?date=${nextDate}`}
            className="rounded-lg border border-border bg-card p-2 text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
            aria-label="Next day"
            aria-disabled={isToday}
            tabIndex={isToday ? -1 : undefined}
          >
            <ChevronRight className={`h-4 w-4 ${isToday ? 'opacity-30' : ''}`} />
          </Link>

          {!isToday && (
            <Link
              href="/reports/ledger"
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
            >
              Today
            </Link>
          )}
        </div>

        {/* ── Ledger content (streams behind Suspense) ──────────────────── */}
        <Suspense key={selectedDate} fallback={<LedgerSkeleton />}>
          <LedgerContent selectedDate={selectedDate} />
        </Suspense>
      </div>
  )
}
