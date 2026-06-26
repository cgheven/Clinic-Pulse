'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { validateFinancialDate } from '@/lib/validate-date'
import type {
  CpLabTest,
  CpLabChemical,
  CpLabMachinery,
  CpLabMachineryMaintenance,
  CpLabExpense,
  CpExpenseHead,
  LabTestLogWithRelations,
} from '@/types/index'

// =============================================================================
// Shared return type (mirrors settings.ts pattern)
// =============================================================================

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================================================
// Exported data types
// =============================================================================

export type DailyTestLogResult = {
  entries: LabTestLogWithRelations[]
  totalTests: number
  totalRevenue: number // paisas
  pendingCount: number
  completedCount: number
}

export type ChemicalWithLowStock = CpLabChemical & { isLowStock: boolean }

export type MachineryWithStatus = CpLabMachinery & {
  status: 'operational' | 'maintenance_due' | 'overdue'
  maintenanceRecords: CpLabMachineryMaintenance[]
}

export type LabExpenseEntry = CpLabExpense & {
  expense_head_name: string | null
  payment_method_name: string | null
}

export type LabExpenseResult = {
  entries: LabExpenseEntry[]
  totalAmount: number // paisas
  byHead: Record<string, number> // head name → total paisas
}

export type LabReportData = {
  date: string
  clinicName: string
  entries: LabTestLogWithRelations[]
  totalTests: number
  totalRevenue: number // paisas
  doctorSplitPct: number // basis points
  clinicSplitPct: number // basis points
  doctorSplitAmount: number // paisas
  clinicSplitAmount: number // paisas
}

// =============================================================================
// Zod Schemas
// =============================================================================

const recordTestSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  test_id: z.string().uuid('Invalid test ID'),
  patient_no: z.string().optional(),
  quantity: z.number().int().min(1).default(1),
  unit_price: z.number().int().min(0), // paisas
  discount_amount: z.number().int().min(0).default(0), // paisas
  result_value: z.string().max(500).optional(),
  result_unit: z.string().max(50).optional(),
  is_abnormal: z.boolean().default(false),
  result_notes: z.string().max(1000).optional(),
  payment_method_id: z.string().uuid().optional(),
  payment_status: z
    .enum(['pending', 'completed', 'cancelled', 'refunded'])
    .default('completed'),
  report_issued: z.boolean().default(false),
})

const createTestSchema = z.object({
  test_name: z.string().min(1, 'Test name is required').max(200),
  test_code: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  price: z.number().int().min(0), // paisas
  cost: z.number().int().min(0).default(0), // paisas
  reference_range: z.string().max(300).optional(),
  unit: z.string().max(50).optional(),
  turnaround_time: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
})

const updateTestSchema = z.object({
  test_name: z.string().min(1).max(200).optional(),
  test_code: z.string().max(50).optional(),
  category: z.string().max(100).optional(),
  price: z.number().int().min(0).optional(), // paisas
  cost: z.number().int().min(0).optional(), // paisas
  reference_range: z.string().max(300).optional(),
  unit: z.string().max(50).optional(),
  turnaround_time: z.string().max(100).optional(),
  is_active: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
})

