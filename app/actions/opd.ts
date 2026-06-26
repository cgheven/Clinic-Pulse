'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { validateFinancialDate } from '@/lib/validate-date'
import type {
  CpPatient,
  CpDoctor,
  CpPatientVisit,
  CpBpLog,
  CpPaymentMethod,
  PaginatedResponse,
} from '@/types/index'

// =============================================================================
// Return type
// =============================================================================

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================================================
// Enriched types
// =============================================================================

export type PatientWithVisitCount = CpPatient & {
  visit_count: number
  last_visit_date: string | null
}

export type DoctorWithTodayStats = CpDoctor & {
  today_visits: number
  today_revenue: number // paisas
  current_commission_pct: number | null // basis points
}

export type VisitWithRelations = CpPatientVisit & {
  patient: Pick<CpPatient, 'id' | 'full_name' | 'patient_no' | 'phone'>
  doctor: Pick<CpDoctor, 'id' | 'full_name' | 'specialty'> | null
  payment_method: Pick<CpPaymentMethod, 'id' | 'name' | 'slug'> | null
}

export type PatientDetail = CpPatient & {
  visits: VisitWithRelations[]
  bp_logs: CpBpLog[]
}

export type DoctorDetail = CpDoctor & {
  current_commission_pct: number | null
  visits_this_month: number
  revenue_this_month: number // paisas
  earnings_this_month: number // paisas
}

export type OpdDashboardStats = {
  today_visits: number
  today_revenue: number // paisas
  today_patients: number
  month_visits: number
  month_revenue: number // paisas
  doctor_stats: DoctorTodayStat[]
}

export type DoctorTodayStat = {
  doctor_id: string
  doctor_name: string
  specialty: string | null
  today_visits: number
  today_revenue: number // paisas
}

export type DoctorEarningsResult = {
  doctor: CpDoctor
  month: string // 'YYYY-MM'
  earning_model: 'salaried' | 'commission'
  total_visits: number
  total_revenue: number // paisas
  commission_pct: number | null // basis points
  gross_earnings: number // paisas
  working_days_in_month: number
  days_worked: number
}

export type DailyVisitSummary = {
  date: string
  visits: VisitWithRelations[]
  total_visits: number
  total_revenue: number // paisas
  total_discount: number // paisas
}

// =============================================================================
// Zod Schemas
// =============================================================================

const createPatientSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(200),
  father_name: z.string().max(200).nullable().optional(),
  gender: z.enum(['male', 'female', 'other']),
  date_of_birth: z.string().nullable().optional(),
  age_years: z.number().int().min(0).max(150).nullable().optional(),
  blood_group: z
    .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'])
    .default('unknown'),
  cnic: z.string().max(20).nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  known_allergies: z.string().max(1000).nullable().optional(),
  chronic_conditions: z.string().max(1000).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  referred_by: z.string().max(200).nullable().optional(),
})

const updatePatientSchema = createPatientSchema.partial()

const recordVisitSchema = z.object({
  patient_id: z.string().uuid('Invalid patient ID'),
  doctor_id: z.string().uuid('Invalid doctor ID').nullable().optional(),
  visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  visit_time: z.string().optional(),
  chief_complaint: z.string().max(1000).nullable().optional(),
  diagnosis: z.string().max(2000).nullable().optional(),
  prescription: z.string().max(5000).nullable().optional(),
  consultation_fee: z.number().int().min(0, 'Fee cannot be negative'),
  discount_amount: z.number().int().min(0, 'Discount cannot be negative').default(0),
  payment_method_id: z.string().uuid().nullable().optional(),
  payment_status: z
    .enum(['pending', 'completed', 'cancelled', 'refunded'])
    .default('completed'),
  follow_up_date: z.string().nullable().optional(),
  is_follow_up: z.boolean().default(false),
  notes: z.string().max(2000).nullable().optional(),
})

