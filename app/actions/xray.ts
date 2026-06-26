'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { validateFinancialDate } from '@/lib/validate-date'
import type { CpXrayRevenue, CpXrayPartner, CpXrayExpense } from '@/types/index'

// =============================================================================
// Shared return type (same pattern as settings.ts)
// =============================================================================

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================================================
// Exported data types
// =============================================================================

/** Active partner enriched with their default split % from cp_settings */
export type XrayPartnerWithSplit = CpXrayPartner & {
  split_pct: number // basis points (0–10000)
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
  total_gross: number // paisas
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
export type XrayExpenseWithSplit = CpXrayExpense & {
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
  patient_count: z.coerce.number().int().min(1).max(1000).default(1),
  payment_method_id: z.string().uuid().nullable().optional(),
  payment_status: z
    .enum(['pending', 'completed', 'cancelled', 'refunded'])
    .default('completed'),
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

/** Read the partner splits JSON from cp_settings */
async function fetchPartnerSplitsConfig(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('cp_settings')
    .select('value')
    .eq('setting_group', 'xray')
    .eq('key', 'partner_splits_config')
    .maybeSingle()

  if (!data?.value) return {}
  try {
    return JSON.parse(data.value) as Record<string, number>
  } catch {
    return {}
  }
}

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

    const { data: rawEntries, error } = await supabase
      .from('cp_xray_revenue')
      .select('*, cp_payment_methods(name)')
      .eq('revenue_date', date)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return { success: false, error: error.message }

    type RawEntry = typeof rawEntries extends Array<infer T> ? T : never
    const entries = (rawEntries ?? []).map((e: RawEntry) => ({
      ...(e as unknown as CpXrayRevenue),
      payment_method_name:
        (e as unknown as { cp_payment_methods: { name: string } | null })
          .cp_payment_methods?.name ?? null,
    }))

    const totalGross = entries.reduce((sum, e) => sum + (e.gross_amount ?? 0), 0)

    const [partnersResult, splitsConfig] = await Promise.all([
      supabase
        .from('cp_xray_partners')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
      fetchPartnerSplitsConfig(supabase),
    ])

    const partners: XrayPartnerWithSplit[] = (partnersResult.data ?? []).map((p) => ({
      ...(p as unknown as CpXrayPartner),
      split_pct: splitsConfig[p.id] ?? 0,
    }))

    const partnerPayouts: PartnerPayoutData[] = partners.map((partner) => ({
      partner,
      payout_amount: Math.round((totalGross * partner.split_pct) / 10000),
    }))

    return {
      success: true,
      data: {
        date,
        entries,
        total_gross: totalGross,
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
      patient_count,
      payment_method_id,
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

    // Build description from service type + optional patient name
    const description = patient_name
      ? `${service_type} — ${patient_name}`
      : service_type

    const supabase = await createClient()

    const { data: revenue, error: revenueError } = await supabase
      .from('cp_xray_revenue')
      .insert({
        revenue_date,
        gross_amount: grossAmount,
        description,
        patient_count,
        payment_method_id: payment_method_id ?? null,
        payment_status,
        notes: notes ?? null,
        created_by: authUser.id,
      })
      .select()
      .single()

    if (revenueError) return { success: false, error: revenueError.message }

    // Auto-create partner splits for auditability (best-effort — won't block revenue)
    const [partnersResult, splitsConfig] = await Promise.all([
      supabase
        .from('cp_xray_partners')
        .select('id')
        .eq('is_active', true)
        .is('deleted_at', null),
      fetchPartnerSplitsConfig(supabase),
    ])

    const partners = partnersResult.data ?? []
    const totalSplitBp = partners.reduce(
      (sum, p) => sum + (splitsConfig[p.id] ?? 0),
      0
    )

    if (partners.length > 0 && totalSplitBp > 0 && totalSplitBp <= 10000) {
      const splitInserts = partners
        .filter((p) => (splitsConfig[p.id] ?? 0) > 0)
        .map((p) => {
          const splitPct = splitsConfig[p.id] ?? 0
          return {
            revenue_id: revenue.id,
            partner_id: p.id,
            split_pct: splitPct,
            split_amount: Math.round((grossAmount * splitPct) / 10000),
          }
        })

      if (splitInserts.length > 0) {
        // Ignore errors — splits are advisory; revenue is the source of truth
        await supabase.from('cp_xray_partner_splits').insert(splitInserts)
      }
    }

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
      supabase
        .from('cp_xray_partners')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
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
// Formula: payout = total_revenue × (split_pct / 10000)
// Validates that all partner splits sum to exactly 10000 bp (100%).
// =============================================================================

export async function getPartnerPayouts(
  month: string
): Promise<
  ActionResult<{
    month: string
    total_revenue: number
    partner_payouts: PartnerPayoutData[]
    split_valid: boolean
    split_total_bp: number
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

    const { data: revenueRows, error: revenueError } = await supabase
      .from('cp_xray_revenue')
      .select('gross_amount')
      .gte('revenue_date', startDate)
      .lte('revenue_date', endDate)
      .is('deleted_at', null)

    if (revenueError) return { success: false, error: revenueError.message }

    const totalRevenue = (revenueRows ?? []).reduce(
      (sum, r) => sum + (r.gross_amount ?? 0),
      0
    )

    const [partnersResult, splitsConfig] = await Promise.all([
      supabase
        .from('cp_xray_partners')
        .select('*')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
      fetchPartnerSplitsConfig(supabase),
    ])

    if (partnersResult.error) {
      return { success: false, error: partnersResult.error.message }
    }

    const partners: XrayPartnerWithSplit[] = (partnersResult.data ?? []).map((p) => ({
      ...(p as unknown as CpXrayPartner),
      split_pct: splitsConfig[p.id] ?? 0,
    }))

    // Validate that all partner split_pcts sum to exactly 10000 bp (100%)
    const splitTotalBp = partners.reduce((sum, p) => sum + p.split_pct, 0)
    const splitValid = splitTotalBp === 10000

    const partnerPayouts: PartnerPayoutData[] = partners.map((partner) => ({
      partner,
      payout_amount: Math.round((totalRevenue * partner.split_pct) / 10000),
    }))

    return {
      success: true,
      data: {
        month,
        total_revenue: totalRevenue,
        partner_payouts: partnerPayouts,
        split_valid: splitValid,
        split_total_bp: splitTotalBp,
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
          .select('gross_amount')
          .gte('revenue_date', startDate)
          .lte('revenue_date', endDate)
          .is('deleted_at', null),
        supabase
          .from('cp_xray_expenses')
          .select('amount')
          .gte('expense_date', startDate)
          .lte('expense_date', endDate)
          .is('deleted_at', null),
        supabase
          .from('cp_xray_partners')
          .select('*')
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('created_at', { ascending: true }),
        fetchPartnerSplitsConfig(supabase),
      ])

    if (revenueResult.error) return { success: false, error: revenueResult.error.message }

    const totalRevenue = (revenueResult.data ?? []).reduce(
      (sum, r) => sum + (r.gross_amount ?? 0),
      0
    )
    const totalExpenses = (expensesResult.data ?? []).reduce(
      (sum, e) => sum + (e.amount ?? 0),
      0
    )

    const partners: XrayPartnerWithSplit[] = (partnersResult.data ?? []).map((p) => ({
      ...(p as unknown as CpXrayPartner),
      split_pct: splitsConfig[p.id] ?? 0,
    }))

    const partnerPayouts: PartnerPayoutData[] = partners.map((partner) => ({
      partner,
      payout_amount: Math.round((totalRevenue * partner.split_pct) / 10000),
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
        .from('cp_xray_expenses')
        .select('*, cp_expense_heads(name), cp_payment_methods(name)')
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .is('deleted_at', null)
        .order('expense_date', { ascending: false }),
      supabase
        .from('cp_xray_partners')
        .select('id')
        .eq('is_active', true)
        .is('deleted_at', null),
    ])

    if (expensesResult.error) return { success: false, error: expensesResult.error.message }

    const activePartnerCount = (partnersResult.data ?? []).length

    type RawExpense = (typeof expensesResult.data)[number]
    const expenses: XrayExpenseWithSplit[] = (expensesResult.data ?? []).map(
      (e: RawExpense) => ({
        ...(e as unknown as CpXrayExpense),
        expense_head_name:
          (
            e as unknown as {
              cp_expense_heads: { name: string } | null
            }
          ).cp_expense_heads?.name ?? null,
        payment_method_name:
          (
            e as unknown as {
              cp_payment_methods: { name: string } | null
            }
          ).cp_payment_methods?.name ?? null,
        per_partner_amount:
          activePartnerCount > 0
            ? Math.floor((e.amount ?? 0) / activePartnerCount)
            : 0,
      })
    )

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)
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
): Promise<ActionResult<CpXrayExpense>> {
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

    const amount = pkrToPaisas(amount_pkr)
    if (amount <= 0) {
      return { success: false, error: 'Amount must be greater than zero' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_xray_expenses')
      .insert({
        expense_date,
        expense_head_id: expense_head_id ?? null,
        custom_head: custom_head ?? null,
        amount,
        description: description ?? null,
        payment_method_id: payment_method_id ?? null,
        created_by: authUser.id,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/xray/expenses')
    revalidatePath('/xray')

    return { success: true, data: data as CpXrayExpense }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}
