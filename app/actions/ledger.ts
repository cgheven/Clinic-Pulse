'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import type { CpDoctor, CpStaff } from '@/types/index'

// =============================================================================
// Re-export shared ActionResult type shape (avoids cross-import)
// =============================================================================

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================================================
// Types
// =============================================================================

export type DoctorLedgerEntry = {
  doctor_id: string
  doctor_name: string
  specialization: string | null
  earning_model: 'salaried' | 'commission'
  commission_pct: number | null
  visits_total: number
  gross_fee_paisas: number       // all visits: sum of fee_paisas
  collected_paisas: number       // payment_status = 'paid': sum of fee_paisas
  due_paisas: number             // payment_status = 'due': sum of fee_paisas
  partial_paid_paisas: number    // payment_status = 'partial': sum of paid_amount_paisas (or 0 if column absent)
  commission_earned_paisas: number // commission doctors only: collected * commission_pct / 100
}

export type StaffLedgerEntry = {
  staff_id: string
  name: string
  staff_type: string
  department: string | null
  monthly_salary: number // paisas
}

export type DailyLedger = {
  date: string
  clinic_name: string
  doctor_entries: DoctorLedgerEntry[]
  staff_entries: StaffLedgerEntry[]
  // Totals
  total_visits: number
  total_gross_fee_paisas: number
  total_collected_paisas: number
  total_due_paisas: number
  total_commission_paisas: number
}

// =============================================================================
// Internal helpers
// =============================================================================

async function getClinicName(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const { data } = await supabase
    .from('cp_settings')
    .select('setting_value')
    .eq('setting_key', 'clinic.clinic_name')
    .maybeSingle()
  const val = data?.setting_value
  return (typeof val === 'string' ? val : null) ?? 'ClinicPulse'
}

// =============================================================================
// getDailyLedger
// =============================================================================

