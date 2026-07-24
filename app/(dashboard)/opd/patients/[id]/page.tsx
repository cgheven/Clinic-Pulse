import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Plus,
  User,
  Phone,
  MapPin,
  Calendar,
  Droplets,
  FileText,
  Stethoscope,
  AlertTriangle,
} from 'lucide-react'
import { getPatient } from '@/app/actions/opd'
import { PatientHistory } from '@/components/opd/patient-history'
import { BpLog } from '@/components/opd/bp-log'
import { DeletePatientButton } from '@/components/opd/delete-patient-button'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatDate, formatCurrencyPaisas, cn } from '@/lib/utils'

interface PatientDetailPageProps {
  params: Promise<{ id: string }>
}

const genderLabel: Record<string, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
}

const genderColor: Record<string, string> = {
  male: 'bg-blue-500/10 text-blue-400',
  female: 'bg-pink-500/10 text-pink-400',
  other: 'bg-purple-500/10 text-purple-400',
}

async function PatientDetailContent({ id }: { id: string }) {
  const result = await getPatient(id)

  if (!result.success) {
    if (result.error === 'Patient not found') notFound()
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <p className="text-sm text-destructive">{result.error}</p>
      </div>
    )
  }

  const patient = result.data
  const dueVisits = patient.visits.filter((v) => v.payment_status === 'due')
  const totalDuesPaisas = dueVisits.reduce((s, v) => s + v.fee_paisas, 0)

  return (
    <div className="space-y-6">
      {/* Outstanding dues banner */}
      {totalDuesPaisas > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1 text-sm">
            <span className="font-semibold text-amber-600">Outstanding dues: </span>
            <span className="text-amber-600">{formatCurrencyPaisas(totalDuesPaisas)}</span>
            <span className="ml-1.5 text-amber-500/70">({dueVisits.length} visit{dueVisits.length !== 1 ? 's' : ''} unpaid)</span>
          </div>
        </div>
      )}

      {/* Patient Info Card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Avatar */}
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
              {patient.name
                .split(' ')
                .slice(0, 2)
                .map((n) => n[0]?.toUpperCase())
                .join('')}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-foreground">{patient.name}</h2>
                <span
                  className={cn(
                    'rounded-full px-2.5 py-0.5 text-xs font-medium',
                    genderColor[patient.gender ?? ''] ?? 'bg-muted text-muted-foreground'
                  )}
                >
                  {genderLabel[patient.gender ?? ''] ?? patient.gender}
                </span>
                {patient.blood_group && patient.blood_group !== 'unknown' && (
                  <span className="flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-400">
                    <Droplets className="h-3 w-3" />
                    {patient.blood_group}
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {patient.patient_no && (
                  <span className="font-medium text-foreground/70">{patient.patient_no}</span>
                )}
                {patient.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {patient.phone}
                  </span>
                )}
                {patient.date_of_birth && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(patient.date_of_birth)} ({new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} yrs)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <DeletePatientButton patientId={patient.id} patientName={patient.name} />
            <Button asChild size="sm">
              <Link href={`/opd/visits/new?patient_id=${patient.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                New Visit
              </Link>
            </Button>
          </div>
        </div>

        {/* Address */}
        {patient.address && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{patient.address}</span>
            </div>
          </div>
        )}

        {/* History / Notes */}
        {patient.history && (
          <div className="mt-3 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">Notes: </span>
            {patient.history}
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Stethoscope className="h-3.5 w-3.5" />
            Visits ({patient.visits.length})
          </TabsTrigger>
          <TabsTrigger value="bp" className="flex items-center gap-2">
            <Droplets className="h-3.5 w-3.5" />
            BP Log ({patient.bp_logs.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history">
          <PatientHistory visits={patient.visits} />
        </TabsContent>

        <TabsContent value="bp">
          <BpLog patientId={patient.id} logs={patient.bp_logs} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
        {label}
      </p>
      <p className="mt-0.5 text-sm text-foreground">{value}</p>
    </div>
  )
}

export default async function PatientDetailPage({ params }: PatientDetailPageProps) {
  const { id } = await params

  return (
    <div className="space-y-5">
      {/* Back */}
      <Link
        href="/opd/patients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Link>

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
            <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />
          </div>
        }
      >
        <PatientDetailContent id={id} />
      </Suspense>
    </div>
  )
}
