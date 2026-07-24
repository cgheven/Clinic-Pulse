'use server'

import { z } from 'zod'
import { revalidatePath, unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { validateFinancialDate } from '@/lib/validate-date'

// =============================================================================
// Return type
// =============================================================================

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// DB-aligned types (match actual Supabase columns)
export type Patient = {
  id: string
  patient_no: number | null
  name: string
  phone: string | null
  gender: 'male' | 'female' | 'other' | null
  blood_group: string | null
  date_of_birth: string | null
  address: string | null
  history: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type Doctor = {
  id: string
  name: string
  specialization: string | null
  phone: string | null
  email: string | null
  earning_model: 'salaried' | 'commission'
  monthly_salary: number | null
  commission_pct: number | null
  is_active: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type OpdPaymentStatus = 'paid' | 'due'

export type Visit = {
  id: string
  patient_id: string
  doctor_id: string | null
  visit_date: string
  voucher_no: number | null
  fee_paisas: number
  payment_method: 'cash' | 'jazzcash' | 'easypaisa' | 'bank_transfer' | null
  payment_status: OpdPaymentStatus
  diagnosis: string | null
  prescription: string | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export type BpLog = {
  id: string
  patient_id: string
  systolic: number
  diastolic: number
  pulse: number | null
  notes: string | null
  recorded_at: string
  recorded_by: string | null
}

export type PatientWithVisitCount = Patient & {
  visit_count: number
  last_visit_date: string | null
}

export type DoctorWithTodayStats = Doctor & {
  today_visits: number
  today_revenue: number
}

export type VisitWithRelations = Visit & {
  patient: Pick<Patient, 'id' | 'name' | 'patient_no' | 'phone'> | null
  doctor: Pick<Doctor, 'id' | 'name' | 'specialization'> | null
}

export type PatientDetail = Patient & {
  visits: VisitWithRelations[]
  bp_logs: BpLog[]
}

export type DoctorDetail = Doctor & {
  visits_this_month: number
  revenue_this_month: number
  earnings_this_month: number
}

export type OpdDashboardStats = {
  today_visits: number
  today_revenue: number
  today_patients: number
  month_visits: number
  month_revenue: number
  doctor_stats: Array<{
    doctor_id: string
    doctor_name: string
    specialization: string | null
    today_visits: number
    today_revenue: number
  }>
}

export type DoctorEarningsResult = {
  doctor: Doctor
  month: string
  earning_model: 'salaried' | 'commission'
  total_visits: number
  total_revenue: number
  commission_pct: number | null
  gross_earnings: number
  working_days_in_month: number
  days_worked: number
}

export type DailyVisitSummary = {
  date: string
  visits: VisitWithRelations[]
  total_visits: number
  total_revenue: number
}

export type PaginatedResponse<T> = {
  data: T[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

// =============================================================================
// Zod Schemas
// =============================================================================

const createPatientSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  blood_group: z.string().max(10).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  history: z.string().max(2000).nullable().optional(),
})

const updatePatientSchema = createPatientSchema.partial()

const recordVisitSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  doctor_id: z.string().uuid().nullable().optional(),
  visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  fee_paisas: z.number().int().min(0, 'Fee cannot be negative'),
  payment_method: z.enum(['cash', 'jazzcash', 'easypaisa', 'bank_transfer']).nullable().optional(),
  payment_status: z.enum(['paid', 'due']).default('paid'),
  diagnosis: z.string().max(2000).nullable().optional(),
  prescription: z.string().max(5000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
}).refine(
  (d) => d.payment_status === 'due' || !!d.payment_method,
  { message: 'Payment method is required for paid visits', path: ['payment_method'] }
)

const addBpLogSchema = z.object({
  systolic: z.number().int().min(50).max(300),
  diastolic: z.number().int().min(30).max(200),
  pulse: z.number().int().min(30).max(250).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

// =============================================================================
// Helpers
// =============================================================================

function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
}

function firstDayOfMonth(yearMonth: string): string {
  return `${yearMonth}-01`
}

function lastDayOfMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  const last = new Date(year!, month!, 0)
  return `${yearMonth}-${String(last.getDate()).padStart(2, '0')}`
}

function daysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year!, month!, 0).getDate()
}

async function getWorkingDaysConfig(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<number> {
  const { data } = await supabase
    .from('cp_settings')
    .select('setting_value')
    .eq('setting_key', 'salary.working_days')
    .single()
  if (data?.setting_value) {
    const v = (data.setting_value as { default_days?: number }).default_days
    if (v && v > 0) return v
  }
  return 26
}

// =============================================================================
// OPD Dashboard
// =============================================================================

export async function getOpdDashboard(): Promise<ActionResult<OpdDashboardStats>> {
  try {
    await requireAuth()
    const supabase = await createClient()
    const today = todayISO()
    const monthStart = today.slice(0, 7) + '-01'

    const [todayVisitsRes, monthVisitsRes] = await Promise.all([
      supabase
        .from('cp_patient_visits')
        .select('id, patient_id, doctor_id, fee_paisas')
        .eq('visit_date', today),
      supabase
        .from('cp_patient_visits')
        .select('id, fee_paisas')
        .gte('visit_date', monthStart)
        .lte('visit_date', today),
    ])

    if (todayVisitsRes.error) return { success: false, error: todayVisitsRes.error.message }
    if (monthVisitsRes.error) return { success: false, error: monthVisitsRes.error.message }

    const todayVisits = todayVisitsRes.data ?? []
    const monthVisits = monthVisitsRes.data ?? []

    // Doctor stats
    const doctorIds = [...new Set(todayVisits.filter((v) => v.doctor_id).map((v) => v.doctor_id!))]
    let doctorStats: OpdDashboardStats['doctor_stats'] = []

    if (doctorIds.length > 0) {
      const { data: doctors } = await supabase
        .from('cp_doctors')
        .select('id, name, specialization')
        .in('id', doctorIds)

      const doctorMap = new Map((doctors ?? []).map((d) => [d.id, d]))
      const statMap = new Map<string, { visits: number; revenue: number }>()

      for (const v of todayVisits) {
        if (v.doctor_id) {
          const cur = statMap.get(v.doctor_id) ?? { visits: 0, revenue: 0 }
          statMap.set(v.doctor_id, { visits: cur.visits + 1, revenue: cur.revenue + (v.fee_paisas ?? 0) })
        }
      }

      doctorStats = Array.from(statMap.entries()).map(([did, stat]) => {
        const doc = doctorMap.get(did)
        return {
          doctor_id: did,
          doctor_name: (doc?.name as string) ?? 'Unknown',
          specialization: (doc?.specialization as string | null) ?? null,
          today_visits: stat.visits,
          today_revenue: stat.revenue,
        }
      })
    }

    return {
      success: true,
      data: {
        today_visits: todayVisits.length,
        today_revenue: todayVisits.reduce((s, v) => s + (v.fee_paisas ?? 0), 0),
        today_patients: new Set(todayVisits.map((v) => v.patient_id)).size,
        month_visits: monthVisits.length,
        month_revenue: monthVisits.reduce((s, v) => s + (v.fee_paisas ?? 0), 0),
        doctor_stats: doctorStats,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// Patients
// =============================================================================

export async function getPatients(params: {
  search?: string
  page?: number
  limit?: number
  gender?: string
  registeredOn?: string // YYYY-MM-DD
}): Promise<ActionResult<PaginatedResponse<PatientWithVisitCount>>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(500, Math.max(1, params.limit ?? 20))
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('cp_patients')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (params.search) {
      const term = params.search.trim()
      const orParts = [`name.ilike.%${term}%`, `phone.ilike.%${term}%`]
      const termAsNum = parseInt(term, 10)
      if (!isNaN(termAsNum)) {
        orParts.push(`patient_no.eq.${termAsNum}`)
      }
      query = query.or(orParts.join(','))
    }

    if (params.gender && ['male', 'female', 'other'].includes(params.gender)) {
      query = query.eq('gender', params.gender as 'male' | 'female' | 'other')
    }

    if (params.registeredOn && /^\d{4}-\d{2}-\d{2}$/.test(params.registeredOn)) {
      query = query
        .gte('created_at', `${params.registeredOn}T00:00:00+05:00`)
        .lte('created_at', `${params.registeredOn}T23:59:59.999+05:00`)
    }

    const { data, error, count } = await query
    if (error) return { success: false, error: error.message }

    const patients = (data ?? []) as Patient[]
    let enriched: PatientWithVisitCount[] = patients.map((p) => ({ ...p, visit_count: 0, last_visit_date: null }))

    if (patients.length > 0) {
      const { data: visitData } = await supabase
        .from('cp_patient_visits')
        .select('patient_id, visit_date')
        .in('patient_id', patients.map((p) => p.id))
        .order('visit_date', { ascending: false })
        .limit(patients.length * 50)

      const visitMap = new Map<string, { count: number; lastDate: string | null }>()
      for (const v of visitData ?? []) {
        const cur = visitMap.get(v.patient_id) ?? { count: 0, lastDate: null }
        visitMap.set(v.patient_id, { count: cur.count + 1, lastDate: cur.lastDate ?? v.visit_date })
      }

      enriched = patients.map((p) => {
        const stat = visitMap.get(p.id)
        return { ...p, visit_count: stat?.count ?? 0, last_visit_date: stat?.lastDate ?? null }
      })
    }

    return {
      success: true,
      data: { data: enriched, count: count ?? 0, page, pageSize: limit, totalPages: Math.ceil((count ?? 0) / limit) },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function getPatient(id: string): Promise<ActionResult<PatientDetail>> {
  try {
    await requireAuth()
    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid patient ID' }

    const supabase = await createClient()

    const [patientRes, visitRes, bpRes] = await Promise.all([
      supabase.from('cp_patients').select('*').eq('id', id).is('deleted_at', null).single(),
      supabase
        .from('cp_patient_visits')
        .select('*, cp_doctors!doctor_id(id, name, specialization)')
        .eq('patient_id', id)
        .order('visit_date', { ascending: false }),
      supabase.from('cp_bp_logs').select('*').eq('patient_id', id).order('recorded_at', { ascending: false }),
    ])

    if (patientRes.error || !patientRes.data)
      return { success: false, error: patientRes.error?.message ?? 'Patient not found' }

    type VisitRow = Visit & { cp_doctors: Pick<Doctor, 'id' | 'name' | 'specialization'> | null }
    const visits: VisitWithRelations[] = ((visitRes.data ?? []) as unknown as VisitRow[]).map((v) => ({
      ...v,
      patient: { id: patientRes.data.id, name: patientRes.data.name as string, patient_no: patientRes.data.patient_no as number | null, phone: patientRes.data.phone as string | null },
      doctor: v.cp_doctors ?? null,
    }))

    return {
      success: true,
      data: { ...(patientRes.data as unknown as Patient), visits, bp_logs: (bpRes.data ?? []) as BpLog[] },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function createPatient(rawData: unknown): Promise<ActionResult<Patient>> {
  try {
    await requireAuth()
    const parsed = createPatientSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

    const supabase = await createClient()
    const insertData = {
      ...parsed.data,
      gender: parsed.data.gender ?? undefined,
    }
    const { data, error } = await supabase.from('cp_patients').insert(insertData).select().single()
    if (error) return { success: false, error: error.message }

    revalidatePath('/opd/patients')
    return { success: true, data: data as unknown as Patient }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function updatePatient(id: string, rawData: unknown): Promise<ActionResult<Patient>> {
  try {
    await requireAuth()
    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid patient ID' }

    const parsed = updatePatientSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

    const supabase = await createClient()
    const updateData = {
      ...parsed.data,
      gender: parsed.data.gender ?? undefined,
    }
    const { data, error } = await supabase.from('cp_patients').update(updateData).eq('id', id).is('deleted_at', null).select().single()
    if (error) return { success: false, error: error.message }

    revalidatePath('/opd/patients')
    revalidatePath(`/opd/patients/${id}`)
    return { success: true, data: data as unknown as Patient }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// Doctors
// =============================================================================

export async function getDoctors(): Promise<ActionResult<DoctorWithTodayStats[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()
    const today = todayISO()

    const [doctorsRes, visitsRes] = await Promise.all([
      supabase.from('cp_doctors').select('*').eq('is_active', true).is('deleted_at', null).order('name', { ascending: true }),
      supabase.from('cp_patient_visits').select('doctor_id, fee_paisas').eq('visit_date', today).not('doctor_id', 'is', null),
    ])

    if (doctorsRes.error) return { success: false, error: doctorsRes.error.message }

    const statMap = new Map<string, { visits: number; revenue: number }>()
    for (const v of visitsRes.data ?? []) {
      if (v.doctor_id) {
        const cur = statMap.get(v.doctor_id) ?? { visits: 0, revenue: 0 }
        statMap.set(v.doctor_id, { visits: cur.visits + 1, revenue: cur.revenue + (v.fee_paisas ?? 0) })
      }
    }

    const result: DoctorWithTodayStats[] = (doctorsRes.data as unknown as Doctor[]).map((d) => {
      const stat = statMap.get(d.id)
      return { ...d, today_visits: stat?.visits ?? 0, today_revenue: stat?.revenue ?? 0 }
    })

    return { success: true, data: result }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function getDoctor(id: string): Promise<ActionResult<DoctorDetail>> {
  try {
    await requireAuth()
    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid doctor ID' }

    const supabase = await createClient()
    const today = todayISO()
    const monthStart = today.slice(0, 7) + '-01'

    const [docRes, monthVisitsRes] = await Promise.all([
      supabase.from('cp_doctors').select('*').eq('id', id).is('deleted_at', null).single(),
      supabase.from('cp_patient_visits').select('id, fee_paisas').eq('doctor_id', id).gte('visit_date', monthStart).lte('visit_date', today),
    ])

    if (docRes.error || !docRes.data) return { success: false, error: docRes.error?.message ?? 'Doctor not found' }

    const doctor = docRes.data as unknown as Doctor
    const monthRevenue = (monthVisitsRes.data ?? []).reduce((s, v) => s + (v.fee_paisas ?? 0), 0)
    const earningsResult = await getDoctorEarnings(id, today.slice(0, 7))
    const earnings = earningsResult.success ? earningsResult.data.gross_earnings : 0

    return {
      success: true,
      data: { ...doctor, visits_this_month: (monthVisitsRes.data ?? []).length, revenue_this_month: monthRevenue, earnings_this_month: earnings },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function getActiveDoctors(): Promise<ActionResult<Doctor[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cp_doctors')
      .select('id, name, specialization, earning_model, is_active')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as unknown as Doctor[] }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// Visits
// =============================================================================

export async function recordVisit(rawData: unknown): Promise<ActionResult<Visit>> {
  try {
    const authUser = await requireAuth()
    const parsed = recordVisitSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

    const dateCheck = validateFinancialDate(parsed.data.visit_date)
    if (!dateCheck.valid) return { success: false, error: dateCheck.error }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cp_patient_visits')
      .insert({
        patient_id: parsed.data.patient_id,
        doctor_id: parsed.data.doctor_id ?? null,
        visit_date: parsed.data.visit_date,
        fee_paisas: parsed.data.fee_paisas,
        payment_method: parsed.data.payment_method ?? null,
        payment_status: parsed.data.payment_status,
        diagnosis: parsed.data.diagnosis ?? null,
        prescription: parsed.data.prescription ?? null,
        notes: parsed.data.notes ?? null,
        created_by: authUser.id,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/opd')
    revalidatePath('/opd/visits')
    revalidatePath(`/opd/patients/${parsed.data.patient_id}`)
    return { success: true, data: data as unknown as Visit }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function getDailyVisits(date: string): Promise<ActionResult<DailyVisitSummary>> {
  try {
    await requireAuth()
    const dateParsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(date)
    if (!dateParsed.success) return { success: false, error: 'Invalid date format' }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cp_patient_visits')
      .select('*, cp_patients!patient_id(id, name, patient_no, phone), cp_doctors!doctor_id(id, name, specialization)')
      .eq('visit_date', date)
      .order('created_at', { ascending: false })

    if (error) return { success: false, error: error.message }

    type Row = Visit & {
      cp_patients: Pick<Patient, 'id' | 'name' | 'patient_no' | 'phone'> | null
      cp_doctors: Pick<Doctor, 'id' | 'name' | 'specialization'> | null
    }

    const visits: VisitWithRelations[] = ((data ?? []) as unknown as Row[]).map((v) => ({
      ...v,
      patient: v.cp_patients ?? null,
      doctor: v.cp_doctors ?? null,
    }))

    return {
      success: true,
      data: { date, visits, total_visits: visits.length, total_revenue: visits.reduce((s, v) => s + (v.fee_paisas ?? 0), 0) },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// BP Logs
// =============================================================================

export async function addBpLog(patientId: string, rawData: unknown): Promise<ActionResult<BpLog>> {
  try {
    const authUser = await requireAuth()
    const idParsed = z.string().uuid().safeParse(patientId)
    if (!idParsed.success) return { success: false, error: 'Invalid patient ID' }

    const parsed = addBpLogSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cp_bp_logs')
      .insert({
        patient_id: patientId,
        systolic: parsed.data.systolic,
        diastolic: parsed.data.diastolic,
        pulse: parsed.data.pulse ?? null,
        notes: parsed.data.notes ?? null,
        recorded_by: authUser.id,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath(`/opd/patients/${patientId}`)
    return { success: true, data: data as unknown as BpLog }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// Doctor Earnings (server-side only)
// =============================================================================

export async function getDoctorEarnings(doctorId: string, month: string): Promise<ActionResult<DoctorEarningsResult>> {
  try {
    await requireAuth()
    const idParsed = z.string().uuid().safeParse(doctorId)
    if (!idParsed.success) return { success: false, error: 'Invalid doctor ID' }

    const monthParsed = z.string().regex(/^\d{4}-\d{2}$/).safeParse(month)
    if (!monthParsed.success) return { success: false, error: 'Invalid month format (YYYY-MM)' }

    const supabase = await createClient()
    const from = firstDayOfMonth(month)
    const to = lastDayOfMonth(month)

    const [docRes, visitsRes, workingDays] = await Promise.all([
      supabase.from('cp_doctors').select('*').eq('id', doctorId).is('deleted_at', null).single(),
      supabase.from('cp_patient_visits').select('id, visit_date, fee_paisas').eq('doctor_id', doctorId).gte('visit_date', from).lte('visit_date', to),
      getWorkingDaysConfig(supabase),
    ])

    if (docRes.error || !docRes.data) return { success: false, error: docRes.error?.message ?? 'Doctor not found' }

    const doctor = docRes.data as unknown as Doctor
    const visits = visitsRes.data ?? []
    const totalRevenue = visits.reduce((s, v) => s + (v.fee_paisas ?? 0), 0)
    const daysWorked = new Set(visits.map((v) => v.visit_date)).size

    let grossEarnings = 0
    if (doctor.earning_model === 'salaried') {
      const salary = doctor.monthly_salary ?? 0
      grossEarnings = workingDays > 0 ? Math.round((salary / workingDays) * daysWorked) : salary
    } else {
      const pct = Number(doctor.commission_pct ?? 0)
      grossEarnings = Math.round((totalRevenue * pct) / 100)
    }

    return {
      success: true,
      data: {
        doctor,
        month,
        earning_model: doctor.earning_model,
        total_visits: visits.length,
        total_revenue: totalRevenue,
        commission_pct: doctor.commission_pct,
        gross_earnings: grossEarnings,
        working_days_in_month: workingDays,
        days_worked: daysWorked,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// Payment Methods (for forms)
// =============================================================================

export async function deleteVisit(id: string): Promise<ActionResult<null>> {
  try {
    await requireAdmin()
    if (!id || typeof id !== 'string') return { success: false, error: 'Invalid visit ID' }

    const supabase = await createClient()
    const { error } = await supabase
      .from('cp_patient_visits')
      .delete()
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    // Visits affect revenue/commission across all OPD pages — clear the entire subtree
    revalidatePath('/opd', 'layout')
    return { success: true, data: null }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function deletePatient(id: string): Promise<ActionResult<null>> {
  try {
    await requireAdmin()
    if (!id || typeof id !== 'string') return { success: false, error: 'Invalid patient ID' }

    const supabase = await createClient()

    // Hard-delete all visits first — they are financial records with no deleted_at column,
    // and leaving them would keep the revenue/commission on doctor profiles intact.
    const { error: visitsError } = await supabase
      .from('cp_patient_visits')
      .delete()
      .eq('patient_id', id)

    if (visitsError) return { success: false, error: visitsError.message }

    // Soft-delete the patient record
    const { error } = await supabase
      .from('cp_patients')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)

    if (error) return { success: false, error: error.message }

    // Visits affect revenue/commission across all OPD pages
    revalidatePath('/opd', 'layout')
    return { success: true, data: null }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// Cached inner query — pure DB read, no request-scoped auth context
const _cachedGetActivePaymentMethods = unstable_cache(
  async () => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cp_payment_methods')
      .select('id, method, label, is_enabled, sort_order')
      .eq('is_enabled', true)
      .order('sort_order', { ascending: true })
    if (error) throw new Error(error.message)
    return data ?? []
  },
  ['active-payment-methods'],
  { revalidate: 86400, tags: ['payment-methods'] }
)

export async function getActivePaymentMethods(): Promise<ActionResult<Array<{ method: string; label: string }>>> {
  try {
    await requireAuth()
    const data = await _cachedGetActivePaymentMethods()
    return { success: true, data: data as Array<{ method: string; label: string }> }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
