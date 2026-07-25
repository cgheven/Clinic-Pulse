'use server'

import { cache } from 'react'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { validateFinancialDate } from '@/lib/validate-date'
import type { CpXrayRevenue, CpXrayPartner, CpExpense } from '@/types/index'

// =============================================================================
// Shared return type
// =============================================================================

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================================================
// Exported data types
// =============================================================================

/** Active partner enriched with their default split % from cp_settings */
export type XrayPartnerWithSplit = CpXrayPartner & {
  split_pct: number // percentage (0–100)
}

/** One partner's calculated payout for a period */
export type PartnerPayoutData = {
  partner: XrayPartnerWithSplit
  payout_amount: number // paisas
}

/** All revenue for a single date */
export type DailyRevenueData = {
  date: string
  entries: Array<CpXrayRevenue & { payment_method_name: string | null }>
  total_gross: number // paisas (all entries)
  total_due: number // paisas (due entries only)
  partner_payouts: PartnerPayoutData[]
}

/** Full monthly breakdown */
export type MonthlyReportData = {
  month: string // YYYY-MM
  total_revenue: number // paisas
  total_expenses: number // paisas
  net_revenue: number // paisas
  partner_payouts: PartnerPayoutData[]
}

/** Single expense with per-partner share calculated */
export type XrayExpenseWithSplit = CpExpense & {
  expense_head_name: string | null
  payment_method_name: string | null
  per_partner_amount: number // paisas (floor division)
}

/** All xray expenses for a month with aggregate totals */
export type XrayExpensesData = {
  month: string
  expenses: XrayExpenseWithSplit[]
  total_amount: number // paisas
  active_partner_count: number
  per_partner_total: number // paisas
}

// =============================================================================
// Zod schemas
// =============================================================================

