'use client'

import { useState, useEffect, useTransition, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  CalendarDays,
  Loader2,
  Plus,
  Search,
  ChevronDown,
  X,
  Check,
  AlertTriangle,
  ChevronRight,
  ClipboardList,
} from 'lucide-react'
import { getTodayPKT, formatDate, cn } from '@/lib/utils'
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
  initialDoctors?: CpDoctor[]
  initialPaymentMethods?: Array<{ method: string; label: string }>
  onSuccess?: (visitId: string) => void
}

export function VisitForm({
  patient,
  patients,
  initialDoctors,
  initialPaymentMethods,
  onSuccess,
}: VisitFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const [doctors, setDoctors] = useState<CpDoctor[]>(initialDoctors ?? [])
  const [paymentMethods, setPaymentMethods] = useState<Array<{ method: string; label: string }>>(
    initialPaymentMethods ?? []
  )
  const [loadingDeps, setLoadingDeps] = useState(!initialDoctors)

  // Form fields
  const [patientId, setPatientId] = useState(patient?.id ?? '')
  const [patientSearch, setPatientSearch] = useState('')
  const [patientDropOpen, setPatientDropOpen] = useState(false)
  const patientComboRef = useRef<HTMLDivElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  function openDatePicker() {
    const input = dateInputRef.current
    if (!input) return
    try {
      (input as HTMLInputElement & { showPicker?: () => void }).showPicker?.()
    } catch {
      input.click()
    }
  }

  const [doctorId, setDoctorId] = useState('')
  const [visitDate, setVisitDate] = useState(getTodayPKT())
  const [diagnosis, setDiagnosis] = useState('')
  const [prescription, setPrescription] = useState('')
  const [fee, setFee] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [isDue, setIsDue] = useState(false)
  const [notes, setNotes] = useState('')
  const [notesExpanded, setNotesExpanded] = useState(false)

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

  useEffect(() => {
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

  // Initials for pre-selected patient avatar
  const patientInitials = patient?.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('') ?? ''

  return (
    <form onSubmit={handleSubmit}>
      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {error && (
        <div className="mb-3 flex items-center gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* ── Unified form card ───────────────────────────────────────────────── */}
      <div
        className={cn(
          'overflow-hidden rounded-xl border bg-card transition-colors duration-200',
          isDue ? 'border-amber-500/30' : 'border-border'
        )}
      >
        {/* ── Patient ─────────────────────────────────────────────────────── */}
        <div className="border-b border-border/70 px-4 py-3">
          <SectionLabel>Patient</SectionLabel>

          {patient ? (
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                {patientInitials}
              </div>
              <div>
                <p className="text-[13px] font-medium text-foreground">{patient.name}</p>
                <p className="text-[11px] text-muted-foreground">#{patient.patient_no}</p>
              </div>
            </div>
          ) : loadingDeps ? (
            <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading patients...
            </div>
          ) : (
            <div ref={patientComboRef} className="relative">
              <button
                type="button"
                onClick={() => setPatientDropOpen((o) => !o)}
                className={cn(
                  'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm',
                  'ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                  !selectedPatient && 'text-muted-foreground'
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
                <ChevronDown
                  className={cn(
                    'ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                    patientDropOpen && 'rotate-180'
                  )}
                />
              </button>

              {patientDropOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
                  <div className="p-2">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
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
                            'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                            p.id === patientId && 'bg-accent/50'
                          )}
                          onClick={() => {
                            setPatientId(p.id)
                            setPatientSearch('')
                            setPatientDropOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'h-3.5 w-3.5 shrink-0 text-primary',
                              p.id !== patientId && 'invisible'
                            )}
                          />
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
                      Showing first 500 — use search to narrow down
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Consultation ─────────────────────────────────────────────────── */}
        <div className="border-b border-border/70 px-4 py-3">
          <SectionLabel>Consultation</SectionLabel>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Doctor</Label>
              {loadingDeps ? (
                <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <Select value={doctorId} onValueChange={setDoctorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select doctor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— No doctor —</SelectItem>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Visit Date *</Label>
              <button
                type="button"
                onClick={openDatePicker}
                className="flex h-10 w-full items-center gap-2.5 rounded-md border border-input bg-background px-3 text-sm text-left transition-colors hover:border-ring/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="font-medium text-foreground">
                  {formatDate(visitDate, 'EEE, dd MMM yyyy')}
                </span>
              </button>
              <input
                ref={dateInputRef}
                type="date"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
                className="sr-only"
              />
            </div>
          </div>
        </div>

        {/* ── Payment ──────────────────────────────────────────────────────── */}
        <div
          className={cn(
            'border-b border-border/70 px-4 py-3 transition-colors duration-200',
            isDue && 'bg-amber-500/5'
          )}
        >
          <div className="mb-2 flex items-center gap-1.5">
            <SectionLabel inline>Payment</SectionLabel>
            {isDue && (
              <span className="ml-auto flex items-center gap-0.5 text-[10px] font-semibold text-amber-500">
                <AlertTriangle className="h-2.5 w-2.5" />
                DUE
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Fee (PKR) *</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="500"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Payment Method {!isDue && '*'}
              </Label>
              {isDue ? (
                <div className="flex h-10 items-center rounded-md border border-dashed border-amber-500/40 px-3 text-sm text-amber-600/70">
                  Will be settled later
                </div>
              ) : loadingDeps ? (
                <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              ) : (
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
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

          <label className="mt-3 flex cursor-pointer items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={isDue}
              onChange={(e) => {
                setIsDue(e.target.checked)
                if (e.target.checked) setPaymentMethod('')
              }}
              className="h-3.5 w-3.5 rounded accent-amber-500"
            />
            <span className="text-sm font-medium text-foreground">Mark as Due</span>
            <span className="text-xs text-muted-foreground">— patient pays later</span>
          </label>
        </div>

        {/* ── Clinical Notes (collapsible) ──────────────────────────────────── */}
        <div>
          <button
            type="button"
            onClick={() => setNotesExpanded((v) => !v)}
            className="flex w-full items-center gap-1.5 px-4 py-2.5 text-left transition-colors hover:bg-muted/20"
          >
            <ClipboardList className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Clinical Notes
            </span>
            <span className="text-[10px] font-normal normal-case text-muted-foreground/50">
              optional
            </span>
            <ChevronRight
              className={cn(
                'ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-200',
                notesExpanded && 'rotate-90'
              )}
            />
          </button>

          {notesExpanded && (
            <div className="space-y-3 border-t border-border/70 px-4 pb-4 pt-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Diagnosis</Label>
                <Textarea
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  placeholder="Clinical diagnosis..."
                  rows={2}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Prescription</Label>
                <Textarea
                  value={prescription}
                  onChange={(e) => setPrescription(e.target.value)}
                  placeholder="Prescribed medications and instructions..."
                  rows={3}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Submit ──────────────────────────────────────────────────────────── */}
      <div className="mt-3 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isPending || loadingDeps}>
          {isPending ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Recording...
            </>
          ) : (
            <>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Record Visit
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

// =============================================================================
// SectionLabel
// =============================================================================

function SectionLabel({ children, inline }: { children: React.ReactNode; inline?: boolean }) {
  return (
    <p className={cn('text-[11px] font-semibold uppercase tracking-wider text-muted-foreground', !inline && 'mb-2')}>
      {children}
    </p>
  )
}
