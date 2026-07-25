import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Phone,
  Mail,
  AlertCircle,
  TrendingUp,
  Activity,
  CalendarDays,
  DollarSign,
} from 'lucide-react'
import { getDoctor, getDoctorEarnings } from '@/app/actions/opd'
import { DoctorEarnings } from '@/components/opd/doctor-earnings'
import { formatCurrencyPaisas, formatBasisPoints, cn, formatDoctorName } from '@/lib/utils'

interface DoctorDetailPageProps {
  params: Promise<{ id: string }>
}

async function DoctorDetailContent({ id }: { id: string }) {
  // Same PKT "current month" the earnings card would have computed client-side.
  const month = new Date()
    .toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
    .slice(0, 7)

  const [result, earningsResult] = await Promise.all([
    getDoctor(id),
    getDoctorEarnings(id, month),
  ])

  if (!result.success) {
    if (result.error === 'Doctor not found') notFound()
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5">
        <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    )
  }

  const doctor = result.data
  const initials = doctor.name
    .split(' ')
    .slice(0, 2)
    .map((n: string) => n[0]?.toUpperCase())
    .join('')

  return (
    <div className="space-y-4">
      {/* ── Profile card ─────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {/* Main info row */}
        <div className="flex items-start gap-3 p-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {initials}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-base font-bold text-foreground">{formatDoctorName(doctor.name)}</h2>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                  doctor.earning_model === 'salaried'
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'bg-emerald-500/10 text-emerald-400'
                )}
              >
                {doctor.earning_model}
              </span>
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-medium',
                  doctor.is_active
                    ? 'bg-emerald-500/10 text-emerald-500'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {doctor.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted-foreground">
              {doctor.specialization && <span>{doctor.specialization}</span>}
              {doctor.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3 shrink-0" />
                  {doctor.phone}
                </span>
              )}
              {doctor.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3 shrink-0" />
                  {doctor.email}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick stats strip */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-border/70 bg-muted/20 px-4 py-2">
          <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{doctor.visits_this_month}</span>
            {' '}visits this month
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            Revenue:{' '}
            <span className="ml-1 font-medium text-foreground">
              {formatCurrencyPaisas(doctor.revenue_this_month)}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <DollarSign className="h-3.5 w-3.5" />
            {doctor.earning_model === 'salaried' ? 'Salary' : 'Commission'}:{' '}
            <span className="ml-1 font-medium text-foreground">
              {doctor.earning_model === 'salaried' && doctor.monthly_salary
                ? formatCurrencyPaisas(doctor.monthly_salary)
                : doctor.commission_pct !== null
                ? `${formatBasisPoints(doctor.commission_pct)}`
                : '—'}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            Est. earnings:{' '}
            <span className="ml-1 font-medium text-primary">
              {formatCurrencyPaisas(doctor.earnings_this_month)}
            </span>
          </span>
        </div>
      </div>

      {/* ── Earnings calculator ───────────────────────────────────────────── */}
      <DoctorEarnings
        doctorId={doctor.id}
        initialMonth={month}
        initialData={earningsResult.success ? earningsResult.data : null}
      />
    </div>
  )
}

export default async function DoctorDetailPage({ params }: DoctorDetailPageProps) {
  const { id } = await params

  return (
    <div className="space-y-4">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href="/opd/doctors"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Doctor Profile</h1>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-xl border border-border bg-card" />
            <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
          </div>
        }
      >
        <DoctorDetailContent id={id} />
      </Suspense>
    </div>
  )
}
