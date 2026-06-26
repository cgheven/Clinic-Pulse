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
  method_id: string | null
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
  specialty: string | null
  earning_model: 'salaried' | 'commission'
  total_visits: number
  total_revenue: number // paisas
  commission_pct: number | null // basis points
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
  partner_type: string
  revenue_entries: number
  payout_amount: number // paisas (sum of split_amount)
  split_pct_display: number // basis points (last known pct)
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
  dept_id: string | null
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
  full_name: string
  designation: string
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
  total_discount: number // paisas
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

function daysInMonth(yearMonth: string): number {
  const [year, month] = yearMonth.split('-').map(Number)
  return new Date(year!, month!, 0).getDate()
}

async function getClinicName(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<string> {
  const { data } = await supabase
    .from('cp_settings')
    .select('value')
    .eq('setting_group', 'clinic')
    .eq('key', 'name')
    .maybeSingle()
  return data?.value ?? 'ClinicPulse'
}

async function getWorkingDaysConfig(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<number> {
  const { data } = await supabase
    .from('cp_settings')
    .select('value')
    .eq('setting_group', 'salary')
    .eq('key', 'working_days')
    .maybeSingle()
  if (data?.value) {
    const v = parseInt(data.value, 10)
    if (!isNaN(v) && v > 0) return v
  }
  const { data: clinicData } = await supabase
    .from('cp_settings')
    .select('value')
    .eq('setting_group', 'clinic')
    .eq('key', 'working_days')
    .maybeSingle()
  if (clinicData?.value) {
    try {
      const days = JSON.parse(clinicData.value) as string[]
      return Math.round(days.length * 4.33)
    } catch {
      // ignore
    }
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
      supabase
        .from('cp_payment_methods')
        .select('id, name')
        .eq('is_active', true),
      // OPD
      supabase
        .from('cp_patient_visits')
        .select('net_fee, payment_method_id')
        .eq('visit_date', date)
        .eq('payment_status', 'completed')
        .is('deleted_at', null),
      // Pharmacy
      supabase
        .from('cp_pharmacy_sales')
        .select('total_amount, payment_method_id')
        .eq('sale_date', date)
        .eq('payment_status', 'completed')
        .is('deleted_at', null),
      // Lab
      supabase
        .from('cp_lab_test_logs')
        .select('total_amount, payment_method_id')
        .eq('log_date', date)
        .eq('payment_status', 'completed')
        .is('deleted_at', null),
      // X-Ray
      supabase
        .from('cp_xray_revenue')
        .select('gross_amount, payment_method_id')
        .eq('revenue_date', date)
        .eq('payment_status', 'completed')
        .is('deleted_at', null),
    ])

    const pmMap = new Map<string, string>()
    for (const pm of pmRes.data ?? []) {
      pmMap.set(pm.id, pm.name)
    }

    function buildDept(
      rows: Array<{ amount: number; payment_method_id: string | null }> | null
    ): DeptRevenueData {
      const safe = rows ?? []
      const total = safe.reduce((s, r) => s + (r.amount ?? 0), 0)
      const breakdown = buildPaymentBreakdown(
        safe.map((r) => ({
          amount: r.amount ?? 0,
          method_id: r.payment_method_id,
          method_name: r.payment_method_id ? (pmMap.get(r.payment_method_id) ?? null) : null,
        }))
      )
      return { total, count: safe.length, payment_breakdown: breakdown }
    }

    const opd = buildDept(
      (opdRes.data ?? []).map((r) => ({ amount: r.net_fee, payment_method_id: r.payment_method_id }))
    )
    const pharmacy = buildDept(
      (pharmRes.data ?? []).map((r) => ({
        amount: r.total_amount,
        payment_method_id: r.payment_method_id,
      }))
    )
    const lab = buildDept(
      (labRes.data ?? []).map((r) => ({
        amount: r.total_amount,
        payment_method_id: r.payment_method_id,
      }))
    )
    const xray = buildDept(
      (xrayRes.data ?? []).map((r) => ({
        amount: r.gross_amount,
        payment_method_id: r.payment_method_id,
      }))
    )

    const grand_total = opd.total + pharmacy.total + lab.total + xray.total

    // Aggregate all payment totals
    const allRows = [
      ...(opdRes.data ?? []).map((r) => ({
        amount: r.net_fee,
        method_id: r.payment_method_id,
        method_name: r.payment_method_id ? (pmMap.get(r.payment_method_id) ?? null) : null,
      })),
      ...(pharmRes.data ?? []).map((r) => ({
        amount: r.total_amount,
        method_id: r.payment_method_id,
        method_name: r.payment_method_id ? (pmMap.get(r.payment_method_id) ?? null) : null,
      })),
      ...(labRes.data ?? []).map((r) => ({
        amount: r.total_amount,
        method_id: r.payment_method_id,
        method_name: r.payment_method_id ? (pmMap.get(r.payment_method_id) ?? null) : null,
      })),
      ...(xrayRes.data ?? []).map((r) => ({
        amount: r.gross_amount,
        method_id: r.payment_method_id,
        method_name: r.payment_method_id ? (pmMap.get(r.payment_method_id) ?? null) : null,
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

    const [clinicName, workingDays, doctorsRes, commissionsRes, visitsRes] = await Promise.all([
      getClinicName(supabase),
      getWorkingDaysConfig(supabase),
      supabase
        .from('cp_doctors')
        .select('*')
        .is('deleted_at', null)
        .order('full_name', { ascending: true }),
      supabase
        .from('cp_doctor_commissions')
        .select('doctor_id, commission_pct, effective_from, effective_to')
        .lte('effective_from', to),
      supabase
        .from('cp_patient_visits')
        .select('doctor_id, visit_date, net_fee')
        .gte('visit_date', from)
        .lte('visit_date', to)
        .is('deleted_at', null)
        .not('doctor_id', 'is', null),
    ])

    if (doctorsRes.error) return { success: false, error: doctorsRes.error.message }

    const doctors = (doctorsRes.data ?? []) as CpDoctor[]

    // Build commission map: doctor_id → active commission for this month
    const commMap = new Map<string, number>()
    for (const c of commissionsRes.data ?? []) {
      // Pick the most recent commission that was effective during this month
      const effectiveTo = c.effective_to
      if (effectiveTo && effectiveTo < from) continue
      if (!commMap.has(c.doctor_id)) {
        commMap.set(c.doctor_id, c.commission_pct)
      }
    }

    // Build visit stats per doctor
    const visitMap = new Map<string, { visits: CpDoctor['id'][]; revenue: number; dates: Set<string> }>()
    for (const v of visitsRes.data ?? []) {
      if (!v.doctor_id) continue
      const cur = visitMap.get(v.doctor_id) ?? { visits: [], revenue: 0, dates: new Set<string>() }
      cur.visits.push(v.doctor_id)
      cur.revenue += v.net_fee ?? 0
      cur.dates.add(v.visit_date)
      visitMap.set(v.doctor_id, cur)
    }

    const entries: DoctorEarningEntry[] = doctors.map((d) => {
      const stat = visitMap.get(d.id)
      const totalVisits = stat ? stat.visits.length : 0
      const totalRevenue = stat ? stat.revenue : 0
      const daysWorked = stat ? stat.dates.size : 0
      const commPct = commMap.get(d.id) ?? null

      let grossEarnings = 0
      if (d.earning_model === 'salaried') {
        const salary = d.monthly_salary ?? 0
        grossEarnings =
          workingDays > 0 ? Math.round((salary / workingDays) * daysWorked) : salary
      } else {
        grossEarnings = Math.round((totalRevenue * (commPct ?? 0)) / 10000)
      }

      return {
        doctor_id: d.id,
        doctor_name: d.full_name,
        specialty: d.specialty,
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
        .select('id, gross_amount')
        .gte('revenue_date', from)
        .lte('revenue_date', to)
        .is('deleted_at', null),
      supabase
        .from('cp_xray_partners')
        .select('id, partner_name, partner_type')
        .is('deleted_at', null),
    ])

    if (revenueRes.error) return { success: false, error: revenueRes.error.message }
    if (partnersRes.error) return { success: false, error: partnersRes.error.message }

    const revenueIds = (revenueRes.data ?? []).map((r) => r.id)
    const total_xray_revenue = (revenueRes.data ?? []).reduce(
      (s, r) => s + (r.gross_amount ?? 0),
      0
    )

    let splitsRes: {
      data: { partner_id: string; split_pct: number; split_amount: number | null; revenue_id: string }[] | null
      error: { message: string } | null
    } | null = null

    if (revenueIds.length > 0) {
      splitsRes = await supabase
        .from('cp_xray_partner_splits')
        .select('partner_id, split_pct, split_amount, revenue_id')
        .in('revenue_id', revenueIds)
        .is('deleted_at', null)
    }

    const partnerMap = new Map<string, { partner_name: string; partner_type: string }>()
    for (const p of partnersRes.data ?? []) {
      partnerMap.set(p.id, { partner_name: p.partner_name, partner_type: p.partner_type })
    }

    // Aggregate by partner
    const payoutMap = new Map<
      string,
      { payout_amount: number; revenue_entries: number; last_pct: number }
    >()

    for (const s of splitsRes?.data ?? []) {
      const cur = payoutMap.get(s.partner_id) ?? { payout_amount: 0, revenue_entries: 0, last_pct: 0 }
      payoutMap.set(s.partner_id, {
        payout_amount: cur.payout_amount + (s.split_amount ?? 0),
        revenue_entries: cur.revenue_entries + 1,
        last_pct: s.split_pct,
      })
    }

    const entries: PartnerPayoutEntry[] = Array.from(payoutMap.entries())
      .map(([pid, stat]) => {
        const partner = partnerMap.get(pid)
        return {
          partner_id: pid,
          partner_name: partner?.partner_name ?? 'Unknown Partner',
          partner_type: partner?.partner_type ?? '',
          revenue_entries: stat.revenue_entries,
          payout_amount: stat.payout_amount,
          split_pct_display: stat.last_pct,
        }
      })
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

    const [clinicName, expensesRes, deptRes, headRes, labExpRes, xrayExpRes] = await Promise.all([
      getClinicName(supabase),
      // General expenses (cp_expenses) with department and head
      supabase
        .from('cp_expenses')
        .select('id, amount, department_id, expense_head_id, custom_head')
        .gte('expense_date', from)
        .lte('expense_date', to)
        .is('deleted_at', null),
      supabase
        .from('cp_departments')
        .select('id, name')
        .eq('is_active', true),
      supabase
        .from('cp_expense_heads')
        .select('id, name')
        .eq('is_active', true)
        .is('deleted_at', null),
      // Lab-specific expenses
      supabase
        .from('cp_lab_expenses')
        .select('id, amount, expense_head_id, custom_head')
        .gte('expense_date', from)
        .lte('expense_date', to)
        .is('deleted_at', null),
      // X-Ray-specific expenses
      supabase
        .from('cp_xray_expenses')
        .select('id, amount, expense_head_id, custom_head')
        .gte('expense_date', from)
        .lte('expense_date', to)
        .is('deleted_at', null),
    ])

    if (expensesRes.error) return { success: false, error: expensesRes.error.message }

    const deptMap = new Map<string, string>()
    for (const d of deptRes.data ?? []) deptMap.set(d.id, d.name)

    const headMap = new Map<string, string>()
    for (const h of headRes.data ?? []) headMap.set(h.id, h.name)

    function resolveHead(head_id: string | null, custom: string | null): { id: string | null; name: string } {
      if (head_id && headMap.has(head_id)) return { id: head_id, name: headMap.get(head_id)! }
      if (custom) return { id: null, name: custom }
      return { id: null, name: 'General' }
    }

    // Group cp_expenses by department
    const deptExpMap = new Map<
      string | null,
      Map<string | null, { name: string; total: number; count: number }>
    >()

    function addToDept(
      dept_id: string | null,
      dept_name: string,
      head_id: string | null,
      head_name: string,
      amount: number
    ) {
      const key = dept_id
      if (!deptExpMap.has(key)) deptExpMap.set(key, new Map())
      const headMap2 = deptExpMap.get(key)!
      const hKey = head_id ?? head_name
      const existing = headMap2.get(hKey)
      if (existing) {
        existing.total += amount
        existing.count += 1
      } else {
        headMap2.set(hKey, { name: head_name, total: amount, count: 1 })
      }
      // Store dept_name in parent map entry — tag onto key string
      if (!deptExpMap.has(`__name__${key}`)) {
        deptExpMap.set(`__name__${key}` as unknown as null, new Map([['__dept_name__', { name: dept_name, total: 0, count: 0 }]]))
      }
    }

    // Simplified approach: use separate maps
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
      const hKey = head_id ?? `custom:${head_name}`
      const existing = entry.heads.get(hKey)
      if (existing) {
        existing.total += amount
        existing.count += 1
      } else {
        entry.heads.set(hKey, { name: head_name, total: amount, count: 1 })
      }
    }

    for (const e of expensesRes.data ?? []) {
      const dept_name = e.department_id ? (deptMap.get(e.department_id) ?? 'Unknown Dept') : 'Cross-Department'
      const head = resolveHead(e.expense_head_id, e.custom_head)
      addExpense(e.department_id, dept_name, head.id, head.name, e.amount ?? 0)
    }

    // Lab expenses → Lab department
    for (const e of labExpRes.data ?? []) {
      const head = resolveHead(e.expense_head_id, e.custom_head)
      addExpense('lab', 'Laboratory', head.id, head.name, e.amount ?? 0)
    }

    // X-Ray expenses → X-Ray department
    for (const e of xrayExpRes.data ?? []) {
      const head = resolveHead(e.expense_head_id, e.custom_head)
      addExpense('xray', 'X-Ray', head.id, head.name, e.amount ?? 0)
    }

    const by_department: DeptExpenseRow[] = Array.from(deptDataMap.entries()).map(
      ([dept_id, { dept_name, heads }]) => {
        const by_head: ExpenseHeadRow[] = Array.from(heads.values()).map((h) => ({
          head_id: null,
          head_name: h.name,
          total_amount: h.total,
          item_count: h.count,
        }))
        const total_amount = by_head.reduce((s, h) => s + h.total_amount, 0)
        return {
          dept_id: dept_id === 'lab' || dept_id === 'xray' ? null : dept_id,
          dept_name,
          total_amount,
          by_head,
        }
      }
    ).sort((a, b) => b.total_amount - a.total_amount)

    const grand_total = by_department.reduce((s, d) => s + d.total_amount, 0)

    const chart_data = by_department.map((d) => ({
      name: d.dept_name,
      amount: Math.round(d.total_amount / 100 * 100) / 100, // PKR
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

    const [clinicName, workingDays, staffRes, deptRes] = await Promise.all([
      getClinicName(supabase),
      getWorkingDaysConfig(supabase),
      supabase
        .from('cp_staff')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('full_name', { ascending: true }),
      supabase
        .from('cp_departments')
        .select('id, name')
        .eq('is_active', true),
    ])

    if (staffRes.error) return { success: false, error: staffRes.error.message }

    const deptMap = new Map<string, string>()
    for (const d of deptRes.data ?? []) deptMap.set(d.id, d.name)

    const entries: PayrollEntry[] = (staffRes.data as CpStaff[]).map((s) => {
      const monthly_salary = s.monthly_salary ?? 0
      // Since we have no attendance data, report full-month salary
      const present_days = workingDays
      const earned_salary = monthly_salary
      const deductions = 0
      const net_salary = earned_salary - deductions

      return {
        staff_id: s.id,
        full_name: s.full_name,
        designation: s.designation,
        department: s.department_id ? (deptMap.get(s.department_id) ?? null) : null,
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
          cp_patients(id, full_name, patient_no, phone),
          cp_payment_methods(id, name, slug)`
        )
        .eq('log_date', date)
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
      supabase.from('cp_payment_methods').select('id, name').eq('is_active', true),
    ])

    if (logsRes.error) return { success: false, error: logsRes.error.message }

    const pmMap = new Map<string, string>()
    for (const pm of pmRes.data ?? []) pmMap.set(pm.id, pm.name)

    const entries: LabTestLogWithRelations[] = (logsRes.data ?? []).map((row) => {
      const { cp_lab_tests, cp_patients, cp_payment_methods, ...log } = row as typeof row & {
        cp_lab_tests: CpLabTest | null
        cp_patients: Pick<CpPatient, 'id' | 'full_name' | 'patient_no' | 'phone'> | null
        cp_payment_methods: Pick<CpPaymentMethod, 'id' | 'name' | 'slug'> | null
      }
      return {
        ...log,
        test: cp_lab_tests ?? undefined,
        patient: cp_patients ?? undefined,
        payment_method: cp_payment_methods ?? undefined,
      } as unknown as LabTestLogWithRelations
    })

    const total_tests = entries.length
    const total_revenue = entries.reduce((s, e) => s + (e.total_amount ?? 0), 0)
    const total_discount = entries.reduce((s, e) => s + (e.discount_amount ?? 0), 0)
    const net_revenue = total_revenue

    const paymentRows = entries.map((e) => ({
      amount: e.total_amount ?? 0,
      method_id: e.payment_method_id,
      method_name: e.payment_method_id ? (pmMap.get(e.payment_method_id) ?? null) : null,
    }))
    const payment_breakdown = buildPaymentBreakdown(paymentRows)

    return {
      success: true,
      data: {
        date,
        clinic_name: clinicName,
        entries,
        total_tests,
        total_revenue,
        total_discount,
        net_revenue,
        payment_breakdown,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
