'use server'

import { format, subDays } from 'date-fns'
import { TZDate } from '@date-fns/tz'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'

const PKT_TIMEZONE = 'Asia/Karachi'

// =============================================================================
// Shared result type
// =============================================================================

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================================================
// Exported data types
// =============================================================================

export type PaymentMethodTotals = {
  cash: number          // paisas
  jazzcash: number      // paisas
  easypaisa: number     // paisas
  bank_transfer: number // paisas
}

export type DeptPaymentRow = {
  department: string   // 'opd' | 'pharmacy' | 'laboratory' | 'xray'
  label: string        // human-readable department name
  cash: number         // paisas
  jazzcash: number     // paisas
  easypaisa: number    // paisas
  bank_transfer: number // paisas
  total: number        // paisas — sum of all methods
}

export type DailyPaymentsData = {
  date: string
  totals: PaymentMethodTotals
  grand_total: number  // paisas
}

export type DeptPaymentsData = {
  date: string
  rows: DeptPaymentRow[]
  totals: PaymentMethodTotals
  grand_total: number  // paisas
}

export type MonthlyPaymentSummary = {
  month: string        // YYYY-MM
  totals: PaymentMethodTotals
  by_department: DeptPaymentRow[]
  grand_total: number  // paisas
}

export type DailyTrendPoint = {
  date: string         // YYYY-MM-DD
  total: number        // paisas
  cash: number         // paisas
  jazzcash: number     // paisas
  easypaisa: number    // paisas
  bank_transfer: number // paisas
}

// =============================================================================
// Internal helpers
// =============================================================================

/** Return a zeroed PaymentMethodTotals object. */
function zeroTotals(): PaymentMethodTotals {
  return { cash: 0, jazzcash: 0, easypaisa: 0, bank_transfer: 0 }
}

/** Add a single payment amount into the correct enum method bucket. */
function addToTotals(
  totals: PaymentMethodTotals,
  amount: number,
  method: string | null
): void {
  if (!method) return
  if (method === 'cash') totals.cash += amount
  else if (method === 'jazzcash') totals.jazzcash += amount
  else if (method === 'easypaisa') totals.easypaisa += amount
  else if (method === 'bank_transfer') totals.bank_transfer += amount
}

/** Sum all four method buckets into a single grand total. */
function grandTotal(t: PaymentMethodTotals): number {
  return t.cash + t.jazzcash + t.easypaisa + t.bank_transfer
}

/** Element-wise addition of two PaymentMethodTotals objects. */
function mergeTotals(
  a: PaymentMethodTotals,
  b: PaymentMethodTotals
): PaymentMethodTotals {
  return {
    cash: a.cash + b.cash,
    jazzcash: a.jazzcash + b.jazzcash,
    easypaisa: a.easypaisa + b.easypaisa,
    bank_transfer: a.bank_transfer + b.bank_transfer,
  }
}

/** Return the last calendar date of a YYYY-MM string as YYYY-MM-DD. */
function lastDayOfMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number) as [number, number]
  return new Date(year, mon, 0).toISOString().split('T')[0]!
}

// =============================================================================
// getDailyPayments
// Aggregate payments across all modules by method for a single date.
// Queries: cp_patient_visits, cp_pharmacy_sales, cp_lab_test_logs, cp_xray_revenue
// =============================================================================

export async function getDailyPayments(
  date: string
): Promise<ActionResult<DailyPaymentsData>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const [visitsRes, pharmRes, labRes, xrayRes] = await Promise.all([
      supabase
        .from('cp_patient_visits')
        .select('fee_paisas, payment_method')
        .eq('visit_date', date),
      supabase
        .from('cp_pharmacy_sales')
        .select('total_paisas, payment_method')
        .eq('sale_date', date),
      supabase
        .from('cp_lab_test_logs')
        .select('price_paisas, payment_method')
        .eq('test_date', date),
      supabase
        .from('cp_xray_revenue')
        .select('amount_paisas, payment_method')
        .eq('revenue_date', date),
    ])

    const totals = zeroTotals()

    for (const v of visitsRes.data ?? []) {
      addToTotals(totals, (v as { fee_paisas: number }).fee_paisas ?? 0, (v as { payment_method: string | null }).payment_method)
    }
    for (const s of pharmRes.data ?? []) {
      addToTotals(totals, (s as { total_paisas: number }).total_paisas ?? 0, (s as { payment_method: string | null }).payment_method)
    }
    for (const l of labRes.data ?? []) {
      addToTotals(totals, (l as { price_paisas: number }).price_paisas ?? 0, (l as { payment_method: string | null }).payment_method)
    }
    for (const x of xrayRes.data ?? []) {
      addToTotals(totals, (x as { amount_paisas: number }).amount_paisas ?? 0, (x as { payment_method: string | null }).payment_method)
    }

    return { success: true, data: { date, totals, grand_total: grandTotal(totals) } }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// =============================================================================