const addMaintenanceRecordSchema = z.object({
  maintenance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  maintenance_type: z.enum(['routine', 'repair', 'calibration']),
  cost: z.number().int().min(0).default(0), // paisas
  performed_by: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
  next_due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const addLabExpenseSchema = z.object({
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  expense_head_id: z.string().uuid().optional(),
  custom_head: z.string().max(200).optional(),
  amount: z.number().int().min(0), // paisas
  description: z.string().max(1000).optional(),
  payment_method_id: z.string().uuid().optional(),
})

// =============================================================================
// Internal helpers
// =============================================================================

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!
}

// =============================================================================
// getDailyTestLog — all tests for a given date, with joins + totals
// =============================================================================

export async function getDailyTestLog(
  date: string
): Promise<ActionResult<DailyTestLogResult>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_lab_test_logs')
      .select(
        `*,
        test:cp_lab_tests(id, test_name, category, reference_range, unit),
        patient:cp_patients(id, full_name, patient_no),
        payment_method:cp_payment_methods(id, name, slug)`
      )
      .eq('log_date', date)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return { success: false, error: error.message }

    const entries = (data ?? []) as unknown as LabTestLogWithRelations[]
    const totalRevenue = entries.reduce((sum, e) => sum + (e.total_amount ?? 0), 0)
    const pendingCount = entries.filter((e) => e.payment_status === 'pending').length
    const completedCount = entries.filter((e) => e.payment_status === 'completed').length

    return {
      success: true,
      data: {
        entries,
        totalTests: entries.length,
        totalRevenue,
        pendingCount,
        completedCount,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// recordTest — create a test log entry
// =============================================================================

export async function recordTest(rawData: unknown): Promise<ActionResult<string>> {
  try {
    const authUser = await requireAuth()

    const parsed = recordTestSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const {
      patient_no,
      payment_method_id,
      result_value,
      result_unit,
      result_notes,
      ...rest
    } = parsed.data

    // SECURITY FIX (FINDING-006): Prevent backdating of test log records
    const dateCheck = validateFinancialDate(parsed.data.log_date)
    if (!dateCheck.valid) {
      return { success: false, error: dateCheck.error }
    }

    const supabase = await createClient()

    // Resolve patient_id from patient_no if provided
    let patient_id: string | null = null
    if (patient_no?.trim()) {
      const { data: patient } = await supabase
        .from('cp_patients')
        .select('id')
        .eq('patient_no', patient_no.trim().toUpperCase())
        .single()
      patient_id = patient?.id ?? null
    }

    const { data, error } = await supabase
      .from('cp_lab_test_logs')
      .insert({
        ...rest,
        patient_id,
        payment_method_id: payment_method_id ?? null,
        result_value: result_value ?? null,
        result_unit: result_unit ?? null,
        result_notes: result_notes ?? null,
        performed_by: authUser.id,
      })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/lab')
    revalidatePath('/lab/tests')
    return { success: true, data: data.id as string }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getTestCatalog — all active tests with pricing
// =============================================================================

export async function getTestCatalog(): Promise<ActionResult<CpLabTest[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_lab_tests')
      .select('*')
      .is('deleted_at', null)
      .order('category', { ascending: true })
      .order('test_name', { ascending: true })

    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as CpLabTest[] }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// createTest — add test to catalog (admin only)
// =============================================================================

export async function createTest(rawData: unknown): Promise<ActionResult<CpLabTest>> {
  try {
    const authUser = await requireAdmin()

    const parsed = createTestSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cp_lab_tests')
      .insert({
        test_name: parsed.data.test_name,
        test_code: parsed.data.test_code ?? null,
        category: parsed.data.category ?? null,
        price: parsed.data.price,
        cost: parsed.data.cost,
        reference_range: parsed.data.reference_range ?? null,
        unit: parsed.data.unit ?? null,
        turnaround_time: parsed.data.turnaround_time ?? null,
        notes: parsed.data.notes ?? null,
        is_active: true,
        created_by: authUser.id,
      })
      .select('*')
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/lab/catalog')
    return { success: true, data: data as CpLabTest }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// updateTest — update pricing / details (admin only)
// =============================================================================

export async function updateTest(
  id: string,
  rawData: unknown
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()

    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid test ID' }

    const parsed = updateTestSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('cp_lab_tests')
      .update(parsed.data)
      .eq('id', id)
      .is('deleted_at', null)

    if (error) return { success: false, error: error.message }

    revalidatePath('/lab/catalog')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getChemicals — chemical inventory with low stock flag
// =============================================================================

export async function getChemicals(): Promise<ActionResult<ChemicalWithLowStock[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_lab_chemicals')
      .select('*')
      .is('deleted_at', null)
      .order('chemical_name', { ascending: true })

    if (error) return { success: false, error: error.message }

    const chemicals = ((data ?? []) as CpLabChemical[]).map((c) => ({
      ...c,
      isLowStock: Number(c.quantity_in_stock) <= Number(c.low_stock_threshold),
    }))

    return { success: true, data: chemicals }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// adjustChemicalStock — stock in / out
// =============================================================================

export async function adjustChemicalStock(
  id: string,
  qty: number,
  type: 'in' | 'out'
): Promise<ActionResult<undefined>> {
  try {
    await requireAuth()

    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid chemical ID' }
    if (qty <= 0) return { success: false, error: 'Quantity must be positive' }

    const supabase = await createClient()

    const { data: current, error: fetchError } = await supabase
      .from('cp_lab_chemicals')
      .select('quantity_in_stock')
      .eq('id', id)
      .single()

    if (fetchError || !current) return { success: false, error: 'Chemical not found' }

    const currentQty = Number(current.quantity_in_stock)
    const newQty =
      type === 'in' ? currentQty + qty : Math.max(0, currentQty - qty)

    const { error } = await supabase
      .from('cp_lab_chemicals')
      .update({ quantity_in_stock: newQty })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/lab/chemicals')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getEquipment — machinery list with status and maintenance history
// =============================================================================

export async function getEquipment(): Promise<ActionResult<MachineryWithStatus[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const [machineryRes, maintenanceRes] = await Promise.all([
      supabase
        .from('cp_lab_machinery')
        .select('*')
        .is('deleted_at', null)
        .order('machine_name', { ascending: true }),
      supabase
        .from('cp_lab_machinery_maintenance')
        .select('*')
        .order('maintenance_date', { ascending: false }),
    ])

    if (machineryRes.error) return { success: false, error: machineryRes.error.message }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const allRecords = (maintenanceRes.data ?? []) as CpLabMachineryMaintenance[]

    const result = ((machineryRes.data ?? []) as CpLabMachinery[]).map((m) => {
      const records = allRecords.filter((r) => r.machine_id === m.id)

      let status: 'operational' | 'maintenance_due' | 'overdue' = 'operational'
      if (m.next_maintenance_date) {
        const nextDue = new Date(m.next_maintenance_date)
        nextDue.setHours(0, 0, 0, 0)
        if (nextDue < today) {
          status = 'overdue'
        } else {
          const msPerDay = 1000 * 60 * 60 * 24
          const daysUntilDue = (nextDue.getTime() - today.getTime()) / msPerDay
          if (daysUntilDue <= 7) status = 'maintenance_due'
        }
      }

      return { ...m, status, maintenanceRecords: records }
    })

    return { success: true, data: result }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// addMaintenanceRecord — log maintenance for a machine
// =============================================================================

export async function addMaintenanceRecord(
  machineryId: string,
  rawData: unknown
): Promise<ActionResult<undefined>> {
  try {
    const authUser = await requireAuth()

    const idParsed = z.string().uuid().safeParse(machineryId)
    if (!idParsed.success) return { success: false, error: 'Invalid machinery ID' }

    const parsed = addMaintenanceRecordSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const supabase = await createClient()

    const { error: insertError } = await supabase
      .from('cp_lab_machinery_maintenance')
      .insert({
        machine_id: machineryId,
        maintenance_date: parsed.data.maintenance_date,
        maintenance_type: parsed.data.maintenance_type,
        cost: parsed.data.cost,
        performed_by: parsed.data.performed_by ?? null,
        notes: parsed.data.notes ?? null,
        next_due_date: parsed.data.next_due_date ?? null,
        created_by: authUser.id,
      })

    if (insertError) return { success: false, error: insertError.message }

    // Update machinery's last and next maintenance dates
    const machineUpdate: {
      last_maintenance_date: string
      next_maintenance_date?: string
    } = {
      last_maintenance_date: parsed.data.maintenance_date,
    }
    if (parsed.data.next_due_date) {
      machineUpdate.next_maintenance_date = parsed.data.next_due_date
    }

    await supabase
      .from('cp_lab_machinery')
      .update(machineUpdate)
      .eq('id', machineryId)

    revalidatePath('/lab/equipment')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getLabExpenses — lab expenses by head for a month (YYYY-MM)
// =============================================================================

export async function getLabExpenses(
  month: string
): Promise<ActionResult<LabExpenseResult>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const startDate = `${month}-01`
    const [yearStr, monStr] = month.split('-')
    const year = parseInt(yearStr!, 10)
    const mon = parseInt(monStr!, 10)
    const lastDay = new Date(year, mon, 0) // day=0 → last day of previous month
    const endDate = lastDay.toISOString().split('T')[0]!

    const { data, error } = await supabase
      .from('cp_lab_expenses')
      .select(
        `*,
        expense_head:cp_expense_heads(id, name),
        payment_method:cp_payment_methods(id, name, slug)`
      )
      .gte('expense_date', startDate)
      .lte('expense_date', endDate)
      .is('deleted_at', null)
      .order('expense_date', { ascending: false })

    if (error) return { success: false, error: error.message }

    type RawRow = CpLabExpense & {
      expense_head: Pick<CpExpenseHead, 'id' | 'name'> | null
      payment_method: { id: string; name: string; slug: string } | null
    }

    const entries: LabExpenseEntry[] = ((data ?? []) as unknown as RawRow[]).map((e) => ({
      ...e,
      expense_head_name: e.expense_head?.name ?? e.custom_head ?? null,
      payment_method_name: e.payment_method?.name ?? null,
    }))

    const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0)

    const byHead: Record<string, number> = {}
    for (const e of entries) {
      const head = e.expense_head_name ?? 'Other'
      byHead[head] = (byHead[head] ?? 0) + e.amount
    }

    return { success: true, data: { entries, totalAmount, byHead } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// addLabExpense — create a lab expense with audit log
// =============================================================================

export async function addLabExpense(rawData: unknown): Promise<ActionResult<undefined>> {
  try {
    const authUser = await requireAuth()

    const parsed = addLabExpenseSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    // SECURITY FIX (FINDING-006): Prevent backdating of expense records
    const expenseDateCheck = validateFinancialDate(parsed.data.expense_date)
    if (!expenseDateCheck.valid) {
      return { success: false, error: expenseDateCheck.error }
    }

    const supabase = await createClient()
    const { error } = await supabase.from('cp_lab_expenses').insert({
      expense_date: parsed.data.expense_date,
      expense_head_id: parsed.data.expense_head_id ?? null,
      custom_head: parsed.data.custom_head ?? null,
      amount: parsed.data.amount,
      description: parsed.data.description ?? null,
      payment_method_id: parsed.data.payment_method_id ?? null,
      created_by: authUser.id,
    })

    if (error) return { success: false, error: error.message }

    revalidatePath('/lab/expenses')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// generateLabReport — aggregate data for PDF report
// =============================================================================

export async function generateLabReport(
  date: string
): Promise<ActionResult<LabReportData>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const [testLogsRes, revenueSplitRes, clinicNameRes] = await Promise.all([
      supabase
        .from('cp_lab_test_logs')
        .select(
          `*,
          test:cp_lab_tests(id, test_name, category),
          patient:cp_patients(id, full_name, patient_no),
          payment_method:cp_payment_methods(id, name, slug)`
        )
        .eq('log_date', date)
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
      supabase
        .from('cp_settings')
        .select('value')
        .eq('setting_group', 'lab')
        .eq('key', 'revenue_split')
        .single(),
      supabase
        .from('cp_settings')
        .select('value')
        .eq('setting_group', 'clinic')
        .eq('key', 'clinic_name')
        .single(),
    ])

    const entries = (testLogsRes.data ?? []) as unknown as LabTestLogWithRelations[]
    const totalRevenue = entries.reduce((sum, e) => sum + (e.total_amount ?? 0), 0)

    let doctorSplitPct = 5000
    let clinicSplitPct = 5000
    if (revenueSplitRes.data?.value) {
      try {
        const split = JSON.parse(revenueSplitRes.data.value) as {
          doctor_pct: number
          clinic_pct: number
        }
        doctorSplitPct = split.doctor_pct
        clinicSplitPct = split.clinic_pct
      } catch {
        // keep defaults
      }
    }

    const clinicName =
      clinicNameRes.data?.value ?? 'ClinicPulse Medical Center'
    const doctorSplitAmount = Math.round((totalRevenue * doctorSplitPct) / 10000)
    const clinicSplitAmount = Math.round((totalRevenue * clinicSplitPct) / 10000)

    return {
      success: true,
      data: {
        date,
        clinicName,
        entries,
        totalTests: entries.length,
        totalRevenue,
        doctorSplitPct,
        clinicSplitPct,
        doctorSplitAmount,
        clinicSplitAmount,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getPaymentMethods — helper for forms
// =============================================================================

export async function getPaymentMethodsForLab() {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) return { success: false as const, error: error.message }
    return { success: true as const, data: data ?? [] }
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}

// =============================================================================
// getExpenseHeadsForLab — helper for expense form
// =============================================================================

export async function getExpenseHeadsForLab() {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_expense_heads')
      .select('*')
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) return { success: false as const, error: error.message }
    return { success: true as const, data: (data ?? []) as CpExpenseHead[] }
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Unexpected error',
    }
  }
}
