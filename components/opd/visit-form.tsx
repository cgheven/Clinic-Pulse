'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, User, Stethoscope, Banknote, Loader2, Plus } from 'lucide-react'
import { getTodayPKT } from '@/lib/utils'
import { recordVisit, getActivePaymentMethods, getActiveDoctors } from '@/app/actions/opd'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CpDoctor, CpPatient } from '@/types/index'

interface VisitFormProps {
  // Pre-selected patient (when navigating from patient detail page)
  patient?: Pick<CpPatient, 'id' | 'name' | 'patient_no'>
  // Available patients to select (when no pre-selected patient)
  patients?: Pick<CpPatient, 'id' | 'name' | 'patient_no' | 'phone'>[]
  onSuccess?: (visitId: string) => void
}

export function VisitForm({ patient, patients, onSuccess }: VisitFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [doctors, setDoctors] = useState<CpDoctor[]>([])
  const [paymentMethods, setPaymentMethods] = useState<Array<{ method: string; label: string }>>([])
  const [loadingDeps, setLoadingDeps] = useState(true)

  // Form fields
  const [patientId, setPatientId] = useState(patient?.id ?? '')
  const [doctorId, setDoctorId] = useState('')
  const [visitDate, setVisitDate] = useState(getTodayPKT())
  const [diagnosis, setDiagnosis] = useState('')
  const [prescription, setPrescription] = useState('')
  const [fee, setFee] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function loadDeps() {
      const [docRes, pmRes] = await Promise.all([getActiveDoctors(), getActivePaymentMethods()])
      if (docRes.success) setDoctors(docRes.data as unknown as CpDoctor[])
      if (pmRes.success) setPaymentMethods(pmRes.data)
      setLoadingDeps(false)
    }
    void loadDeps()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!patientId) {
      setError('Please select a patient')
      return
    }
    if (!fee || parseFloat(fee) < 0) {
      setError('Please enter a valid consultation fee')
      return
    }
    if (!paymentMethod) {
      setError('Please select a payment method')
      return
    }

    const feePaisas = Math.round(parseFloat(fee) * 100)

    startTransition(async () => {
      const result = await recordVisit({
        patient_id: patientId,
        doctor_id: doctorId && doctorId !== 'none' ? doctorId : null,
        visit_date: visitDate,
        fee_paisas: feePaisas,
        payment_method: paymentMethod,
        diagnosis: diagnosis || null,
        prescription: prescription || null,
        notes: notes || null,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      if (onSuccess) {
        onSuccess(result.data.id)
      } else {
        router.push('/opd/visits')
        router.refresh()
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Patient */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <User className="h-4 w-4 text-primary" />
          Patient
        </h3>

        {patient ? (
          <div className="rounded-lg border border-border bg-background/50 p-3">
            <p className="text-sm font-medium text-foreground">{patient.name}</p>
            <p className="text-xs text-muted-foreground">{patient.patient_no}</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="patient_id">Select Patient *</Label>
            {loadingDeps ? (
              <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : (
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger id="patient_id">
                  <SelectValue placeholder="Search and select patient..." />
                </SelectTrigger>
                <SelectContent>
                  {(patients ?? []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — {p.patient_no}
                      {p.phone ? ` (${p.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </div>

      {/* Doctor & Date */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Stethoscope className="h-4 w-4 text-primary" />
          Doctor & Date
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="doctor_id">Doctor</Label>
            {loadingDeps ? (
              <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger id="doctor_id">
                  <SelectValue placeholder="Select doctor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— No doctor —</SelectItem>
                  {doctors.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                      {d.specialization ? ` (${d.specialization})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="visit_date">Visit Date *</Label>
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                id="visit_date"
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* Clinical Notes */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Clinical Notes</h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Textarea
              id="diagnosis"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              placeholder="Clinical diagnosis..."
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="prescription">Prescription</Label>
            <Textarea
              id="prescription"
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              placeholder="Prescribed medications and instructions..."
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* Payment */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Banknote className="h-4 w-4 text-primary" />
          Payment
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fee">Consultation Fee (PKR) *</Label>
            <Input
              id="fee"
              type="number"
              min="0"
              step="1"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              placeholder="500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment_method">Payment Method *</Label>
            {loadingDeps ? (
              <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment_method">
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.method} value={pm.method}>
                      {pm.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending || loadingDeps}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Recording...
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Record Visit
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