const recordRevenueSchema = z.object({
  revenue_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date (expected YYYY-MM-DD)'),
  service_type: z.string().min(1, 'Service type is required').max(200),
  patient_name: z.string().max(200).optional(),
  gross_amount_pkr: z
    .string()
    .min(1, 'Amount is required')
    .refine(
      (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
      'Amount must be a positive number'
    ),
  payment_method: z
    .enum(['cash', 'jazzcash', 'easypaisa', 'bank_transfer'])
    .nullable()
    .optional(),
  payment_status: z.enum(['paid', 'due']).default('paid'),
  notes: z.string().max(1000).nullable().optional(),
})

const recordExpenseSchema = z.object({
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date (expected YYYY-MM-DD)'),
  expense_head_id: z.string().uuid().nullable().optional(),
  custom_head: z.string().max(200).nullable().optional(),
  amount_pkr: z
    .string()
    .min(1, 'Amount is required')
    .refine(
      (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
      'Amount must be a positive number'
    ),
  description: z.string().max(500).nullable().optional(),
  payment_method_id: z.string().uuid().nullable().optional(),
})

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Read the partner splits JSON from cp_settings.
 * Request-scoped memoisation: several X-Ray actions run in the same render and
 * each used to issue this identical read. `createClient` is itself React.cache'd,
 * so the supabase argument has a stable identity and the cache key hits.
 */
const fetchPartnerSplitsConfig = cache(async (
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<Record<string, number>> => {
  const { data } = await supabase
    .from('cp_settings')
    .select('setting_value')
    .eq('setting_key', 'xray.partner_splits_config')
    .maybeSingle()

  if (!data?.setting_value) return {}
  try {
    const val = data.setting_value
    if (typeof val === 'object' && val !== null) return val as Record<string, number>
    return JSON.parse(val as string) as Record<string, number>
  } catch {
    return {}
  }
})

/** Active partners, ordered oldest-first. Request-scoped memoised (see above). */
const fetchActivePartners = cache(async (
  supabase: Awaited<ReturnType<typeof createClient>>
) =>
  supabase
    .from('cp_xray_partners')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
)

/** Convert a PKR string entered by the user to paisas (integer) */
function pkrToPaisas(pkrStr: string): number {
  const amount = parseFloat(pkrStr)
  if (isNaN(amount) || amount < 0) return 0
  return Math.round(amount * 100)
}

/** Return the last calendar date of a YYYY-MM month string */
function lastDayOfMonth(month: string): string {
  const [year, mon] = month.split('-').map(Number) as [number, number]
  return new Date(year, mon, 0).toISOString().split('T')[0]!
}

// =============================================================================
// getDailyRevenue
// Returns all x-ray revenue entries for a single date plus per-partner payouts.
// =============================================================================

export async function getDailyRevenue(
  date: string
): Promise<ActionResult<DailyRevenueData>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    // Partners/splits do not depend on the revenue rows — only the JS payout math
    // below needs both, so all three reads go out in one wave.
    const [revenueRes, partnersResult, splitsConfig] = await Promise.all([
      supabase
        .from('cp_xray_revenue')
        .select('*')
        .eq('revenue_date', date)
        .order('created_at', { ascending: false }),
      fetchActivePartners(supabase),
      fetchPartnerSplitsConfig(supabase),
    ])

    const { data: rawEntries, error } = revenueRes

    if (error) return { success: false, error: error.message }

    type RawEntry = typeof rawEntries extends Array<infer T> ? T : never
    const entries = (rawEntries ?? []).map((e: RawEntry) => ({
      ...(e as unknown as CpXrayRevenue),
      payment_method_name:
        (e as unknown as { payment_method: string | null }).payment_method ?? null,
    }))

    const totalGross = entries.reduce(
      (sum, e) => sum + ((e as unknown as { amount_paisas: number }).amount_paisas ?? 0),
      0
    )
    const totalDue = entries
      .filter((e) => (e as unknown as { payment_status: string }).payment_status === 'due')
      .reduce((sum, e) => sum + ((e as unknown as { amount_paisas: number }).amount_paisas ?? 0), 0)
    const totalCollected = totalGross - totalDue

    const partners: XrayPartnerWithSplit[] = (partnersResult.data ?? []).map((p) => ({
      ...(p as unknown as CpXrayPartner),
      split_pct: splitsConfig[p.id] ?? 0,
    }))

    const partnerPayouts: PartnerPayoutData[] = partners.map((partner) => ({
      partner,
      payout_amount: Math.round((totalCollected * partner.split_pct) / 100),
    }))

    return {
      success: true,
      data: {
        date,
        entries,
        total_gross: totalGross,
        total_due: totalDue,
        partner_payouts: partnerPayouts,
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
// recordRevenue
// Creates a revenue entry and auto-inserts partner splits for auditability.
// =============================================================================

export async function recordRevenue(
  rawData: unknown
): Promise<ActionResult<CpXrayRevenue>> {
  try {
    const authUser = await requireAuth()

    const parsed = recordRevenueSchema.safeParse(rawData)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Validation failed',
      }
    }

    const {
      revenue_date,
      service_type,
      patient_name,
      gross_amount_pkr,
      payment_method,
      payment_status,
      notes,
    } = parsed.data

    // SECURITY FIX (FINDING-006): Prevent backdating of revenue records
    const dateCheck = validateFinancialDate(revenue_date)
    if (!dateCheck.valid) {
      return { success: false, error: dateCheck.error }
    }

    const grossAmount = pkrToPaisas(gross_amount_pkr)
    if (grossAmount <= 0) {
      return { success: false, error: 'Amount must be greater than zero' }
    }

    const supabase = await createClient()

    const { data: revenue, error: revenueError } = await supabase
      .from('cp_xray_revenue')
      .insert({
        revenue_date,
        amount_paisas: grossAmount,
        service_type,
        patient_name: patient_name ?? null,
        payment_method: payment_status === 'due' ? null : (payment_method ?? null),
        payment_status,
        notes: notes ?? null,
        created_by: authUser.id,
      })
      .select()
      .single()

    if (revenueError) return { success: false, error: revenueError.message }

    revalidatePath('/xray')
    revalidatePath('/xray/revenue')

    return { success: true, data: revenue as CpXrayRevenue }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// =============================================================================
// getPartners
// Returns all active partners enriched with their default split % from settings.
// =============================================================================

export async function getPartners(): Promise<ActionResult<XrayPartnerWithSplit[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const [partnersResult, splitsConfig] = await Promise.all([
      fetchActivePartners(supabase),
      fetchPartnerSplitsConfig(supabase),
    ])

    if (partnersResult.error) {
      return { success: false, error: partnersResult.error.message }
    }

    const partners: XrayPartnerWithSplit[] = (partnersResult.data ?? []).map((p) => ({
      ...(p as unknown as CpXrayPartner),
      split_pct: splitsConfig[p.id] ?? 0,
    }))

    return { success: true, data: partners }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// =============================================================================
// getPartnerPayouts
// Calculate each partner's revenue share for a given month.
// Formula: payout = total_revenue x (split_pct / 100)
// Validates that all partner splits sum to exactly 100%.
// =============================================================================

export async function getPartnerPayouts(
  month: string
): Promise<
  ActionResult<{
    month: string
    total_revenue: number
    partner_payouts: PartnerPayoutData[]
    split_valid: boolean
    split_total_pct: number
  }>
> {
  try {
    await requireAuth()

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return { success: false, error: 'Invalid month format — expected YYYY-MM' }
    }

    const startDate = `${month}-01`
    const endDate = lastDayOfMonth(month)

    const supabase = await createClient()

    // Neither query consumes the other's rows — issue them together.
    const [revenueRes, partnersResult, splitsConfig] = await Promise.all([
      supabase
        .from('cp_xray_revenue')
        .select('amount_paisas')
        .eq('payment_status', 'paid')
        .gte('revenue_date', startDate)
        .lte('revenue_date', endDate),
      fetchActivePartners(supabase),
      fetchPartnerSplitsConfig(supabase),
    ])

    const { data: revenueRows, error: revenueError } = revenueRes

    if (revenueError) return { success: false, error: revenueError.message }

    const totalRevenue = (revenueRows ?? []).reduce(
      (sum, r) => sum + ((r as { amount_paisas: number }).amount_paisas ?? 0),
      0
    )

    if (partnersResult.error) {
      return { success: false, error: partnersResult.error.message }
    }

    const partners: XrayPartnerWithSplit[] = (partnersResult.data ?? []).map((p) => ({
      ...(p as unknown as CpXrayPartner),
      split_pct: splitsConfig[p.id] ?? 0,
    }))

    // Validate that all partner split_pcts sum to exactly 100%
    const splitTotalPct = partners.reduce((sum, p) => sum + p.split_pct, 0)
    const splitValid = Math.round(splitTotalPct) === 100

    const partnerPayouts: PartnerPayoutData[] = partners.map((partner) => ({
      partner,
      payout_amount: Math.round((totalRevenue * partner.split_pct) / 100),
    }))

    return {
      success: true,
      data: {
        month,
        total_revenue: totalRevenue,
        partner_payouts: partnerPayouts,
        split_valid: splitValid,
        split_total_pct: splitTotalPct,
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
// getMonthlyReport
// Full monthly financial breakdown: revenue, expenses, net, per-partner payouts.
// =============================================================================

export async function getMonthlyReport(
  month: string
): Promise<ActionResult<MonthlyReportData>> {
  try {
    await requireAuth()

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return { success: false, error: 'Invalid month format — expected YYYY-MM' }
    }

    const startDate = `${month}-01`
    const endDate = lastDayOfMonth(month)
    const supabase = await createClient()

    const [revenueResult, expensesResult, partnersResult, splitsConfig] =
      await Promise.all([
        supabase
          .from('cp_xray_revenue')
          .select('amount_paisas')
          .eq('payment_status', 'paid')
          .gte('revenue_date', startDate)
          .lte('revenue_date', endDate),
        supabase
          .from('cp_expenses')
          .select('amount_paisas')
          .eq('department', 'xray')
          .eq('status', 'active')
          .gte('expense_date', startDate)
          .lte('expense_date', endDate),
        fetchActivePartners(supabase),
        fetchPartnerSplitsConfig(supabase),
      ])

    if (revenueResult.error) return { success: false, error: revenueResult.error.message }

    const totalRevenue = (revenueResult.data ?? []).reduce(
      (sum, r) => sum + ((r as { amount_paisas: number }).amount_paisas ?? 0),
      0
    )
    const totalExpenses = (expensesResult.data ?? []).reduce(
      (sum, e) => sum + ((e as unknown as { amount_paisas: number }).amount_paisas ?? 0),
      0
    )

    const partners: XrayPartnerWithSplit[] = (partnersResult.data ?? []).map((p) => ({
      ...(p as unknown as CpXrayPartner),
      split_pct: splitsConfig[p.id] ?? 0,
    }))

    const partnerPayouts: PartnerPayoutData[] = partners.map((partner) => ({
      partner,
      payout_amount: Math.round((totalRevenue * partner.split_pct) / 100),
    }))

    return {
      success: true,
      data: {
        month,
        total_revenue: totalRevenue,
        total_expenses: totalExpenses,
        net_revenue: totalRevenue - totalExpenses,
        partner_payouts: partnerPayouts,
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
// getXrayExpenses
// Returns all xray expenses for a month with per-partner split amounts.
// Each expense is split equally among all active partners.
// =============================================================================

export async function getXrayExpenses(
  month: string
): Promise<ActionResult<XrayExpensesData>> {
  try {
    await requireAuth()

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return { success: false, error: 'Invalid month format — expected YYYY-MM' }
    }

    const startDate = `${month}-01`
    const endDate = lastDayOfMonth(month)
    const supabase = await createClient()

    const [expensesResult, partnersResult] = await Promise.all([
      supabase
        .from('cp_expenses')
        .select('*')
        .eq('department', 'xray')
        .eq('status', 'active')
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false }),
      supabase
        .from('cp_xray_partners')
        .select('id')
        .eq('is_active', true),
    ])

    if (expensesResult.error) return { success: false, error: expensesResult.error.message }

    const activePartnerCount = (partnersResult.data ?? []).length

    const expenses: XrayExpenseWithSplit[] = (expensesResult.data ?? []).map((e) => {
      const expense = e as unknown as CpExpense
      return {
        ...expense,
        expense_head_name: expense.head_name ?? null,
        payment_method_name: expense.payment_method ?? null,
        per_partner_amount:
          activePartnerCount > 0
            ? Math.floor(expense.amount_paisas / activePartnerCount)
            : 0,
      }
    })

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount_paisas, 0)
    const perPartnerTotal =
      activePartnerCount > 0 ? Math.floor(totalAmount / activePartnerCount) : 0

    return {
      success: true,
      data: {
        month,
        expenses,
        total_amount: totalAmount,
        active_partner_count: activePartnerCount,
        per_partner_total: perPartnerTotal,
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
// recordXrayExpense
// Creates an X-ray department expense record.
// =============================================================================

export async function recordXrayExpense(
  rawData: unknown
): Promise<ActionResult<XrayExpenseWithSplit>> {
  try {
    const authUser = await requireAuth()

    const parsed = recordExpenseSchema.safeParse(rawData)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Validation failed',
      }
    }

    const {
      expense_date,
      expense_head_id,
      custom_head,
      amount_pkr,
      description,
      payment_method_id,
    } = parsed.data

    // SECURITY FIX (FINDING-006): Prevent backdating of expense records
    const expenseDateCheck = validateFinancialDate(expense_date)
    if (!expenseDateCheck.valid) {
      return { success: false, error: expenseDateCheck.error }
    }

    const amount_paisas = pkrToPaisas(amount_pkr)
    if (amount_paisas <= 0) {
      return { success: false, error: 'Amount must be greater than zero' }
    }

    const supabase = await createClient()

    // The two lookups and the partner count are mutually independent and none of
    // them depends on the insert, so they all go out in one wave.
    const [headRes, pmRes, partnersRes] = await Promise.all([
      expense_head_id
        ? supabase.from('cp_expense_heads').select('name').eq('id', expense_head_id).single()
        : Promise.resolve(null),
      payment_method_id
        ? supabase.from('cp_payment_methods').select('method').eq('id', payment_method_id).single()
        : Promise.resolve(null),
      supabase.from('cp_xray_partners').select('id').eq('is_active', true),
    ])

    // Resolve head_name from expense_head_id, fall back to custom_head or 'General'
    let headName = custom_head ?? 'General'
    if (headRes?.data?.name) headName = headRes.data.name

    // Resolve payment_method enum value from payment_method_id UUID
    const paymentMethod: string | null = pmRes?.data?.method ?? null

    const { data, error } = await supabase
      .from('cp_expenses')
      .insert({
        expense_date,
        head_id: expense_head_id ?? null,
        head_name: headName,
        department: 'xray' as const,
        amount_paisas,
        payment_method: paymentMethod as "cash" | "jazzcash" | "easypaisa" | "bank_transfer" | null,
        description: description ?? null,
        status: 'active' as const,
        created_by: authUser.id,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    // Compute per_partner_amount based on current active partner count
    const activePartnerCount = (partnersRes.data ?? []).length
    const expense = data as unknown as CpExpense

    const result: XrayExpenseWithSplit = {
      ...expense,
      expense_head_name: expense.head_name ?? null,
      payment_method_name: expense.payment_method ?? null,
      per_partner_amount:
        activePartnerCount > 0
          ? Math.floor(expense.amount_paisas / activePartnerCount)
          : 0,
    }

    revalidatePath('/xray/expenses')
    revalidatePath('/xray')

    return { success: true, data: result }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}
