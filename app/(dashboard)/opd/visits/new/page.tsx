import { Suspense } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { getPatients, getPatient, getActiveDoctors, getActivePaymentMethods } from '@/app/actions/opd'
import { VisitForm } from '@/components/opd/visit-form'
import type { CpDoctor } from '@/types/index'

export const metadata = {
  title: 'Record Visit — OPD — ClinicPulse',
}

interface NewVisitPageProps {
  searchParams: Promise<{ patient_id?: string }>
}

async function NewVisitForm({ patientId }: { patientId?: string }) {
  if (patientId) {
    const [patientRes, doctorsRes, pmRes] = await Promise.all([
      getPatient(patientId),
      getActiveDoctors(),
      getActivePaymentMethods(),
    ])

    const doctors = doctorsRes.success ? (doctorsRes.data as unknown as CpDoctor[]) : []
    const paymentMethods = pmRes.success ? pmRes.data : []

    if (patientRes.success) {
      const patient = patientRes.data
      return (
        <VisitForm
          patient={{ id: patient.id, name: patient.name, patient_no: patient.patient_no ?? 0 }}
          initialDoctors={doctors}
          initialPaymentMethods={paymentMethods}
        />
      )
    }
  }

  const [patientsRes, doctorsRes, pmRes] = await Promise.all([
    getPatients({ limit: 500 }),
    getActiveDoctors(),
    getActivePaymentMethods(),
  ])

  const patients = patientsRes.success ? patientsRes.data.data : []
  const doctors = doctorsRes.success ? (doctorsRes.data as unknown as CpDoctor[]) : []
  const paymentMethods = pmRes.success ? pmRes.data : []

  return (
    <VisitForm
      patients={patients.map((p) => ({
        id: p.id,
        name: p.name,
        patient_no: p.patient_no ?? 0,
        phone: p.phone,
      }))}
      initialDoctors={doctors}
      initialPaymentMethods={paymentMethods}
    />
  )
}

export default async function NewVisitPage({ searchParams }: NewVisitPageProps) {
  const params = await searchParams
  const patientId = params.patient_id

  return (
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <Link
          href="/opd/visits"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Record Visit</h1>
      </div>

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <div className="max-w-2xl">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          }
        >
          <NewVisitForm patientId={patientId} />
        </Suspense>
      </div>
    </div>
  )
}
