'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import type {
  CpDoctor,
  CpStaff,
  LabTestLogWithRelations,
  CpLabTest,
  CpPatient,
  CpPaymentMethod,
} from '@/types/index'

// =============================================================================
// Shared return type
// =============================================================================

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================================================
// Common sub-types
// =============================================================================

export type PaymentBreakdownItem = {
  method_id: string | null  // enum value e.g. 'cash'
  method_name: string
  amount: number // paisas
  count: number
}

// =============================================================================
// Daily Revenue Report types
// =============================================================================

export type DeptRevenueData = {
  total: number // paisas
  count: number
  payment_breakdown: PaymentBreakdownItem[]
}

export type DailyRevenueReport = {
  date: string
  clinic_name: string
  opd: DeptRevenueData
  pharmacy: DeptRevenueData
  lab: DeptRevenueData
  xray: DeptRevenueData
  grand_total: number // paisas
  payment_totals: PaymentBreakdownItem[]
}

// =============================================================================
// Doctor Earnings Report types
// =============================================================================

export type DoctorEarningEntry = {
  doctor_id: string
  doctor_name: string
  specialization: string | null
  earning_model: 'salaried' | 'commission'
  total_visits: number
  total_revenue: number // paisas
  commission_pct: number | null // percentage (0-100)
  monthly_salary: number | null // paisas
  gross_earnings: number // paisas
  days_worked: number
  working_days: number
}

export type DoctorEarningsReport = {
  month: string
  clinic_name: string
  entries: DoctorEarningEntry[]
  total_gross_earnings: number // paisas
  working_days_config: number
}

// =============================================================================
// Partner Payout Report types
// =============================================================================

export type PartnerPayoutEntry = {
  partner_id: string
  partner_name: string
  payout_amount: number // paisas (sum of split_amount)
  split_pct: number // percentage
}

export type PartnerPayoutReport = {
  month: string
  clinic_name: string
  total_xray_revenue: number // paisas
  entries: PartnerPayoutEntry[]
  total_payout: number // paisas
  clinic_share: number // paisas (revenue - total_payout)
}

// =============================================================================
// Expense Report types
// =============================================================================

export type ExpenseHeadRow = {
  head_id: string | null
  head_name: string
  total_amount: number // paisas
  item_count: number
}

export type DeptExpenseRow = {
  department: string | null
  dept_name: string
  total_amount: number // paisas
  by_head: ExpenseHeadRow[]
}

export type ExpenseReport = {
  month: string
  clinic_name: string
  by_department: DeptExpenseRow[]
  grand_total: number // paisas
  chart_data: { name: string; amount: number }[] // amount in PKR (not paisas) for recharts
}

// =============================================================================
// Payroll Report types
// =============================================================================

export type PayrollEntry = {
  staff_id: string
  name: string
  staff_type: string
  department: string | null
  monthly_salary: number // paisas
  working_days: number
  present_days: number // estimated / full month if no attendance
  earned_salary: number // paisas
  deductions: number // paisas
  net_salary: number // paisas
}

export type PayrollReport = {
  month: string
  clinic_name: string
  entries: PayrollEntry[]
  working_days_config: number
  total_base: number // paisas
  total_earned: number // paisas
  total_deductions: number // paisas
  total_net: number // paisas
}

// =============================================================================
// Lab Daily Report types
// =============================================================================

export type LabDailyReport = {
  date: string
  clinic_name: string
  entries: LabTestLogWithRelations[]
  total_tests: number
  total_revenue: number // paisas
  net_revenue: number // paisas
  payment_breakdown: PaymentBreakdownItem[]
}

// =============================================================================
// Internal helpers
// =============================================================================

function firstDayOfMonth(yearMonth: string): string {
  return `${yearMonth}-01`
}

function lastDayOfMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number)
  const last = new Date(year!, month!, 0)
  return `${yearMonth}-${String(last.getDate()).padStart(2, '0')}`
}

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