const addBpLogSchema = z.object({
  systolic: z.number().int().min(50).max(300),
  diastolic: z.number().int().min(30).max(200),
  pulse: z.number().int().min(30).max(250).nullable().optional(),
  visit_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

// =============================================================================
// Internal helpers
// =============================================================================

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!
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
    .select('value')
    .eq('setting_group', 'salary')
    .eq('key', 'working_days')
    .single()

  if (data?.value) {
    const v = parseInt(data.value, 10)
    if (!isNaN(v) && v > 0) return v
  }
  // Fall back to clinic working_days array length
  const { data: clinicData } = await supabase
    .from('cp_settings')
    .select('value')
    .eq('setting_group', 'clinic')
    .eq('key', 'working_days')
    .single()

  if (clinicData?.value) {
    try {
      const days = JSON.parse(clinicData.value) as string[]
      // average: days-per-week * ~4.33 weeks
      return Math.round(days.length * 4.33)
    } catch {
      // ignore
    }
  }
  return 26 // default
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

    // Today's visits
    const { data: todayVisits, error: tvErr } = await supabase
      .from('cp_patient_visits')
      .select('id, patient_id, doctor_id, net_fee')
      .eq('visit_date', today)
      .is('deleted_at', null)

    if (tvErr) return { success: false, error: tvErr.message }

    // Month visits
    const { data: monthVisits, error: mvErr } = await supabase
      .from('cp_patient_visits')
      .select('id, net_fee')
      .gte('visit_date', monthStart)
      .lte('visit_date', today)
      .is('deleted_at', null)

    if (mvErr) return { success: false, error: mvErr.message }

    // Doctor stats for today
    const doctorIds = [
      ...new Set((todayVisits ?? []).filter((v) => v.doctor_id).map((v) => v.doctor_id!)),
    ]

    let doctorStats: DoctorTodayStat[] = []
    if (doctorIds.length > 0) {
      const { data: doctors } = await supabase
        .from('cp_doctors')
        .select('id, full_name, specialty')
        .in('id', doctorIds)

      const doctorMap = new Map((doctors ?? []).map((d) => [d.id, d]))

      const statMap = new Map<string, { visits: number; revenue: number }>()
      for (const v of todayVisits ?? []) {
        if (v.doctor_id) {
          const cur = statMap.get(v.doctor_id) ?? { visits: 0, revenue: 0 }
          statMap.set(v.doctor_id, {
            visits: cur.visits + 1,
            revenue: cur.revenue + (v.net_fee ?? 0),
          })
        }
      }

      doctorStats = Array.from(statMap.entries()).map(([did, stat]) => {
        const doc = doctorMap.get(did)
        return {
          doctor_id: did,
          doctor_name: doc?.full_name ?? 'Unknown',
          specialty: doc?.specialty ?? null,
          today_visits: stat.visits,
          today_revenue: stat.revenue,
        }
      })
    }

    const todayRevenue = (todayVisits ?? []).reduce((s, v) => s + (v.net_fee ?? 0), 0)
    const todayPatients = new Set((todayVisits ?? []).map((v) => v.patient_id)).size
    const monthRevenue = (monthVisits ?? []).reduce((s, v) => s + (v.net_fee ?? 0), 0)

    return {
      success: true,
      data: {
        today_visits: (todayVisits ?? []).length,
        today_revenue: todayRevenue,
        today_patients: todayPatients,
        month_visits: (monthVisits ?? []).length,
        month_revenue: monthRevenue,
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
}): Promise<ActionResult<PaginatedResponse<PatientWithVisitCount>>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const page = Math.max(1, params.page ?? 1)
    const limit = Math.min(100, Math.max(1, params.limit ?? 20))
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
      query = query.or(
        `full_name.ilike.%${term}%,phone.ilike.%${term}%,patient_no.ilike.%${term}%,cnic.ilike.%${term}%`
      )
    }

    const { data, error, count } = await query

    if (error) return { success: false, error: error.message }

    const patients = (data ?? []) as CpPatient[]

    // Fetch visit counts per patient
    let enriched: PatientWithVisitCount[] = patients.map((p) => ({
      ...p,
      visit_count: 0,
      last_visit_date: null,
    }))

    if (patients.length > 0) {
      const patientIds = patients.map((p) => p.id)

      const { data: visitData } = await supabase
        .from('cp_patient_visits')
        .select('patient_id, visit_date')
        .in('patient_id', patientIds)
        .is('deleted_at', null)
        .order('visit_date', { ascending: false })

      const visitMap = new Map<string, { count: number; lastDate: string | null }>()
      for (const v of visitData ?? []) {
        const cur = visitMap.get(v.patient_id) ?? { count: 0, lastDate: null }
        visitMap.set(v.patient_id, {
          count: cur.count + 1,
          lastDate: cur.lastDate ?? v.visit_date,
        })
      }

      enriched = patients.map((p) => {
        const stat = visitMap.get(p.id)
        return {
          ...p,
          visit_count: stat?.count ?? 0,
          last_visit_date: stat?.lastDate ?? null,
        }
      })
    }

    const totalCount = count ?? 0

    return {
      success: true,
      data: {
        data: enriched,
        count: totalCount,
        page,
        pageSize: limit,
        totalPages: Math.ceil(totalCount / limit),
      },
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

    const { data: patient, error: pErr } = await supabase
      .from('cp_patients')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (pErr || !patient) return { success: false, error: pErr?.message ?? 'Patient not found' }

    // Fetch visits with relations
    const { data: visitRows, error: vErr } = await supabase
      .from('cp_patient_visits')
      .select(
        `*,
        cp_doctors(id, full_name, specialty),
        cp_payment_methods(id, name, slug)`
      )
      .eq('patient_id', id)
      .is('deleted_at', null)
      .order('visit_date', { ascending: false })
      .order('visit_time', { ascending: false })

    if (vErr) return { success: false, error: vErr.message }

    const visits: VisitWithRelations[] = (visitRows ?? []).map((v) => {
      const { cp_doctors, cp_payment_methods, ...visit } = v as typeof v & {
        cp_doctors: Pick<CpDoctor, 'id' | 'full_name' | 'specialty'> | null
        cp_payment_methods: Pick<CpPaymentMethod, 'id' | 'name' | 'slug'> | null
      }
      return {
        ...(visit as CpPatientVisit),
        patient: {
          id: patient.id,
          full_name: patient.full_name,
          patient_no: patient.patient_no,
          phone: patient.phone,
        },
        doctor: cp_doctors ?? null,
        payment_method: cp_payment_methods ?? null,
      }
    })

    // Fetch BP logs
    const { data: bpRows, error: bpErr } = await supabase
      .from('cp_bp_logs')
      .select('*')
      .eq('patient_id', id)
      .order('measured_at', { ascending: false })

    if (bpErr) return { success: false, error: bpErr.message }

    return {
      success: true,
      data: {
        ...(patient as CpPatient),
        visits,
        bp_logs: (bpRows ?? []) as CpBpLog[],
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function createPatient(rawData: unknown): Promise<ActionResult<CpPatient>> {
  try {
    const authUser = await requireAuth()

    const parsed = createPatientSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_patients')
      .insert({
        ...parsed.data,
        patient_no: '', // will be auto-generated by trigger
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/opd/patients')
    return { success: true, data: data as CpPatient }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function updatePatient(
  id: string,
  rawData: unknown
): Promise<ActionResult<CpPatient>> {
  try {
    await requireAuth()

    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid patient ID' }

    const parsed = updatePatientSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_patients')
      .update(parsed.data)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/opd/patients')
    revalidatePath(`/opd/patients/${id}`)
    return { success: true, data: data as CpPatient }
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

    const [doctorsRes, commissionsRes, visitsRes] = await Promise.all([
      supabase
        .from('cp_doctors')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('full_name', { ascending: true }),
      supabase
        .from('cp_doctor_commissions')
        .select('doctor_id, commission_pct')
        .is('effective_to', null),
      supabase
        .from('cp_patient_visits')
        .select('doctor_id, net_fee')
        .eq('visit_date', today)
        .is('deleted_at', null)
        .not('doctor_id', 'is', null),
    ])

    if (doctorsRes.error) return { success: false, error: doctorsRes.error.message }

    const commMap = new Map<string, number>()
    for (const c of commissionsRes.data ?? []) {
      commMap.set(c.doctor_id, c.commission_pct)
    }

    const visitStatMap = new Map<string, { visits: number; revenue: number }>()
    for (const v of visitsRes.data ?? []) {
      if (v.doctor_id) {
        const cur = visitStatMap.get(v.doctor_id) ?? { visits: 0, revenue: 0 }
        visitStatMap.set(v.doctor_id, {
          visits: cur.visits + 1,
          revenue: cur.revenue + (v.net_fee ?? 0),
        })
      }
    }

    const result: DoctorWithTodayStats[] = (doctorsRes.data as CpDoctor[]).map((d) => {
      const stat = visitStatMap.get(d.id)
      return {
        ...d,
        today_visits: stat?.visits ?? 0,
        today_revenue: stat?.revenue ?? 0,
        current_commission_pct: commMap.get(d.id) ?? null,
      }
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
    const currentMonth = today.slice(0, 7)

    const [docRes, commRes, monthVisitsRes] = await Promise.all([
      supabase.from('cp_doctors').select('*').eq('id', id).is('deleted_at', null).single(),
      supabase
        .from('cp_doctor_commissions')
        .select('commission_pct')
        .eq('doctor_id', id)
        .is('effective_to', null)
        .maybeSingle(),
      supabase
        .from('cp_patient_visits')
        .select('id, net_fee')
        .eq('doctor_id', id)
        .gte('visit_date', monthStart)
        .lte('visit_date', today)
        .is('deleted_at', null),
    ])

    if (docRes.error || !docRes.data)
      return { success: false, error: docRes.error?.message ?? 'Doctor not found' }

    const doctor = docRes.data as CpDoctor
    const commPct = commRes.data?.commission_pct ?? null
    const monthVisits = (monthVisitsRes.data ?? []).length
    const monthRevenue = (monthVisitsRes.data ?? []).reduce((s, v) => s + (v.net_fee ?? 0), 0)

    // Calculate earnings
    const earningsResult = await getDoctorEarnings(id, currentMonth)
    const earnings = earningsResult.success ? earningsResult.data.gross_earnings : 0

    return {
      success: true,
      data: {
        ...doctor,
        current_commission_pct: commPct,
        visits_this_month: monthVisits,
        revenue_this_month: monthRevenue,
        earnings_this_month: earnings,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// Visits
// =============================================================================

export async function recordVisit(rawData: unknown): Promise<ActionResult<CpPatientVisit>> {
  try {
    const authUser = await requireAuth()

    const parsed = recordVisitSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const { consultation_fee, discount_amount } = parsed.data
    if (discount_amount > consultation_fee) {
      return { success: false, error: 'Discount cannot exceed consultation fee' }
    }

    // SECURITY FIX (FINDING-006): Prevent backdating of visit/financial records
    const dateCheck = validateFinancialDate(parsed.data.visit_date)
    if (!dateCheck.valid) {
      return { success: false, error: dateCheck.error }
    }

    const supabase = await createClient()

    const visitTime =
      parsed.data.visit_time ??
      new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'Asia/Karachi' })

    const { data, error } = await supabase
      .from('cp_patient_visits')
      .insert({
        patient_id: parsed.data.patient_id,
        doctor_id: parsed.data.doctor_id ?? null,
        visit_date: parsed.data.visit_date,
        visit_time: visitTime,
        chief_complaint: parsed.data.chief_complaint ?? null,
        diagnosis: parsed.data.diagnosis ?? null,
        prescription: parsed.data.prescription ?? null,
        consultation_fee: parsed.data.consultation_fee,
        discount_amount: parsed.data.discount_amount,
        payment_method_id: parsed.data.payment_method_id ?? null,
        payment_status: parsed.data.payment_status,
        follow_up_date: parsed.data.follow_up_date ?? null,
        is_follow_up: parsed.data.is_follow_up,
        notes: parsed.data.notes ?? null,
        created_by: authUser.id,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/opd')
    revalidatePath('/opd/visits')
    revalidatePath(`/opd/patients/${parsed.data.patient_id}`)
    return { success: true, data: data as CpPatientVisit }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function getDailyVisits(date: string): Promise<ActionResult<DailyVisitSummary>> {
  try {
    await requireAuth()

    const dateParsed = z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .safeParse(date)
    if (!dateParsed.success) return { success: false, error: 'Invalid date format' }

    const supabase = await createClient()

    const { data: visitRows, error } = await supabase
      .from('cp_patient_visits')
      .select(
        `*,
        cp_patients(id, full_name, patient_no, phone),
        cp_doctors(id, full_name, specialty),
        cp_payment_methods(id, name, slug)`
      )
      .eq('visit_date', date)
      .is('deleted_at', null)
      .order('visit_time', { ascending: true })

    if (error) return { success: false, error: error.message }

    const visits: VisitWithRelations[] = (visitRows ?? []).map((v) => {
      const { cp_patients, cp_doctors, cp_payment_methods, ...visit } = v as typeof v & {
        cp_patients: Pick<CpPatient, 'id' | 'full_name' | 'patient_no' | 'phone'> | null
        cp_doctors: Pick<CpDoctor, 'id' | 'full_name' | 'specialty'> | null
        cp_payment_methods: Pick<CpPaymentMethod, 'id' | 'name' | 'slug'> | null
      }
      return {
        ...(visit as CpPatientVisit),
        patient: cp_patients ?? {
          id: visit.patient_id,
          full_name: 'Unknown',
          patient_no: '',
          phone: null,
        },
        doctor: cp_doctors ?? null,
        payment_method: cp_payment_methods ?? null,
      }
    })

    const totalRevenue = visits.reduce((s, v) => s + v.net_fee, 0)
    const totalDiscount = visits.reduce((s, v) => s + v.discount_amount, 0)

    return {
      success: true,
      data: {
        date,
        visits,
        total_visits: visits.length,
        total_revenue: totalRevenue,
        total_discount: totalDiscount,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// BP Logs
// =============================================================================

export async function addBpLog(
  patientId: string,
  rawData: unknown
): Promise<ActionResult<CpBpLog>> {
  try {
    const authUser = await requireAuth()

    const idParsed = z.string().uuid().safeParse(patientId)
    if (!idParsed.success) return { success: false, error: 'Invalid patient ID' }

    const parsed = addBpLogSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_bp_logs')
      .insert({
        patient_id: patientId,
        visit_id: parsed.data.visit_id ?? null,
        systolic: parsed.data.systolic,
        diastolic: parsed.data.diastolic,
        pulse: parsed.data.pulse ?? null,
        measured_at: new Date().toISOString(),
        notes: parsed.data.notes ?? null,
        recorded_by: authUser.id,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath(`/opd/patients/${patientId}`)
    return { success: true, data: data as CpBpLog }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// Doctor Earnings (server-side only)
// =============================================================================

export async function getDoctorEarnings(
  doctorId: string,
  month: string // 'YYYY-MM'
): Promise<ActionResult<DoctorEarningsResult>> {
  try {
    await requireAuth()

    const idParsed = z.string().uuid().safeParse(doctorId)
    if (!idParsed.success) return { success: false, error: 'Invalid doctor ID' }

    const monthParsed = z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .safeParse(month)
    if (!monthParsed.success) return { success: false, error: 'Invalid month format (YYYY-MM)' }

    const supabase = await createClient()

    const from = firstDayOfMonth(month)
    const to = lastDayOfMonth(month)

    const [docRes, commRes, visitsRes, workingDays] = await Promise.all([
      supabase.from('cp_doctors').select('*').eq('id', doctorId).is('deleted_at', null).single(),
      supabase
        .from('cp_doctor_commissions')
        .select('commission_pct')
        .eq('doctor_id', doctorId)
        .lte('effective_from', to)
        .or(`effective_to.is.null,effective_to.gte.${from}`)
        .order('effective_from', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('cp_patient_visits')
        .select('id, visit_date, net_fee')
        .eq('doctor_id', doctorId)
        .gte('visit_date', from)
        .lte('visit_date', to)
        .is('deleted_at', null),
      getWorkingDaysConfig(supabase),
    ])

    if (docRes.error || !docRes.data)
      return { success: false, error: docRes.error?.message ?? 'Doctor not found' }

    const doctor = docRes.data as CpDoctor
    const visits = visitsRes.data ?? []
    const totalRevenue = visits.reduce((s, v) => s + (v.net_fee ?? 0), 0)
    const totalVisits = visits.length

    // Days worked = unique visit dates
    const daysWorked = new Set(visits.map((v) => v.visit_date)).size

    let grossEarnings = 0
    const totalDaysInMonth = daysInMonth(month)

    if (doctor.earning_model === 'salaried') {
      const monthlySalary = doctor.monthly_salary ?? 0
      // Pro-rate: salary / working_days_in_month * days_worked
      grossEarnings =
        workingDays > 0 ? Math.round((monthlySalary / workingDays) * daysWorked) : monthlySalary
    } else {
      // Commission model
      const commPct = commRes.data?.commission_pct ?? 0
      grossEarnings = Math.round((totalRevenue * commPct) / 10000)
    }

    return {
      success: true,
      data: {
        doctor,
        month,
        earning_model: doctor.earning_model,
        total_visits: totalVisits,
        total_revenue: totalRevenue,
        commission_pct: commRes.data?.commission_pct ?? null,
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

export async function getActivePaymentMethods(): Promise<ActionResult<CpPaymentMethod[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) return { success: false, error: error.message }

    return { success: true, data: (data ?? []) as CpPaymentMethod[] }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function getActiveDoctors(): Promise<ActionResult<CpDoctor[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_doctors')
      .select('id, full_name, specialty, earning_model, is_active')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('full_name', { ascending: true })

    if (error) return { success: false, error: error.message }

    return { success: true, data: (data ?? []) as CpDoctor[] }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
