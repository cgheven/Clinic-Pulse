'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAuth } from '@/lib/auth'
import { validateFinancialDate } from '@/lib/validate-date'
import type { CpExpense } from '@/types/index'

// =============================================================================
// Shared return type
// =============================================================================

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================================================
// Exported data types
// =============================================================================

export type ExpenseWithRelations = CpExpense & {
  department_name: string | null
  expense_head_name: string | null
  payment_method_name: string | null
  is_voided: boolean
}

export type ExpenseFilterParams = {
  month?: string // YYYY-MM
  department?: string | null  // enum value e.g. 'opd', 'pharmacy', 'lab', 'xray'
  head_id?: string | null
  payment_method?: string | null  // enum value e.g. 'cash', 'jazzcash'
}

export type DeptExpenseGroup = {
  department: string | null
  department_name: string
  total: number // paisas
  expenses: ExpenseWithRelations[]
}

export type CrossDeptSplitData = {
  month: string
  total_expenses: number // paisas
  divisor: number
  per_dept_share: number // paisas (floor)
  department_groups: DeptExpenseGroup[]
}

export type ExpenseCategoryTotal = {
  head_id: string | null
  head_name: string
  total: number // paisas
  count: number
}

export type ExpenseDeptTotal = {
  department: string | null
  department_name: string
  total: number // paisas
  count: number
}

export type ExpenseSummaryData = {
  month: string
  grand_total: number // paisas
  by_category: ExpenseCategoryTotal[]
  by_department: ExpenseDeptTotal[]
}

// =============================================================================
// Zod schemas
// =============================================================================

const createExpenseSchema = z.object({
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date — expected YYYY-MM-DD'),
  department: z.string().max(100).nullable().optional(),
  head_id: z.string().uuid().nullable().optional(),
  amount_pkr: z
    .string()
    .min(1, 'Amount is required')
    .refine(
      (v) => !isNaN(parseFloat(v)) && parseFloat(v) > 0,
      'Amount must be a positive number'
    ),
  description: z.string().min(1, 'Description is required').max(500),
  payment_method: z
    .enum(['cash', 'jazzcash', 'easypaisa', 'bank_transfer'])
    .nullable()
    .optional(),
})

// =============================================================================
// Internal helpers
// =============================================================================

/** Convert PKR string to paisas integer */
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

