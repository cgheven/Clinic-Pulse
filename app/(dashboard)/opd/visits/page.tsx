import { Suspense } from 'react'
import Link from 'next/link'
import {
  Plus,
  CalendarDays,
  Stethoscope,
  TrendingUp,
  AlertCircle,
  Clock,
  Users,
  Filter,
  AlertTriangle,
} from 'lucide-react'
import { getDailyVisits, getDoctors } from '@/app/actions/opd'
import { formatCurrencyPaisas, formatDate, getTodayPKT, cn } from '@/lib/utils'
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

async function VisitLog({
  date,
  doctorFilter,
}: {
  date: string
  doctorFilter: string
}) {
  const result = await getDailyVisits(date)

  if (!result.success) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <AlertCircle className="mx-auto mb-2 h-7 w-7 text-destructive" />
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    )
  }

  const { visits: allVisits, total_visits, total_revenue } = result.data

  const visits = doctorFilter
    ? allVisits.filter((v) => v.doctor?.id === doctorFilter)
    : allVisits

  const uniquePatients = new Set(visits.map((v) => v.patient_id)).size
  const dueCount = visits.filter((v) => v.payment_status === 'due').length
  const dueAmount = visits.filter((v) => v.payment_status === 'due').reduce((s, v) => s + v.fee_paisas, 0)

  return (
    <div className="space-y-4">
      {/* Summary Row */}
      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Total Visits"
          value={String(doctorFilter ? visits.length : total_visits)}
          icon={<CalendarDays className="h-4 w-4" />}
          color="text-primary"
          bg="bg-primary/10"
        />
        <SummaryCard
          label="Total Revenue"
          value={formatCurrencyPaisas(
            doctorFilter
              ? visits.reduce((s, v) => s + v.fee_paisas, 0)
              : total_revenue
          )}
          icon={<TrendingUp className="h-4 w-4" />}
          color="text-emerald-400"
          bg="bg-emerald-500/10"
        />
        <SummaryCard
          label="Unique Patients"
          value={String(uniquePatients)}
          icon={<Users className="h-4 w-4" />}
          color="text-amber-400"
          bg="bg-amber-500/10"
        />
        <SummaryCard
          label={`Dues (${dueCount} visit${dueCount !== 1 ? 's' : ''})`}
          value={formatCurrencyPaisas(dueAmount)}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="text-rose-400"
          bg="bg-rose-500/10"
        />
      </div>

      {/* Visit Table */}
      {visits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 py-16 text-center">
          <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">
            No visits recorded for {formatDate(date)}
          </p>
          <div className="mt-4">
            <Button asChild size="sm">
              <Link href="/opd/visits/new">
                <Plus className="mr-2 h-4 w-4" />
                Record Visit
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Voucher
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Patient
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Doctor
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Diagnosis
                  </th>
                  <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Fee
                  </th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Payment
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {visits.map((visit) => (
                  <tr
                    key={visit.id}
                    className={cn("hover:bg-muted/20 transition-colors", visit.payment_status === 'due' && "bg-amber-500/5")}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-mono text-muted-foreground">
                        {visit.voucher_no ? `#${visit.voucher_no}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/opd/patients/${visit.patient_id}`}
                        className="hover:text-primary transition-colors"
                      >
                        <p className="text-sm font-medium text-foreground">
                          {visit.patient?.name ?? '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          #{visit.patient?.patient_no}
                        </p>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {visit.doctor ? (
                        <Link
                          href={`/opd/doctors/${visit.doctor.id}`}
                          className="hover:text-primary transition-colors"
                        >
                          <p className="text-sm text-foreground">{visit.doctor.name}</p>
                          {visit.doctor.specialization && (
                            <p className="text-xs text-muted-foreground">{visit.doctor.specialization}</p>
                          )}
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="truncate text-sm text-muted-foreground">
                        {visit.diagnosis ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <p className={cn("text-sm font-semibold", visit.payment_status === 'due' ? "text-amber-500" : "text-primary")}>
                        {formatCurrencyPaisas(visit.fee_paisas)}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {visit.payment_status === 'due' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-500">
                          <AlertTriangle className="h-3 w-3" />
                          Due
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {visit.payment_method ? formatPaymentMethod(visit.payment_method) : '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  value,
  icon,
  color,
  bg,
}: {
  label: string
  value: string
  icon: React.ReactNode
  color: string
  bg: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${bg} ${color}`}>
        {icon}
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

async function DoctorFilterOptions() {
  const result = await getDoctors()
  if (!result.success) return null

  return (
    <>
      <option value="">All Doctors</option>
      {result.data.map((d) => (
        <option key={d.id} value={d.id}>
          Dr. {d.name}
        </option>
      ))}
    </>
  )
}

interface VisitsPageProps {
  searchParams: Promise<{ date?: string; doctor?: string }>
}

export default async function VisitsPage({ searchParams }: VisitsPageProps) {
  const params = await searchParams
  const date = params.date ?? getTodayPKT()
  const doctorFilter = params.doctor ?? ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Daily Visit Log</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All OPD visits for {formatDate(date)}
          </p>
        </div>
        <Button asChild>
          <Link href="/opd/visits/new">
            <Plus className="mr-2 h-4 w-4" />
            Record Visit
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <form method="GET" action="/opd/visits" className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            name="date"
            type="date"
            defaultValue={date}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <select
            name="doctor"
            defaultValue={doctorFilter}
            className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
          >
            <Suspense fallback={<option>Loading...</option>}>
              <DoctorFilterOptions />
            </Suspense>
          </select>
        </div>

        <Button type="submit" variant="outline" size="sm">
          Apply Filter
        </Button>
      </form>

      <Suspense
        key={`${date}-${doctorFilter}`}
        fallback={
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-card" />
              ))}
            </div>
            <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
          </div>
        }
      >
        <VisitLog date={date} doctorFilter={doctorFilter} />
      </Suspense>
    </div>
  )
}
