import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  Phone,
  MapPin,
  Calendar,
  Droplets,
  Stethoscope,
  AlertTriangle,
  FlaskConical,
  Activity,
} from 'lucide-react'
import { getPatient } from '@/app/actions/opd'
import { getPatientPendingLabTests } from '@/app/actions/lab'
import { PatientHistory } from '@/components/opd/patient-history'
import { BpLog } from '@/components/opd/bp-log'
import { DeletePatientButton } from '@/components/opd/delete-patient-button'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate, formatCurrencyPaisas, cn } from '@/lib/utils'

interface PatientDetailPageProps {
  params: Promise<{ id: string }>
}

const genderColor: Record<string, string> = {
  male: 'bg-blue-500/10 text-blue-400',
  female: 'bg-pink-500/10 text-pink-400',
  other: 'bg-purple-500/10 text-purple-400',
}

async function PatientDetailContent({ id }: { id: string }) {
  const [result, labResult] = await Promise.all([
    getPatient(id),
    getPatientPendingLabTests(id),
  ])

  if (!result.success) {
    if (result.error === 'Patient not found') notFound()
    return (
      <div className="flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5">
        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    )
  }

  const patient = result.data
  const dueVisits = patient.visits.filter((v) => v.payment_status === 'due')
  const totalDuesPaisas = dueVisits.reduce((s, v) => s + v.fee_paisas, 0)
  const pendingLabTests = labResult.success ? labResult.data : []
  const totalLabDuesPaisas = pendingLabTests.reduce((s, t) => s + t.price_paisas, 0)

  const initials = patient.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')

  const age = patient.date_of_birth
    ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()
    : null

  const lastVisit = patient.visits[0]?.visit_date ?? null

  return (
    <div className="space-y-4">
      {/* ── Patient profile card ──────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-start gap-3 p-4">
          {/* Avatar */}
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
            {initials}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="text-base font-bold text-foreground">{patient.name}</h2>
              {patient.gender && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-[11px] font-medium capitalize',
                    genderColor[patient.gender] ?? 'bg-muted text-muted-foreground'
                  )}
                >
                  {patient.gender}
                </span>
              )}
              {patient.blood_group && patient.blood_group !== 'unknown' && (
                <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-400">
                  <Droplets className="h-3 w-3" />
                  {patient.blood_group}
                </span>
              )}
            </div>

            {/* Meta row */}
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-muted-foreground">
              {patient.patient_no && <span>#{patient.patient_no}</span>}
              {patient.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3 shrink-0" />
                  {patient.phone}
                </span>
              )}
              {patient.date_of_birth && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 shrink-0" />
                  {age} yrs
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2">
            <DeletePatientButton patientId={patient.id} patientName={patient.name} />
            <Button asChild size="sm">
              <Link href={`/opd/visits/new?patient_id=${patient.id}`}>
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Visit
              </Link>
            </Button>
          </div>
        </div>

        {/* Quick stats strip */}
        <div className="flex items-center gap-4 border-t border-border/70 bg-muted/20 px-4 py-2">
          <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Activity className="h-3.5 w-3.5" />
            <span className="font-medium text-foreground">{patient.visits.length}</span> visits
          </span>
          {lastVisit && (
            <span className="text-[12px] text-muted-foreground">
              Last: <span className="font-medium text-foreground">{formatDate(lastVisit, 'dd MMM yyyy')}</span>
            </span>
          )}
          {patient.address && (
            <span className="hidden items-center gap-1 truncate text-[12px] text-muted-foreground sm:flex">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              {patient.address}
            </span>
          )}
        </div>

        {/* Address on mobile + Notes */}
        {(patient.address || patient.history) && (
          <div className="border-t border-border/70 px-4 py-2.5 space-y-1">
            {patient.address && (
              <p className="flex items-start gap-1.5 text-[12px] text-muted-foreground sm:hidden">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                {patient.address}
              </p>
            )}
            {patient.history && (
              <p className="text-[12px] text-muted-foreground">
                <span className="font-medium text-foreground/70">Notes: </span>
                {patient.history}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── OPD dues banner ───────────────────────────────────────────────── */}
      {totalDuesPaisas > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="text-[13px]">
            <span className="font-semibold text-amber-600">OPD dues: </span>
            <span className="text-amber-600">{formatCurrencyPaisas(totalDuesPaisas)}</span>
            <span className="ml-1.5 text-amber-500/70">
              ({dueVisits.length} visit{dueVisits.length !== 1 ? 's' : ''} unpaid)
            </span>
          </p>
        </div>
      )}

      {/* ── Lab pending banner ────────────────────────────────────────────── */}
      {totalLabDuesPaisas > 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5">
          <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
          <div className="flex-1">
            <p className="text-[13px]">
              <span className="font-semibold text-violet-600">Lab pending: </span>
              <span className="text-violet-600">{formatCurrencyPaisas(totalLabDuesPaisas)}</span>
              <span className="ml-1.5 text-violet-500/70">
                ({pendingLabTests.length} test{pendingLabTests.length !== 1 ? 's' : ''})
              </span>
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              {pendingLabTests.slice(0, 5).map((t) => (
                <span
                  key={t.id}
                  className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-medium text-violet-600"
                >
                  {t.test_name}
                </span>
              ))}
              {pendingLabTests.length > 5 && (
                <span className="text-[10px] text-violet-500/70">
                  +{pendingLabTests.length - 5} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Tabs defaultValue="history">
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs">
            <Stethoscope className="h-3.5 w-3.5" />
            Visits ({patient.visits.length})
          </TabsTrigger>
          <TabsTrigger value="bp" className="flex items-center gap-1.5 text-xs">
            <Droplets className="h-3.5 w-3.5" />
            BP Log ({patient.bp_logs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-3">
          <PatientHistory visits={patient.visits} />
        </TabsContent>

        <TabsContent value="bp" className="mt-3">
          <BpLog patientId={patient.id} logs={patient.bp_logs} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = await params

  return (
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href="/opd/patients"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Patient Profile</h1>
      </div>

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-xl border border-border bg-card" />
            <div className="h-64 animate-pulse rounded-xl border border-border bg-card" />
          </div>
        }
      >
        <PatientDetailContent id={id} />
      </Suspense>
    </div>
  )
}