/** Read the expense divisor from cp_settings (default 4) */
async function fetchExpenseDivisor(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<number> {
  const { data } = await supabase
    .from('cp_settings')
    .select('setting_value')
    .eq('setting_key', 'expense.divisor')
    .maybeSingle()

  if (!data?.setting_value) return 4
  const val = data.setting_value
  const parsed = typeof val === 'number' ? val : parseInt(String(val), 10)
  return isNaN(parsed) || parsed < 1 ? 4 : parsed
}

// =============================================================================
// getExpenses
// Returns a filtered list of expenses.
// =============================================================================

export async function getExpenses(
  filters: ExpenseFilterParams
): Promise<ActionResult<ExpenseWithRelations[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    let query = supabase
      .from('cp_expenses')
      .select('*, cp_expense_heads!head_id(name)')
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (filters.month) {
      const startDate = `${filters.month}-01`
      const endDate = lastDayOfMonth(filters.month)
      query = query.gte('expense_date', startDate).lte('expense_date', endDate)
    }

    if (filters.department) {
      query = query.eq('department', filters.department as "opd" | "pharmacy" | "lab" | "xray" | "general")
    }

    if (filters.head_id) {
      query = query.eq('head_id', filters.head_id)
    }

    if (filters.payment_method) {
      query = query.eq('payment_method', filters.payment_method as "cash" | "jazzcash" | "easypaisa" | "bank_transfer")
    }

    const { data, error } = await query

    if (error) return { success: false, error: error.message }

    type RawRow = (typeof data)[number]
    const expenses: ExpenseWithRelations[] = (data ?? []).map((row: RawRow) => {
      const r = row as unknown as {
        department: string | null
        payment_method: string | null
        amount_paisas: number
        is_voided: boolean
        cp_expense_heads: { name: string } | null
      }
      return {
        ...(row as unknown as CpExpense),
        department_name: r.department ?? null,
        expense_head_name: r.cp_expense_heads?.name ?? null,
        payment_method_name: r.payment_method ?? null,
        is_voided: r.is_voided ?? false,
      }
    })

    return { success: true, data: expenses }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// =============================================================================
// getExpenseById
// Fetches a single expense using admin client to bypass RLS.
// =============================================================================

export async function getExpenseById(
  id: string
): Promise<ActionResult<ExpenseWithRelations>> {
  try {
    await requireAuth()
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('cp_expenses')
      .select('*, cp_expense_heads!head_id(name)')
      .eq('id', id)
      .maybeSingle()

    if (error) return { success: false, error: error.message }
    if (!data) return { success: false, error: 'Expense not found' }

    const r = data as unknown as {
      department: string | null
      payment_method: string | null
      is_voided: boolean
      cp_expense_heads: { name: string } | null
    }

    const expense: ExpenseWithRelations = {
      ...(data as unknown as CpExpense),
      department_name: r.department ?? null,
      expense_head_name: r.cp_expense_heads?.name ?? null,
      payment_method_name: r.payment_method ?? null,
      is_voided: r.is_voided ?? false,
    }

    return { success: true, data: expense }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// =============================================================================
// createExpense
// Validates input, converts to paisas, inserts into cp_expenses.
// Audit log is handled automatically by the DB trigger.
// =============================================================================

export async function createExpense(
  rawData: unknown
): Promise<ActionResult<CpExpense>> {
  try {
    const authUser = await requireAuth()

    const parsed = createExpenseSchema.safeParse(rawData)
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? 'Validation failed',
      }
    }

    const {
      expense_date,
      department,
      head_id,
      amount_pkr,
      description,
      payment_method,
    } = parsed.data

    // SECURITY FIX (FINDING-006): Prevent backdating of financial records
    const dateCheck = validateFinancialDate(expense_date)
    if (!dateCheck.valid) {
      return { success: false, error: dateCheck.error }
    }

    const amount = pkrToPaisas(amount_pkr)
    if (amount <= 0) {
      return { success: false, error: 'Amount must be greater than zero' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_expenses')
      .insert({
        expense_date,
        department: (department ?? 'general') as "opd" | "pharmacy" | "lab" | "xray" | "general",
        head_name: 'General',
        head_id: head_id ?? null,
        amount_paisas: amount,
        description: description.trim(),
        payment_method: payment_method ?? null,
        created_by: authUser.id,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/expenses')

    return { success: true, data: data as unknown as CpExpense }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// =============================================================================
// voidExpense
// Marks an expense as voided via is_voided flag.
// Uses admin client to bypass the RLS WITH CHECK restriction.
// =============================================================================

export async function voidExpense(id: string): Promise<ActionResult<undefined>> {
  try {
    const authUser = await requireAuth()

    // Only admin and accountant may void expenses
    const role = authUser.profile.role
    if (role !== 'admin' && role !== 'accountant') {
      return { success: false, error: 'Insufficient permissions to void expenses' }
    }

    const admin = createAdminClient()

    // Verify the expense exists and is not already voided
    const { data: existing, error: fetchError } = await admin
      .from('cp_expenses')
      .select('id, status')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) return { success: false, error: fetchError.message }
    if (!existing) return { success: false, error: 'Expense not found' }

    const existingRow = existing as unknown as { id: string; status: string }
    if (existingRow.status === 'void') {
      return { success: false, error: 'Expense is already voided' }
    }

    const { error: updateError } = await admin
      .from('cp_expenses')
      .update({ status: 'void' as "active" | "void" })
      .eq('id', id)

    if (updateError) return { success: false, error: updateError.message }

    revalidatePath('/expenses')
    revalidatePath(`/expenses/${id}`)

    return { success: true, data: undefined }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// =============================================================================
// getExpensesByDepartment
// Returns expenses for a month grouped by department.
// =============================================================================

export async function getExpensesByDepartment(
  month: string
): Promise<ActionResult<DeptExpenseGroup[]>> {
  try {
    await requireAuth()

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return { success: false, error: 'Invalid month format — expected YYYY-MM' }
    }

    const startDate = `${month}-01`
    const endDate = lastDayOfMonth(month)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_expenses')
      .select('*, cp_expense_heads!head_id(name)')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .order('expense_date', { ascending: false })

    if (error) return { success: false, error: error.message }

    type RawRow = (typeof data)[number]

    const enriched: ExpenseWithRelations[] = (data ?? []).map((row: RawRow) => {
      const r = row as unknown as {
        department: string | null
        payment_method: string | null
        amount_paisas: number
        is_voided: boolean
        cp_expense_heads: { name: string } | null
      }
      return {
        ...(row as unknown as CpExpense),
        department_name: r.department ?? null,
        expense_head_name: r.cp_expense_heads?.name ?? null,
        payment_method_name: r.payment_method ?? null,
        is_voided: r.is_voided ?? false,
      }
    })

    // Group by department enum value
    const groupMap = new Map<string | null, DeptExpenseGroup>()

    for (const expense of enriched) {
      const dept = (expense as unknown as { department: string | null }).department ?? null
      const deptName = dept ?? 'General / Admin'

      if (!groupMap.has(dept)) {
        groupMap.set(dept, {
          department: dept,
          department_name: deptName,
          total: 0,
          expenses: [],
        })
      }

      const group = groupMap.get(dept)!
      group.total += (expense as unknown as { amount_paisas: number }).amount_paisas ?? 0
      group.expenses.push(expense)
    }

    // Sort groups: named depts first, General last
    const groups = Array.from(groupMap.values()).sort((a, b) => {
      if (a.department === null) return 1
      if (b.department === null) return -1
      return a.department_name.localeCompare(b.department_name)
    })

    return { success: true, data: groups }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// =============================================================================
// getCrossDeptSplit
// Divides total expenses by the configured divisor to get per-department share.
// Setting key: cp_settings (setting_key = 'expense.divisor')
// Default divisor: 4
// =============================================================================

export async function getCrossDeptSplit(
  month: string
): Promise<ActionResult<CrossDeptSplitData>> {
  try {
    await requireAuth()

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return { success: false, error: 'Invalid month format — expected YYYY-MM' }
    }

    const startDate = `${month}-01`
    const endDate = lastDayOfMonth(month)
    const supabase = await createClient()

    const [expensesResult, divisor] = await Promise.all([
      supabase
        .from('cp_expenses')
        .select('*, cp_expense_heads!head_id(name)')
        .gte('expense_date', startDate)
        .lte('expense_date', endDate)
        .order('expense_date', { ascending: false }),
      fetchExpenseDivisor(supabase),
    ])

    if (expensesResult.error) {
      return { success: false, error: expensesResult.error.message }
    }

    type RawRow = (typeof expensesResult.data)[number]
    const enriched: ExpenseWithRelations[] = (expensesResult.data ?? []).map(
      (row: RawRow) => {
        const r = row as unknown as {
          department: string | null
          payment_method: string | null
          amount_paisas: number
          is_voided: boolean
          cp_expense_heads: { name: string } | null
        }
        return {
          ...(row as unknown as CpExpense),
          department_name: r.department ?? null,
          expense_head_name: r.cp_expense_heads?.name ?? null,
          payment_method_name: r.payment_method ?? null,
          is_voided: r.is_voided ?? false,
        }
      }
    )

    const totalExpenses = enriched.reduce(
      (sum, e) => sum + ((e as unknown as { amount_paisas: number }).amount_paisas ?? 0),
      0
    )
    const perDeptShare = Math.floor(totalExpenses / divisor)

    const groupMap = new Map<string | null, DeptExpenseGroup>()
    for (const expense of enriched) {
      const dept = (expense as unknown as { department: string | null }).department ?? null
      const deptName = dept ?? 'General / Admin'

      if (!groupMap.has(dept)) {
        groupMap.set(dept, {
          department: dept,
          department_name: deptName,
          total: 0,
          expenses: [],
        })
      }
      const group = groupMap.get(dept)!
      group.total += (expense as unknown as { amount_paisas: number }).amount_paisas ?? 0
      group.expenses.push(expense)
    }

    const departmentGroups = Array.from(groupMap.values()).sort((a, b) => {
      if (a.department === null) return 1
      if (b.department === null) return -1
      return a.department_name.localeCompare(b.department_name)
    })

    return {
      success: true,
      data: {
        month,
        total_expenses: totalExpenses,
        divisor,
        per_dept_share: perDeptShare,
        department_groups: departmentGroups,
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
// getExpenseSummary
// Returns totals aggregated per category and per department for a month.
// =============================================================================

export async function getExpenseSummary(
  month: string
): Promise<ActionResult<ExpenseSummaryData>> {
  try {
    await requireAuth()

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return { success: false, error: 'Invalid month format — expected YYYY-MM' }
    }

    const startDate = `${month}-01`
    const endDate = lastDayOfMonth(month)
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_expenses')
      .select('amount_paisas, head_id, department, cp_expense_heads!head_id(name)')
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)

    if (error) return { success: false, error: error.message }

    const rows = data ?? []
    let grandTotal = 0

    const categoryMap = new Map<string, ExpenseCategoryTotal>()
    const deptMap = new Map<string, ExpenseDeptTotal>()

    for (const row of rows) {
      const r = row as unknown as {
        amount_paisas: number
        head_id: string | null
        department: string | null
        cp_expense_heads: { name: string } | null
      }

      const amount = r.amount_paisas ?? 0
      grandTotal += amount

      // Category grouping
      const catKey = r.head_id ?? 'uncategorised'
      const catName = r.cp_expense_heads?.name ?? 'Uncategorised'
      if (!categoryMap.has(catKey)) {
        categoryMap.set(catKey, {
          head_id: r.head_id,
          head_name: catName,
          total: 0,
          count: 0,
        })
      }
      const catEntry = categoryMap.get(catKey)!
      catEntry.total += amount
      catEntry.count += 1

      // Department grouping
      const deptKey = r.department ?? 'general'
      const deptName = r.department ?? 'General / Admin'
      if (!deptMap.has(deptKey)) {
        deptMap.set(deptKey, {
          department: r.department,
          department_name: deptName,
          total: 0,
          count: 0,
        })
      }
      const deptEntry = deptMap.get(deptKey)!
      deptEntry.total += amount
      deptEntry.count += 1
    }

    const byCategory = Array.from(categoryMap.values()).sort(
      (a, b) => b.total - a.total
    )
    const byDepartment = Array.from(deptMap.values()).sort(
      (a, b) => b.total - a.total
    )

    return {
      success: true,
      data: {
        month,
        grand_total: grandTotal,
        by_category: byCategory,
        by_department: byDepartment,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}