export async function getDailyLedger(
  date: string
): Promise<ActionResult<DailyLedger>> {
  try {
    await requireAuth()

    const dateParsed = z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .safeParse(date)
    if (!dateParsed.success) {
      return { success: false, error: 'Invalid date format (YYYY-MM-DD)' }
    }

    const supabase = await createClient()

    const [clinicName, doctorsRes, staffRes, visitsWithPartial] = await Promise.all([
      getClinicName(supabase),
      supabase
        .from('cp_doctors')
        .select('id, name, specialization, earning_model, commission_pct, monthly_salary')
        .is('deleted_at', null)
        .eq('is_active', true)
        .order('name', { ascending: true }),
      supabase
        .from('cp_staff')
        .select('id, name, staff_type, department, monthly_salary')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name', { ascending: true }),
      // Try with paid_amount_paisas first; falls back below if the column is absent
      supabase
        .from('cp_patient_visits')
        .select('doctor_id, fee_paisas, payment_status, paid_amount_paisas')
        .eq('visit_date', date),
    ])

    if (doctorsRes.error) return { success: false, error: doctorsRes.error.message }
    if (staffRes.error) return { success: false, error: staffRes.error.message }

    const doctors = (doctorsRes.data ?? []) as CpDoctor[]

    // Fetch visits for the date
    // Attempt to select paid_amount_paisas gracefully; it may not exist yet.
    type VisitRow = {
      doctor_id: string | null
      fee_paisas: number
      payment_status: string
      paid_amount_paisas?: number | null
    }

    let visitsData: VisitRow[] = []
    let hasPartialCol = true

    if (visitsWithPartial.error) {
      // Column likely doesn't exist — retry without it
      hasPartialCol = false
      const visitsBasic = await supabase
        .from('cp_patient_visits')
        .select('doctor_id, fee_paisas, payment_status')
        .eq('visit_date', date)
      if (visitsBasic.error) return { success: false, error: visitsBasic.error.message }
      visitsData = (visitsBasic.data ?? []) as VisitRow[]
    } else {
      visitsData = (visitsWithPartial.data ?? []) as VisitRow[]
    }

    // Aggregate per doctor
    type DoctorAgg = {
      visits_total: number
      gross_fee_paisas: number
      collected_paisas: number
      due_paisas: number
      partial_paid_paisas: number
    }

    const aggMap = new Map<string, DoctorAgg>()
    let unattributed_visits = 0

    for (const v of visitsData) {
      if (!v.doctor_id) {
        unattributed_visits++
        continue
      }
      const agg = aggMap.get(v.doctor_id) ?? {
        visits_total: 0,
        gross_fee_paisas: 0,
        collected_paisas: 0,
        due_paisas: 0,
        partial_paid_paisas: 0,
      }

      agg.visits_total += 1
      agg.gross_fee_paisas += v.fee_paisas ?? 0

      const status = (v.payment_status ?? '').toLowerCase()
      if (status === 'paid') {
        agg.collected_paisas += v.fee_paisas ?? 0
      } else if (status === 'due') {
        agg.due_paisas += v.fee_paisas ?? 0
      } else if (status === 'partial') {
        // If paid_amount_paisas column exists, use it; else 0
        agg.partial_paid_paisas += hasPartialCol ? (v.paid_amount_paisas ?? 0) : 0
      }

      aggMap.set(v.doctor_id, agg)
    }

    // Build per-doctor entries
    const doctor_entries: DoctorLedgerEntry[] = doctors.map((d) => {
      const agg = aggMap.get(d.id) ?? {
        visits_total: 0,
        gross_fee_paisas: 0,
        collected_paisas: 0,
        due_paisas: 0,
        partial_paid_paisas: 0,
      }

      const commPct = d.commission_pct ?? null
      const commission_earned_paisas =
        d.earning_model === 'commission' && commPct !== null
          ? Math.round((agg.collected_paisas * commPct) / 100)
          : 0

      return {
        doctor_id: d.id,
        doctor_name: d.name,
        specialization: d.specialization ?? null,
        earning_model: d.earning_model,
        commission_pct: commPct,
        visits_total: agg.visits_total,
        gross_fee_paisas: agg.gross_fee_paisas,
        collected_paisas: agg.collected_paisas,
        due_paisas: agg.due_paisas,
        partial_paid_paisas: agg.partial_paid_paisas,
        commission_earned_paisas,
      }
    })

    // Staff entries
    const staff_entries: StaffLedgerEntry[] = ((staffRes.data ?? []) as CpStaff[]).map((s) => ({
      staff_id: s.id,
      name: s.name,
      staff_type: s.staff_type,
      department: s.department ?? null,
      monthly_salary: s.monthly_salary ?? 0,
    }))

    // Grand totals — include unattributed visits and partial payment amounts
    const total_visits = doctor_entries.reduce((s, e) => s + e.visits_total, 0) + unattributed_visits
    const total_gross_fee_paisas = doctor_entries.reduce((s, e) => s + e.gross_fee_paisas, 0)
    // Collected = fully paid visits + partial amounts actually received
    const total_collected_paisas = doctor_entries.reduce(
      (s, e) => s + e.collected_paisas + e.partial_paid_paisas,
      0
    )
    // Due = pure-due visits + unpaid remainder of partial visits
    const total_due_paisas = doctor_entries.reduce(
      (s, e) =>
        s +
        e.due_paisas +
        Math.max(0, e.gross_fee_paisas - e.collected_paisas - e.due_paisas - e.partial_paid_paisas),
      0
    )
    const total_commission_paisas = doctor_entries.reduce(
      (s, e) => s + e.commission_earned_paisas,
      0
    )

    return {
      success: true,
      data: {
        date,
        clinic_name: clinicName,
        doctor_entries,
        staff_entries,
        total_visits,
        total_gross_fee_paisas,
        total_collected_paisas,
        total_due_paisas,
        total_commission_paisas,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}
