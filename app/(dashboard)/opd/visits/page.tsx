import { Suspense } from 'react'
import Link from 'next/link'
import {
  Plus,
  CalendarDays,
  TrendingUp,
  AlertCircle,
  Users,
  Filter,
  AlertTriangle,
  Receipt,
} from 'lucide-react'
import { getDailyVisits, getDoctors } from '@/app/actions/opd'
import { formatCurrencyPaisas, formatDate, getTodayPKT, cn, formatDoctorName } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'Visits — OPD — ClinicPulse',
}

function formatPaymentMethod(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Cash',
    jazzcash: 'JazzCash',
    easypaisa: 'Easypaisa',
    bank_transfer: 'Bank Transfer',
  }
  return labels[method] ?? method
}

// =============================================================================
// StatChip
// =============================================================================

function StatChip({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ElementType
  label: string
  value: string
  color: string
  bg: string
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${bg}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
          {label}
        </p>
        <p className="text-sm font-bold tabular-nums text-foreground">{value}</p>
      </div>
    </div>
  )
}

// =============================================================================
// VisitLog (async content)
// =============================================================================

async function VisitLog({
  date,
  doctorFilter,
  duesOnly,
}: {
  date: string
  doctorFilter: string
  duesOnly: boolean
}) {
  const result = await getDailyVisits(date)

  if (!result.success) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    )
  }

  const { visits: allVisits, total_visits, total_revenue } = result.data

  let visits = doctorFilter
    ? allVisits.filter((v) => v.doctor?.id === doctorFilter)
    : allVisits

  if (duesOnly) {
    visits = visits.filter((v) => v.payment_status === 'due')
  }

  const uniquePatients = new Set(visits.map((v) => v.patient_id)).size
  const dueCount = allVisits.filter((v) => v.payment_status === 'due').length
  const dueAmount = allVisits
    .filter((v) => v.payment_status === 'due')
    .reduce((s, v) => s + v.fee_paisas, 0)

  return (
    <div className="space-y-4">
      {/* Stat chips */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatChip
          icon={CalendarDays}
          label="Total Visits"
          value={String(doctorFilter ? visits.length : total_visits)}
          color="text-blue-400"
          bg="bg-blue-400/10"
        />
        <StatChip
          icon={TrendingUp}
          label="Revenue"
          value={formatCurrencyPaisas(
            doctorFilter ? visits.reduce((s, v) => s + v.fee_paisas, 0) : total_revenue
          )}
          color="text-emerald-400"
          bg="bg-emerald-400/10"
        />
        <StatChip
          icon={Users}
          label="Patients"
          value={String(uniquePatients)}
          color="text-violet-400"
          bg="bg-violet-400/10"
        />
        <StatChip
          icon={AlertTriangle}
          label={`Dues (${dueCount})`}
          value={formatCurrencyPaisas(dueAmount)}
          color="text-amber-400"
          bg="bg-amber-400/10"
        />
      </div>

      {/* Visit panel table */}
      {visits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-14 text-center">
          <CalendarDays className="mx-auto mb-3 h-9 w-9 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">
            {duesOnly
              ? 'No due visits for this date'
              : `No visits recorded for ${formatDate(date)}`}
          </p>
          {!duesOnly && (
            <div className="mt-4">
              <Button asChild size="sm">
                <Link href="/opd/visits/new">
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Record Visit
                </Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Section header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {duesOnly ? 'Due Visits' : `Visits — ${formatDate(date)}`}
            </span>
            <span className="text-[11px] text-muted-foreground">{visits.length} records</span>
          </div>

          {/* Column headers */}
          <div className="flex items-center border-b border-border/50 px-4 py-1.5">
            <div className="w-[72px] shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Voucher
            </div>
            {/* Patient / Doctor / Diagnosis share the free space equally.
                Doctor was pinned at 130px, which truncated real names like
                "Dr Ayaz Sardar khan Chandio SB" while Patient (flex-1) took
                every spare pixel. */}
            <div className="min-w-0 flex-1 pr-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Patient
            </div>
            <div className="hidden min-w-0 flex-1 pr-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60 sm:block">
              Doctor
            </div>
            <div className="hidden min-w-0 flex-1 pr-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60 sm:block">
              Diagnosis
            </div>
            <div className="w-[88px] shrink-0 text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
              Fee
            </div>
            <div className="hidden w-[90px] shrink-0 pl-3 text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60 sm:block">
              Payment
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border/50">
            {visits.map((visit) => (
              <div
                key={visit.id}
                className={cn(
                  'flex items-center px-4 py-2.5 hover:bg-muted/20 transition-colors',
                  visit.payment_status === 'due' && 'bg-amber-500/[0.03]'
                )}
              >
                {/* Voucher */}
                <div className="w-[72px] shrink-0">
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {visit.voucher_no ? (
                      <span className="flex items-center gap-0.5">
                        <Receipt className="h-2.5 w-2.5" />#{visit.voucher_no}
                      </span>
                    ) : (
                      '—'
                    )}
                  </p>
                </div>

                {/* Patient */}
                <div className="min-w-0 flex-1 pr-3">
                  <Link
                    href={`/opd/patients/${visit.patient_id}`}
                    className="hover:text-primary transition-colors"
                  >
                    <p className="truncate text-[13px] font-medium text-foreground">
                      {visit.patient?.name ?? '—'}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      #{visit.patient?.patient_no}
                      {/* Doctor shown as sub-text on mobile */}
                      {visit.doctor && (
                        <span className="ml-1.5 sm:hidden">· {formatDoctorName(visit.doctor.name)}</span>
                      )}
                    </p>
                  </Link>
                </div>

                {/* Doctor (sm+) */}
                <div className="hidden min-w-0 flex-1 pr-3 sm:block">
                  {visit.doctor ? (
                    <Link
                      href={`/opd/doctors/${visit.doctor.id}`}
                      className="hover:text-primary transition-colors"
                    >
                      <p className="truncate text-[12px] text-muted-foreground">
                        {formatDoctorName(visit.doctor.name)}
                      </p>
                    </Link>
                  ) : (
                    <span className="text-[12px] text-muted-foreground/50">—</span>
                  )}
                </div>

                {/* Diagnosis (sm+) */}
                <div className="hidden min-w-0 flex-1 pr-3 sm:block">
                  <p className="truncate text-[12px] text-muted-foreground">
                    {visit.diagnosis ?? '—'}
                  </p>
                </div>

                {/* Fee */}
                <div className="w-[88px] shrink-0 text-right">
                  <p
                    className={cn(
                      'text-[13px] font-semibold tabular-nums',
                      visit.payment_status === 'due' ? 'text-amber-500' : 'text-foreground'
                    )}
                  >
                    {formatCurrencyPaisas(visit.fee_paisas)}
                  </p>
                </div>

                {/* Payment status (sm+) */}
                <div className="hidden w-[90px] shrink-0 pl-3 sm:block">
                  {visit.payment_status === 'due' ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-500">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Due
                    </span>
                  ) : (
                    <span className="text-[12px] text-muted-foreground">
                      {visit.payment_method ? formatPaymentMethod(visit.payment_method) : '—'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Doctor filter select options
// =============================================================================

async function DoctorFilterOptions() {
  const result = await getDoctors()
  if (!result.success) return null

  return (
    <>
      <option value="">All Doctors</option>
      {result.data.map((d) => (
        <option key={d.id} value={d.id}>
          {formatDoctorName(d.name)}
        </option>
      ))}
    </>
  )
}

// =============================================================================
// Page
// =============================================================================

interface VisitsPageProps {
  searchParams: Promise<{ date?: string; doctor?: string; dues?: string }>
}

export default async function VisitsPage({ searchParams }: VisitsPageProps) {
  const params = await searchParams
  const date = params.date ?? getTodayPKT()
  const doctorFilter = params.doctor ?? ''
  const duesOnly = params.dues === '1'
  const today = getTodayPKT()

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Daily Visit Log</h1>
        <Button asChild size="sm" className="shrink-0">
          <Link href="/opd/visits/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Record Visit
          </Link>
        </Button>
      </div>

      {/* Quick filter pills */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/opd/visits?date=${today}`}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors',
            date === today && !duesOnly
              ? 'border-primary/40 bg-primary/10 text-primary'
              : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-primary'
          )}
        >
          <CalendarDays className="h-3 w-3" />
          Today
        </Link>
        <Link
          href={`/opd/visits?date=${date}&dues=1`}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors',
            duesOnly
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
              : 'border-border bg-card text-muted-foreground hover:border-amber-500/30 hover:text-amber-500'
          )}
        >
          <AlertTriangle className="h-3 w-3" />
          Dues Only
        </Link>
      </div>

      {/* Filter form */}
      <form method="GET" action="/opd/visits" className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="date"
            name="date"
            defaultValue={date}
            style={{ colorScheme: 'dark' }}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
          <select
            name="doctor"
            defaultValue={doctorFilter}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
          >
            <Suspense fallback={<option>Loading...</option>}>
              <DoctorFilterOptions />
            </Suspense>
          </select>
        </div>

        <Button type="submit" variant="outline" size="sm">
          Apply
        </Button>
      </form>

      <Suspense
        key={`${date}-${doctorFilter}-${String(duesOnly)}`}
        fallback={
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[58px] animate-pulse rounded-xl border border-border bg-card"
                />
              ))}
            </div>
            <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
          </div>
        }
      >
        <VisitLog date={date} doctorFilter={doctorFilter} duesOnly={duesOnly} />
      </Suspense>
    </div>
  )
}
