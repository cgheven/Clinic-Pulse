'use client'

import { useState, useEffect, useTransition, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarDays, User, Stethoscope, Banknote, Loader2, Plus, Search, ChevronDown, X, Check, AlertTriangle } from 'lucide-react'
import { getTodayPKT, cn } from '@/lib/utils'
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
  patient?: Pick<CpPatient, 'id' | 'name' | 'patient_no'>
  patients?: Pick<CpPatient, 'id' | 'name' | 'patient_no' | 'phone'>[]
  // Pre-fetched server-side — eliminates client-side loading spinners
  initialDoctors?: CpDoctor[]
  initialPaymentMethods?: Array<{ method: string; label: string }>
  onSuccess?: (visitId: string) => void
}

export function VisitForm({ patient, patients, initialDoctors, initialPaymentMethods, onSuccess }: VisitFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [doctors, setDoctors] = useState<CpDoctor[]>(initialDoctors ?? [])
  const [paymentMethods, setPaymentMethods] = useState<Array<{ method: string; label: string }>>(initialPaymentMethods ?? [])
  const [loadingDeps, setLoadingDeps] = useState(!initialDoctors)

  // Form fields
  const [patientId, setPatientId] = useState(patient?.id ?? '')

  // Patient search combobox
  const [patientSearch, setPatientSearch] = useState('')
  const [patientDropOpen, setPatientDropOpen] = useState(false)
  const patientComboRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (patientComboRef.current && !patientComboRef.current.contains(e.target as Node)) {
        setPatientDropOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase()
    if (!q) return patients ?? []
    return (patients ?? []).filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        String(p.patient_no).includes(q) ||
        (p.phone && p.phone.includes(q))
    )
  }, [patients, patientSearch])

  const selectedPatient = useMemo(
    () => (patients ?? []).find((p) => p.id === patientId) ?? null,
    [patients, patientId]
  )
  const [doctorId, setDoctorId] = useState('')
  const [visitDate, setVisitDate] = useState(getTodayPKT())
  const [diagnosis, setDiagnosis] = useState('')
  const [prescription, setPrescription] = useState('')
  const [fee, setFee] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [isDue, setIsDue] = useState(false)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    // Skip if data was already provided server-side
    if (initialDoctors) return
    async function loadDeps() {
      const [docRes, pmRes] = await Promise.all([getActiveDoctors(), getActivePaymentMethods()])
      if (docRes.success) setDoctors(docRes.data as unknown as CpDoctor[])
      if (pmRes.success) setPaymentMethods(pmRes.data)
      setLoadingDeps(false)
    }
    void loadDeps()
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!isDue && !paymentMethod) {
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
        payment_method: isDue ? null : paymentMethod,
        payment_status: isDue ? 'due' : 'paid',
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
              <div ref={patientComboRef} className="relative">
                <button
                  type="button"
                  id="patient_id"
                  onClick={() => setPatientDropOpen((o) => !o)}
                  className={cn(
                    "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                    !selectedPatient && "text-muted-foreground"
                  )}
                >
                  {selectedPatient ? (
                    <span className="truncate">
                      <span className="font-medium">{selectedPatient.name}</span>
                      <span className="ml-1.5 text-muted-foreground">#{selectedPatient.patient_no}</span>
                      {selectedPatient.phone && (
                        <span className="ml-1.5 text-muted-foreground">· {selectedPatient.phone}</span>
                      )}
                    </span>
                  ) : (
                    <span>Select patient...</span>
                  )}
                  <ChevronDown className={cn("ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform", patientDropOpen && "rotate-180")} />
                </button>

                {patientDropOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
                    <div className="p-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                        <input
                          autoFocus
                          value={patientSearch}
                          onChange={(e) => setPatientSearch(e.target.value)}
                          placeholder="Search by name, ID or phone..."
                          className="w-full rounded-sm border border-input bg-background py-1.5 pl-8 pr-8 text-sm outline-none focus:ring-1 focus:ring-ring"
                        />
                        {patientSearch && (
                          <button
                            type="button"
                            onClick={() => setPatientSearch('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto border-t border-border">
                      {filteredPatients.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                          No patients found
                        </p>
                      ) : (
                        filteredPatients.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className={cn(
                              "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                              p.id === patientId && "bg-accent/50"
                            )}
                            onClick={() => {
                              setPatientId(p.id)
                              setPatientSearch('')
                              setPatientDropOpen(false)
                            }}
                          >
                            <Check className={cn("h-3.5 w-3.5 shrink-0 text-primary", p.id !== patientId && "invisible")} />
                            <span>
                              <span className="font-medium">{p.name}</span>
                              <span className="ml-1.5 text-muted-foreground">#{p.patient_no}</span>
                              {p.phone && (
                                <span className="ml-1.5 text-muted-foreground">· {p.phone}</span>
                              )}
                            </span>
                          </button>
                        ))
                      )}
                    </div>

                    {patients && patients.length >= 500 && (
                      <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
                        Showing first 500 patients — use search to narrow down
                      </p>
                    )}
                  </div>
                )}
              </div>
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
      <div className={cn(
        "rounded-xl border bg-card p-5 transition-colors",
        isDue ? "border-amber-500/40 bg-amber-500/5" : "border-border"
      )}>
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Banknote className={cn("h-4 w-4", isDue ? "text-amber-500" : "text-primary")} />
          Payment
          {isDue && (
            <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-500">
              <AlertTriangle className="h-3 w-3" />
              Due
            </span>
          )}
        </h3>

        <div className="space-y-4">
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
              <Label htmlFor="payment_method">
                Payment Method {isDue ? <span className="text-muted-foreground">(optional — due)</span> : '*'}
              </Label>
              {isDue ? (
                <div className="flex h-10 items-center rounded-md border border-dashed border-amber-500/40 bg-amber-500/5 px-3 text-sm text-amber-600/80">
                  Will be recorded when settled
                </div>
              ) : loadingDeps ? (
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

          {/* Due toggle */}
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5 hover:bg-muted/30 transition-colors">
            <input
              type="checkbox"
              checked={isDue}
              onChange={(e) => {
                setIsDue(e.target.checked)
                if (e.target.checked) setPaymentMethod('')
              }}
              className="h-4 w-4 rounded accent-amber-500"
            />
            <div>
              <p className="text-sm font-medium text-foreground">Mark as Due (Credit)</p>
              <p className="text-xs text-muted-foreground">Patient will pay later — fee is recorded as outstanding</p>
            </div>
          </label>
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