// getPaymentsByDepartment
// Same aggregation but grouped by department (opd, pharmacy, laboratory, xray).
// =============================================================================

export async function getPaymentsByDepartment(
  date: string
): Promise<ActionResult<DeptPaymentsData>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const [visitsRes, pharmRes, labRes, xrayRes] = await Promise.all([
      supabase
        .from('cp_patient_visits')
        .select('fee_paisas, payment_method')
        .eq('visit_date', date),
      supabase
        .from('cp_pharmacy_sales')
        .select('total_paisas, payment_method')
        .eq('sale_date', date),
      supabase
        .from('cp_lab_test_logs')
        .select('price_paisas, payment_method')
        .eq('test_date', date),
      supabase
        .from('cp_xray_revenue')
        .select('amount_paisas, payment_method')
        .eq('revenue_date', date),
    ])

    const opdT   = zeroTotals()
    const pharmT = zeroTotals()
    const labT   = zeroTotals()
    const xrayT  = zeroTotals()

    for (const v of visitsRes.data ?? []) {
      addToTotals(opdT, (v as { fee_paisas: number }).fee_paisas ?? 0, (v as { payment_method: string | null }).payment_method)
    }
    for (const s of pharmRes.data ?? []) {
      addToTotals(pharmT, (s as { total_paisas: number }).total_paisas ?? 0, (s as { payment_method: string | null }).payment_method)
    }
    for (const l of labRes.data ?? []) {
      addToTotals(labT, (l as { price_paisas: number }).price_paisas ?? 0, (l as { payment_method: string | null }).payment_method)
    }
    for (const x of xrayRes.data ?? []) {
      addToTotals(xrayT, (x as { amount_paisas: number }).amount_paisas ?? 0, (x as { payment_method: string | null }).payment_method)
    }

    const rows: DeptPaymentRow[] = [
      { department: 'opd',        label: 'OPD',        ...opdT,   total: grandTotal(opdT)   },
      { department: 'pharmacy',   label: 'Pharmacy',   ...pharmT, total: grandTotal(pharmT) },
      { department: 'laboratory', label: 'Laboratory', ...labT,   total: grandTotal(labT)   },
      { department: 'xray',       label: 'X-Ray',      ...xrayT,  total: grandTotal(xrayT)  },
    ]

    const combinedTotals = rows.reduce(
      (acc, r) =>
        mergeTotals(acc, {
          cash: r.cash,
          jazzcash: r.jazzcash,
          easypaisa: r.easypaisa,
          bank_transfer: r.bank_transfer,
        }),
      zeroTotals()
    )

    return {
      success: true,
      data: {
        date,
        rows,
        totals: combinedTotals,
        grand_total: grandTotal(combinedTotals),
      },
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// =============================================================================
// getMonthlyPaymentSummary
// Monthly totals per method + per department for a given YYYY-MM month.
// =============================================================================

export async function getMonthlyPaymentSummary(
  month: string
): Promise<ActionResult<MonthlyPaymentSummary>> {
  try {
    await requireAuth()

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return { success: false, error: 'Invalid month format — expected YYYY-MM' }
    }

    const startDate = `${month}-01`
    const endDate   = lastDayOfMonth(month)
    const supabase  = await createClient()

    const [visitsRes, pharmRes, labRes, xrayRes] = await Promise.all([
      supabase
        .from('cp_patient_visits')
        .select('fee_paisas, payment_method')
        .gte('visit_date', startDate)
        .lte('visit_date', endDate),
      supabase
        .from('cp_pharmacy_sales')
        .select('total_paisas, payment_method')
        .gte('sale_date', startDate)
        .lte('sale_date', endDate),
      supabase
        .from('cp_lab_test_logs')
        .select('price_paisas, payment_method')
        .gte('test_date', startDate)
        .lte('test_date', endDate),
      supabase
        .from('cp_xray_revenue')
        .select('amount_paisas, payment_method')
        .gte('revenue_date', startDate)
        .lte('revenue_date', endDate),
    ])

    const opdT   = zeroTotals()
    const pharmT = zeroTotals()
    const labT   = zeroTotals()
    const xrayT  = zeroTotals()

    for (const v of visitsRes.data ?? []) {
      addToTotals(opdT, (v as { fee_paisas: number }).fee_paisas ?? 0, (v as { payment_method: string | null }).payment_method)
    }
    for (const s of pharmRes.data ?? []) {
      addToTotals(pharmT, (s as { total_paisas: number }).total_paisas ?? 0, (s as { payment_method: string | null }).payment_method)
    }
    for (const l of labRes.data ?? []) {
      addToTotals(labT, (l as { price_paisas: number }).price_paisas ?? 0, (l as { payment_method: string | null }).payment_method)
    }
    for (const x of xrayRes.data ?? []) {
      addToTotals(xrayT, (x as { amount_paisas: number }).amount_paisas ?? 0, (x as { payment_method: string | null }).payment_method)
    }

    const by_department: DeptPaymentRow[] = [
      { department: 'opd',        label: 'OPD',        ...opdT,   total: grandTotal(opdT)   },
      { department: 'pharmacy',   label: 'Pharmacy',   ...pharmT, total: grandTotal(pharmT) },
      { department: 'laboratory', label: 'Laboratory', ...labT,   total: grandTotal(labT)   },
      { department: 'xray',       label: 'X-Ray',      ...xrayT,  total: grandTotal(xrayT)  },
    ]

    const totals = by_department.reduce(
      (acc, r) =>
        mergeTotals(acc, {
          cash: r.cash,
          jazzcash: r.jazzcash,
          easypaisa: r.easypaisa,
          bank_transfer: r.bank_transfer,
        }),
      zeroTotals()
    )

    return {
      success: true,
      data: { month, totals, by_department, grand_total: grandTotal(totals) },
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// =============================================================================
// getDailyTrend
// Returns the last N days (default 30) of payment totals broken down by method.
// Generates a complete series — days with no activity are included as zeros.
// =============================================================================

export async function getDailyTrend(
  days: number = 30
): Promise<ActionResult<DailyTrendPoint[]>> {
  try {
    await requireAuth()

    const todayPKT = new TZDate(new Date(), PKT_TIMEZONE)
    const endDate   = format(todayPKT, 'yyyy-MM-dd')
    const startDate = format(subDays(todayPKT, days - 1), 'yyyy-MM-dd')

    const supabase = await createClient()

    const [visitsRes, pharmRes, labRes, xrayRes] = await Promise.all([
      supabase
        .from('cp_patient_visits')
        .select('visit_date, fee_paisas, payment_method')
        .gte('visit_date', startDate)
        .lte('visit_date', endDate),
      supabase
        .from('cp_pharmacy_sales')
        .select('sale_date, total_paisas, payment_method')
        .gte('sale_date', startDate)
        .lte('sale_date', endDate),
      supabase
        .from('cp_lab_test_logs')
        .select('test_date, price_paisas, payment_method')
        .gte('test_date', startDate)
        .lte('test_date', endDate),
      supabase
        .from('cp_xray_revenue')
        .select('revenue_date, amount_paisas, payment_method')
        .gte('revenue_date', startDate)
        .lte('revenue_date', endDate),
    ])

    // Build a date → aggregated totals map
    const dateMap = new Map<string, PaymentMethodTotals>()

    const ensureDate = (d: string): PaymentMethodTotals => {
      if (!dateMap.has(d)) dateMap.set(d, zeroTotals())
      return dateMap.get(d)!
    }

    for (const v of visitsRes.data ?? []) {
      const row = v as { visit_date: string; fee_paisas: number; payment_method: string | null }
      addToTotals(ensureDate(row.visit_date), row.fee_paisas ?? 0, row.payment_method)
    }
    for (const s of pharmRes.data ?? []) {
      const row = s as { sale_date: string; total_paisas: number; payment_method: string | null }
      addToTotals(ensureDate(row.sale_date), row.total_paisas ?? 0, row.payment_method)
    }
    for (const l of labRes.data ?? []) {
      const row = l as { test_date: string; price_paisas: number; payment_method: string | null }
      addToTotals(ensureDate(row.test_date), row.price_paisas ?? 0, row.payment_method)
    }
    for (const x of xrayRes.data ?? []) {
      const row = x as { revenue_date: string; amount_paisas: number; payment_method: string | null }
      addToTotals(ensureDate(row.revenue_date), row.amount_paisas ?? 0, row.payment_method)
    }

    // Generate the full date series, backfilling zeros for days with no data
    const result: DailyTrendPoint[] = []
    for (let i = 0; i < days; i++) {
      const d = format(subDays(todayPKT, days - 1 - i), 'yyyy-MM-dd')
      const t = dateMap.get(d) ?? zeroTotals()
      result.push({ date: d, total: grandTotal(t), ...t })
    }

    return { success: true, data: result }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