async function getWorkingDaysConfig(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<number> {
  // Try salary-specific working days setting first
  const { data: salaryData } = await supabase
    .from('cp_settings')
    .select('setting_value')
    .eq('setting_key', 'salary.working_days')
    .maybeSingle()
  if (salaryData?.setting_value) {
    const v =
      typeof salaryData.setting_value === 'number'
        ? salaryData.setting_value
        : parseInt(String(salaryData.setting_value), 10)
    if (!isNaN(v) && v > 0) return v
  }

  // Fall back to clinic working days array
  const { data: clinicData } = await supabase
    .from('cp_settings')
    .select('setting_value')
    .eq('setting_key', 'clinic.working_days')
    .maybeSingle()
  if (clinicData?.setting_value) {
    const val = clinicData.setting_value
    const days = Array.isArray(val) ? val : (() => { try { return JSON.parse(val as string) } catch { return null } })()
    if (Array.isArray(days)) return Math.round(days.length * 4.33)
  }
  return 26
}

function buildPaymentBreakdown(
  rows: Array<{ amount: number; method_id: string | null; method_name: string | null }>
): PaymentBreakdownItem[] {
  const map = new Map<string | null, PaymentBreakdownItem>()
  for (const r of rows) {
    const key = r.method_id
    const existing = map.get(key)
    if (existing) {
      existing.amount += r.amount
      existing.count += 1
    } else {
      map.set(key, {
        method_id: r.method_id,
        method_name: r.method_name ?? 'Cash / Unknown',
        amount: r.amount,
        count: 1,
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.amount - a.amount)
}

// =============================================================================
// getDailyRevenue
// =============================================================================

export async function getDailyRevenue(
  date: string
): Promise<ActionResult<DailyRevenueReport>> {
  try {
    await requireAuth()
    const dateParsed = z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .safeParse(date)
    if (!dateParsed.success) return { success: false, error: 'Invalid date format (YYYY-MM-DD)' }

    const supabase = await createClient()
    const [clinicName, pmRes, opdRes, pharmRes, labRes, xrayRes] = await Promise.all([
      getClinicName(supabase),
      // Fetch payment methods for label lookup (method → label)
      supabase
        .from('cp_payment_methods')
        .select('method, label')
        .eq('is_enabled', true),
      // OPD
      supabase
        .from('cp_patient_visits')
        .select('fee_paisas, payment_method')
        .eq('visit_date', date),
      // Pharmacy
      supabase
        .from('cp_pharmacy_sales')
        .select('total_paisas, payment_method')
        .eq('sale_date', date),
      // Lab
      supabase
        .from('cp_lab_test_logs')
        .select('price_paisas, payment_method')
        .eq('test_date', date),
      // X-Ray
      supabase
        .from('cp_xray_revenue')
        .select('amount_paisas, payment_method')
        .eq('revenue_date', date),
    ])

    // Build method enum → label map
    const pmMap = new Map<string, string>()
    for (const pm of pmRes.data ?? []) {
      pmMap.set(pm.method as string, pm.label as string)
    }

    function buildDept(
      rows: Array<{ amount: number; payment_method: string | null }> | null
    ): DeptRevenueData {
      const safe = rows ?? []
      const total = safe.reduce((s, r) => s + (r.amount ?? 0), 0)
      const breakdown = buildPaymentBreakdown(
        safe.map((r) => ({
          amount: r.amount ?? 0,
          method_id: r.payment_method,
          method_name: r.payment_method ? (pmMap.get(r.payment_method) ?? r.payment_method) : null,
        }))
      )
      return { total, count: safe.length, payment_breakdown: breakdown }
    }

    type OpdRow = { fee_paisas: number; payment_method: string | null }
    type PharmRow = { total_paisas: number; payment_method: string | null }
    type LabRow = { price_paisas: number; payment_method: string | null }
    type XrayRow = { amount_paisas: number; payment_method: string | null }

    const opd = buildDept(
      ((opdRes.data ?? []) as unknown as OpdRow[]).map((r) => ({
        amount: r.fee_paisas,
        payment_method: r.payment_method,
      }))
    )
    const pharmacy = buildDept(
      ((pharmRes.data ?? []) as unknown as PharmRow[]).map((r) => ({
        amount: r.total_paisas,
        payment_method: r.payment_method,
      }))
    )
    const lab = buildDept(
      ((labRes.data ?? []) as unknown as LabRow[]).map((r) => ({
        amount: r.price_paisas,
        payment_method: r.payment_method,
      }))
    )
    const xray = buildDept(
      ((xrayRes.data ?? []) as unknown as XrayRow[]).map((r) => ({
        amount: r.amount_paisas,
        payment_method: r.payment_method,
      }))
    )

    const grand_total = opd.total + pharmacy.total + lab.total + xray.total

    // Aggregate all payment totals
    const allRows = [
      ...((opdRes.data ?? []) as unknown as OpdRow[]).map((r) => ({
        amount: r.fee_paisas,
        method_id: r.payment_method,
        method_name: r.payment_method ? (pmMap.get(r.payment_method) ?? r.payment_method) : null,
      })),
      ...((pharmRes.data ?? []) as unknown as PharmRow[]).map((r) => ({
        amount: r.total_paisas,
        method_id: r.payment_method,
        method_name: r.payment_method ? (pmMap.get(r.payment_method) ?? r.payment_method) : null,
      })),
      ...((labRes.data ?? []) as unknown as LabRow[]).map((r) => ({
        amount: r.price_paisas,
        method_id: r.payment_method,
        method_name: r.payment_method ? (pmMap.get(r.payment_method) ?? r.payment_method) : null,
      })),
      ...((xrayRes.data ?? []) as unknown as XrayRow[]).map((r) => ({
        amount: r.amount_paisas,
        method_id: r.payment_method,
        method_name: r.payment_method ? (pmMap.get(r.payment_method) ?? r.payment_method) : null,
      })),
    ]
    const payment_totals = buildPaymentBreakdown(allRows)

    return {
      success: true,
      data: { date, clinic_name: clinicName, opd, pharmacy, lab, xray, grand_total, payment_totals },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getDoctorEarningsReport
// commission_pct is directly on cp_doctors (percentage 0-100)
// earnings = sum(fee_paisas) * commission_pct / 100
// =============================================================================

export async function getDoctorEarningsReport(
  month: string // YYYY-MM
): Promise<ActionResult<DoctorEarningsReport>> {
  try {
    await requireAuth()
    const monthParsed = z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .safeParse(month)
    if (!monthParsed.success) return { success: false, error: 'Invalid month format (YYYY-MM)' }

    const supabase = await createClient()
    const from = firstDayOfMonth(month)
    const to = lastDayOfMonth(month)

    const [clinicName, workingDays, doctorsRes, visitsRes] = await Promise.all([
      getClinicName(supabase),
      getWorkingDaysConfig(supabase),
      supabase
        .from('cp_doctors')
        .select('*')
        .is('deleted_at', null)
        .order('name', { ascending: true }),
      supabase
        .from('cp_patient_visits')
        .select('doctor_id, visit_date, fee_paisas')
        .gte('visit_date', from)
        .lte('visit_date', to)
        .not('doctor_id', 'is', null),
    ])

    if (doctorsRes.error) return { success: false, error: doctorsRes.error.message }

    const doctors = (doctorsRes.data ?? []) as CpDoctor[]

    // Build visit stats per doctor
    const visitMap = new Map<
      string,
      { visits: string[]; revenue: number; dates: Set<string> }
    >()
    for (const v of visitsRes.data ?? []) {
      const row = v as { doctor_id: string; visit_date: string; fee_paisas: number }
      if (!row.doctor_id) continue
      const cur = visitMap.get(row.doctor_id) ?? {
        visits: [],
        revenue: 0,
        dates: new Set<string>(),
      }
      cur.visits.push(row.doctor_id)
      cur.revenue += row.fee_paisas ?? 0
      cur.dates.add(row.visit_date)
      visitMap.set(row.doctor_id, cur)
    }

    const entries: DoctorEarningEntry[] = doctors.map((d) => {
      const stat = visitMap.get(d.id)
      const totalVisits = stat ? stat.visits.length : 0
      const totalRevenue = stat ? stat.revenue : 0
      const daysWorked = stat ? stat.dates.size : 0
      const commPct =
        (d as unknown as { commission_pct: number | null }).commission_pct ?? null

      let grossEarnings = 0
      if (d.earning_model === 'salaried') {
        const salary = d.monthly_salary ?? 0
        grossEarnings =
          workingDays > 0 ? Math.round((salary / workingDays) * daysWorked) : salary
      } else {
        // commission_pct is a percentage (0-100), not basis points
        grossEarnings = Math.round((totalRevenue * (commPct ?? 0)) / 100)
      }

      return {
        doctor_id: d.id,
        doctor_name: (d as unknown as { name: string }).name,
        specialization: (d as unknown as { specialization: string | null }).specialization ?? null,
        earning_model: d.earning_model,
        total_visits: totalVisits,
        total_revenue: totalRevenue,
        commission_pct: commPct,
        monthly_salary: d.monthly_salary,
        gross_earnings: grossEarnings,
        days_worked: daysWorked,
        working_days: workingDays,
      }
    })

    const total_gross_earnings = entries.reduce((s, e) => s + e.gross_earnings, 0)

    return {
      success: true,
      data: {
        month,
        clinic_name: clinicName,
        entries,
        total_gross_earnings,
        working_days_config: workingDays,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getPartnerPayoutReport
// split_pct on cp_xray_partners is a direct percentage (e.g. 50.00), not basis points
// =============================================================================

export async function getPartnerPayoutReport(
  month: string // YYYY-MM
): Promise<ActionResult<PartnerPayoutReport>> {
  try {
    await requireAuth()
    const monthParsed = z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .safeParse(month)
    if (!monthParsed.success) return { success: false, error: 'Invalid month format (YYYY-MM)' }

    const supabase = await createClient()
    const from = firstDayOfMonth(month)
    const to = lastDayOfMonth(month)

    const [clinicName, revenueRes, partnersRes] = await Promise.all([
      getClinicName(supabase),
      supabase
        .from('cp_xray_revenue')
        .select('id, amount_paisas')
        .gte('revenue_date', from)
        .lte('revenue_date', to),
      supabase
        .from('cp_xray_partners')
        .select('id, name, split_pct')
        .eq('is_active', true),
    ])

    if (revenueRes.error) return { success: false, error: revenueRes.error.message }
    if (partnersRes.error) return { success: false, error: partnersRes.error.message }

    type RevRow = { id: string; amount_paisas: number }
    const total_xray_revenue = ((revenueRes.data ?? []) as unknown as RevRow[]).reduce(
      (s, r) => s + (r.amount_paisas ?? 0),
      0
    )

    type PartnerRow = { id: string; name: string; split_pct: number }
    const entries: PartnerPayoutEntry[] = ((partnersRes.data ?? []) as unknown as PartnerRow[])
      .map((p) => ({
        partner_id: p.id,
        partner_name: p.name,
        payout_amount: Math.round((total_xray_revenue * (p.split_pct ?? 0)) / 100),
        split_pct: p.split_pct ?? 0,
      }))
      .sort((a, b) => b.payout_amount - a.payout_amount)

    const total_payout = entries.reduce((s, e) => s + e.payout_amount, 0)

    return {
      success: true,
      data: {
        month,
        clinic_name: clinicName,
        total_xray_revenue,
        entries,
        total_payout,
        clinic_share: total_xray_revenue - total_payout,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getExpenseReport
// =============================================================================

export async function getExpenseReport(
  month: string // YYYY-MM
): Promise<ActionResult<ExpenseReport>> {
  try {
    await requireAuth()
    const monthParsed = z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .safeParse(month)
    if (!monthParsed.success) return { success: false, error: 'Invalid month format (YYYY-MM)' }

    const supabase = await createClient()
    const from = firstDayOfMonth(month)
    const to = lastDayOfMonth(month)

    const [clinicName, expensesRes, headRes, labExpRes, xrayExpRes] = await Promise.all([
      getClinicName(supabase),
      // General expenses: department is enum, head_id is FK
      supabase
        .from('cp_expenses')
        .select('id, amount_paisas, department, head_id')
        .gte('expense_date', from)
        .lte('expense_date', to),
      supabase
        .from('cp_expense_heads')
        .select('id, name')
        .eq('is_active', true)
        .is('deleted_at', null),
      // Lab-specific expenses
      supabase
        .from('cp_lab_expenses')
        .select('id, amount, expense_head_id')
        .gte('expense_date', from)
        .lte('expense_date', to),
      // X-Ray-specific expenses
      supabase
        .from('cp_xray_expenses')
        .select('id, amount, expense_head_id')
        .gte('expense_date', from)
        .lte('expense_date', to),
    ])

    if (expensesRes.error) return { success: false, error: expensesRes.error.message }

    const headMap = new Map<string, string>()
    for (const h of headRes.data ?? []) headMap.set(h.id, h.name)

    function resolveHead(head_id: string | null): { id: string | null; name: string } {
      if (head_id && headMap.has(head_id)) return { id: head_id, name: headMap.get(head_id)! }
      return { id: null, name: 'General' }
    }

    const deptDataMap = new Map<
      string | null,
      { dept_name: string; heads: Map<string, { name: string; total: number; count: number }> }
    >()

    function addExpense(
      dept_id: string | null,
      dept_name: string,
      head_id: string | null,
      head_name: string,
      amount: number
    ) {
      if (!deptDataMap.has(dept_id)) {
        deptDataMap.set(dept_id, { dept_name, heads: new Map() })
      }
      const entry = deptDataMap.get(dept_id)!
      const hKey = head_id ?? `head:${head_name}`
      const existing = entry.heads.get(hKey)
      if (existing) {
        existing.total += amount
        existing.count += 1
      } else {
        entry.heads.set(hKey, { name: head_name, total: amount, count: 1 })
      }
    }

    // General expenses — department is a direct enum value
    for (const e of expensesRes.data ?? []) {
      const row = e as unknown as {
        amount_paisas: number
        department: string | null
        head_id: string | null
      }
      const dept_name = row.department ?? 'Cross-Department'
      const head = resolveHead(row.head_id)
      addExpense(row.department, dept_name, head.id, head.name, row.amount_paisas ?? 0)
    }

    // Lab expenses
    for (const e of labExpRes.data ?? []) {
      const row = e as unknown as { amount: number; expense_head_id: string | null }
      const head = resolveHead(row.expense_head_id)
      addExpense('lab', 'Laboratory', head.id, head.name, row.amount ?? 0)
    }

    // X-Ray expenses
    for (const e of xrayExpRes.data ?? []) {
      const row = e as unknown as { amount: number; expense_head_id: string | null }
      const head = resolveHead(row.expense_head_id)
      addExpense('xray', 'X-Ray', head.id, head.name, row.amount ?? 0)
    }

    const by_department: DeptExpenseRow[] = Array.from(deptDataMap.entries())
      .map(([dept_id, { dept_name, heads }]) => {
        const by_head: ExpenseHeadRow[] = Array.from(heads.values()).map((h) => ({
          head_id: null,
          head_name: h.name,
          total_amount: h.total,
          item_count: h.count,
        }))
        const total_amount = by_head.reduce((s, h) => s + h.total_amount, 0)
        return {
          department: dept_id,
          dept_name,
          total_amount,
          by_head,
        }
      })
      .sort((a, b) => b.total_amount - a.total_amount)

    const grand_total = by_department.reduce((s, d) => s + d.total_amount, 0)

    const chart_data = by_department.map((d) => ({
      name: d.dept_name,
      amount: Math.round((d.total_amount / 100) * 100) / 100, // PKR
    }))

    return {
      success: true,
      data: { month, clinic_name: clinicName, by_department, grand_total, chart_data },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getPayrollReport
// =============================================================================

export async function getPayrollReport(
  month: string // YYYY-MM
): Promise<ActionResult<PayrollReport>> {
  try {
    await requireAuth()
    const monthParsed = z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .safeParse(month)
    if (!monthParsed.success) return { success: false, error: 'Invalid month format (YYYY-MM)' }

    const supabase = await createClient()

    const [clinicName, workingDays, staffRes] = await Promise.all([
      getClinicName(supabase),
      getWorkingDaysConfig(supabase),
      supabase
        .from('cp_staff')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('name', { ascending: true }),
    ])

    if (staffRes.error) return { success: false, error: staffRes.error.message }

    const entries: PayrollEntry[] = (staffRes.data as CpStaff[]).map((s) => {
      const monthly_salary = s.monthly_salary ?? 0
      const present_days = workingDays
      const earned_salary = monthly_salary
      const deductions = 0
      const net_salary = earned_salary - deductions

      return {
        staff_id: s.id,
        name: s.name,
        staff_type: s.staff_type,
        department: s.department ?? null,
        monthly_salary,
        working_days: workingDays,
        present_days,
        earned_salary,
        deductions,
        net_salary,
      }
    })

    const total_base = entries.reduce((s, e) => s + e.monthly_salary, 0)
    const total_earned = entries.reduce((s, e) => s + e.earned_salary, 0)
    const total_deductions = entries.reduce((s, e) => s + e.deductions, 0)
    const total_net = entries.reduce((s, e) => s + e.net_salary, 0)

    return {
      success: true,
      data: {
        month,
        clinic_name: clinicName,
        entries,
        working_days_config: workingDays,
        total_base,
        total_earned,
        total_deductions,
        total_net,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getLabDailyReport
// =============================================================================

export async function getLabDailyReport(
  date: string
): Promise<ActionResult<LabDailyReport>> {
  try {
    await requireAuth()
    const dateParsed = z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .safeParse(date)
    if (!dateParsed.success) return { success: false, error: 'Invalid date format (YYYY-MM-DD)' }

    const supabase = await createClient()
    const [clinicName, logsRes, pmRes] = await Promise.all([
      getClinicName(supabase),
      supabase
        .from('cp_lab_test_logs')
        .select(
          `*,
          cp_lab_tests(id, test_name, test_code, category, unit, reference_range),
          cp_patients(id, name, patient_no, phone)`
        )
        .eq('test_date', date)
        .order('created_at', { ascending: true }),
      supabase
        .from('cp_payment_methods')
        .select('method, label')
        .eq('is_enabled', true),
    ])

    if (logsRes.error) return { success: false, error: logsRes.error.message }

    // Build method → label map
    const pmMap = new Map<string, string>()
    for (const pm of pmRes.data ?? []) pmMap.set(pm.method as string, pm.label as string)

    const entries: LabTestLogWithRelations[] = (logsRes.data ?? []).map((row) => {
      const { cp_lab_tests, cp_patients, ...log } = row as typeof row & {
        cp_lab_tests: CpLabTest | null
        cp_patients: Pick<CpPatient, 'id' | 'name' | 'patient_no' | 'phone'> | null
      }
      return {
        ...log,
        test: cp_lab_tests ?? undefined,
        patient: cp_patients ?? undefined,
        payment_method: undefined,
      } as unknown as LabTestLogWithRelations
    })

    const total_tests = entries.length
    const total_revenue = entries.reduce(
      (s, e) => s + ((e as unknown as { price_paisas: number }).price_paisas ?? 0),
      0
    )
    const net_revenue = total_revenue

    const paymentRows = entries.map((e) => {
      const method = (e as unknown as { payment_method: string | null }).payment_method
      return {
        amount: (e as unknown as { price_paisas: number }).price_paisas ?? 0,
        method_id: method ?? null,
        method_name: method ? (pmMap.get(method) ?? method) : null,
      }
    })
    const payment_breakdown = buildPaymentBreakdown(paymentRows)

    return {
      success: true,
      data: {
        date,
        clinic_name: clinicName,
        entries,
        total_tests,
        total_revenue,
        net_revenue,
        payment_breakdown,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

