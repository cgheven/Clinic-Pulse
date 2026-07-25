'use client'

import { useState, useEffect, useRef } from 'react'
import { DollarSign, TrendingUp, Calendar, Loader2, AlertCircle } from 'lucide-react'
import { cn, formatCurrencyPaisas, formatBasisPoints } from '@/lib/utils'
import { getDoctorEarnings } from '@/app/actions/opd'
import type { DoctorEarningsResult } from '@/app/actions/opd'

interface DoctorEarningsProps {
  doctorId: string
  /** Initial month in 'YYYY-MM' format. Defaults to current month. */
  initialMonth?: string
  /** Server-fetched earnings for `initialMonth`, to skip the first client round-trip. */
  initialData?: DoctorEarningsResult | null
  className?: string
}

function currentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(ym: string): string {
  const [year, month] = ym.split('-')
  const d = new Date(parseInt(year!), parseInt(month!) - 1, 1)
  return d.toLocaleDateString('en-PK', { month: 'long', year: 'numeric' })
}

export function DoctorEarnings({ doctorId, initialMonth, initialData, className }: DoctorEarningsProps) {
  const [month, setMonth] = useState(initialMonth ?? currentYearMonth())
  const [earnings, setEarnings] = useState<DoctorEarningsResult | null>(initialData ?? null)
  const [loading, setLoading] = useState(!initialData)
  const [error, setError] = useState<string | null>(null)
  // When the server already supplied data for `initialMonth`, skip the very first
  // effect run. Month switching keeps fetching client-side exactly as before.
  const skipInitialFetch = useRef(Boolean(initialData))

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false
      return
    }

    setLoading(true)
    setError(null)

    getDoctorEarnings(doctorId, month).then((res) => {
      if (res.success) {
        setEarnings(res.data)
      } else {
        setError(res.error)
      }
      setLoading(false)
    })
  }, [doctorId, month])

  return (
    <div className={cn('rounded-xl border border-border bg-card p-5', className)}>
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <DollarSign className="h-4 w-4 text-primary" />
          Earnings
        </h3>

        <div className="flex items-center gap-1">
          <select
            value={month.split('-')[1]}
            onChange={(e) => setMonth(`${month.split('-')[0]}-${e.target.value}`)}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
          >
            {Array.from({ length: 12 }, (_, i) => {
              const m = String(i + 1).padStart(2, '0')
              const label = new Date(2000, i, 1).toLocaleDateString('en-PK', { month: 'short' })
              return <option key={m} value={m}>{label}</option>
            })}
          </select>
          <select
            value={month.split('-')[0]}
            onChange={(e) => setMonth(`${e.target.value}-${month.split('-')[1]}`)}
            className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
          >
            {Array.from({ length: 5 }, (_, i) => {
              const year = new Date().getFullYear() - 2 + i
              return <option key={year} value={year}>{year}</option>
            })}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : earnings ? (
        <div className="space-y-4">
          {/* Month label */}
          <p className="text-xs text-muted-foreground">{monthLabel(month)}</p>

          {/* Earning model badge */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                earnings.earning_model === 'salaried'
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'bg-amber-500/10 text-amber-400'
              )}
            >
              {earnings.earning_model === 'salaried' ? 'Salaried' : 'Commission-based'}
            </span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              label="Total Visits"
              value={String(earnings.total_visits)}
              icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
            />
            <StatCard
              label="Days Worked"
              value={`${earnings.days_worked} / ${earnings.working_days_in_month}`}
              icon={<Calendar className="h-3.5 w-3.5 text-muted-foreground" />}
            />
            <StatCard
              label="Total Revenue"
              value={formatCurrencyPaisas(earnings.total_revenue)}
              icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
            />
            {earnings.earning_model === 'commission' && earnings.commission_pct !== null && (
              <StatCard
                label="Commission Rate"
                value={formatBasisPoints(earnings.commission_pct)}
                icon={<DollarSign className="h-3.5 w-3.5 text-primary" />}
              />
            )}
          </div>

          {/* Earning breakdown */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground mb-1">
              {earnings.earning_model === 'salaried' ? 'Pro-rated Salary' : 'Commission Earned'}
            </p>
            <p className="text-2xl font-bold text-primary">
              {formatCurrencyPaisas(earnings.gross_earnings)}
            </p>

            {earnings.earning_model === 'salaried' && earnings.doctor.monthly_salary && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Formula: {formatCurrencyPaisas(earnings.doctor.monthly_salary)} ÷{' '}
                {earnings.working_days_in_month} days × {earnings.days_worked} days worked
              </p>
            )}

            {earnings.earning_model === 'commission' && earnings.commission_pct !== null && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Formula: {formatCurrencyPaisas(earnings.total_revenue)} ×{' '}
                {formatBasisPoints(earnings.commission_pct)}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
        {icon}
        {label}
      </div>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}
