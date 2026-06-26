'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, User, Stethoscope, Banknote, ChevronDown, Loader2, Plus } from 'lucide-react'
import { cn, getTodayPKT } from '@/lib/utils'
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
import type { CpDoctor, CpPaymentMethod, CpPatient } from '@/types/index'

interface VisitFormProps {
  // Pre-selected patient (when navigating from patient detail page)
  patient?: Pick<CpPatient, 'id' | 'full_name' | 'patient_no'>
  // Available patients to select (when no pre-selected patient)
  patients?: Pick<CpPatient, 'id' | 'full_name' | 'patient_no' | 'phone'>[]
  onSuccess?: (visitId: string) => void
}

export function VisitForm({ patient, patients, onSuccess }: VisitFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [doctors, setDoctors] = useState<CpDoctor[]>([])
  const [paymentMethods, setPaymentMethods] = useState<CpPaymentMethod[]>([])
  const [loadingDeps, setLoadingDeps] = useState(true)

  // Form fields
  const [patientId, setPatientId] = useState(patient?.id ?? '')
  const [doctorId, setDoctorId] = useState('')
  const [visitDate, setVisitDate] = useState(getTodayPKT())
  const [chiefComplaint, setChiefComplaint] = useState('')
  const [diagnosis, setDiagnosis] = useState('')
  const [prescription, setPrescription] = useState('')
  const [fee, setFee] = useState('')
  const [discount, setDiscount] = useState('0')
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed'>('completed')
  const [followUpDate, setFollowUpDate] = useState('')
  const [isFollowUp, setIsFollowUp] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    async function loadDeps() {
      const [docRes, pmRes] = await Promise.all([getActiveDoctors(), getActivePaymentMethods()])
      if (docRes.success) setDoctors(docRes.data)
      if (pmRes.success) setPaymentMethods(pmRes.data)
      setLoadingDeps(false)
    }
    void loadDeps()
  }, [])

  const netFee = Math.max(0, (parseInt(fee) || 0) * 100 - (parseInt(discount) || 0) * 100)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!patientId) {
      setError('Please select a patient')
      return
    }
    if (!fee || parseInt(fee) < 0) {
      setError('Please enter a valid consultation fee')
      return
    }

    const feeInPaisas = Math.round(parseFloat(fee) * 100)
    const discountInPaisas = Math.round(parseFloat(discount || '0') * 100)

    startTransition(async () => {
      const result = await recordVisit({
        patient_id: patientId,
        doctor_id: doctorId || null,
        visit_date: visitDate,
        chief_complaint: chiefComplaint || null,
        diagnosis: diagnosis || null,
        prescription: prescription || null,
        consultation_fee: feeInPaisas,
        discount_amount: discountInPaisas,
        payment_method_id: paymentMethodId || null,
        payment_status: paymentStatus,
        follow_up_date: followUpDate || null,
        is_follow_up: isFollowUp,
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
            <p className="text-sm font-medium text-foreground">{patient.full_name}</p>
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
                      {p.full_name} — {p.patient_no}
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
                      {d.full_name}
                      {d.specialty ? ` (${d.specialty})` : ''}
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

        <div className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="is_follow_up"
            checked={isFollowUp}
            onChange={(e) => setIsFollowUp(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-primary"
          />
          <Label htmlFor="is_follow_up" className="cursor-pointer text-sm font-normal">
            This is a follow-up visit
          </Label>
        </div>

        {isFollowUp && (
          <div className="mt-3 space-y-1.5">
            <Label htmlFor="follow_up_date">Follow-up Date</Label>
            <Input
              id="follow_up_date"
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              min={visitDate}
            />
          </div>
        )}
      </div>

      {/* Clinical Notes */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-foreground">Clinical Notes</h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="chief_complaint">Chief Complaint</Label>
            <Textarea
              id="chief_complaint"
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Patient's primary complaint..."
              rows={2}
            />
          </div>

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

        <div className="grid gap-4 sm:grid-cols-3">
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
            <Label htmlFor="discount">Discount (PKR)</Label>
            <Input
              id="discount"
              type="number"
              min="0"
              step="1"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Net Fee</Label>
            <div className="flex h-10 items-center rounded-lg border border-border bg-background/50 px-3 text-sm font-semibold text-primary">
              Rs. {(netFee / 100).toFixed(0)}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="payment_method">Payment Method</Label>
            {loadingDeps ? (
              <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                <SelectTrigger id="payment_method">
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent>
                  {paymentMethods.map((pm) => (
                    <SelectItem key={pm.id} value={pm.id}>
                      {pm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment_status">Payment Status</Label>
            <Select
              value={paymentStatus}
              onValueChange={(v) => setPaymentStatus(v as 'pending' | 'completed')}
            >
              <SelectTrigger id="payment_status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
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
