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
    // Fetch patient + dropdown data in one parallel batch
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

  // No patient pre-selected — fetch patient list + dropdown data in parallel
  const [patientsRes, doctorsRes, pmRes] = await Promise.all([
    getPatients({ limit: 100 }),
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
    <div className="space-y-6">
      <Link
        href="/opd/visits"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Visits
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground">Record New Visit</h1>
        <p className="mt-1 text-sm text-muted-foreground">Log a new OPD consultation</p>
      </div>

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
