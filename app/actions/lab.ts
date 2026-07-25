'use server'

import { z } from 'zod'
import { revalidatePath, revalidateTag } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireAdmin } from '@/lib/auth'
import { validateFinancialDate } from '@/lib/validate-date'
import type { CpLabTest, CpLabChemical, CpLabMachinery, CpLabMaintenance, CpExpenseHead, CpLabTestLog, CpPatient, CpDoctor } from '@/types/index'

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================================================
// Types
// =============================================================================

export type LabTestLogWithRelations = CpLabTestLog & {
  test?: Pick<CpLabTest, 'id' | 'name' | 'category'> | null
  patient?: Pick<CpPatient, 'id' | 'name' | 'patient_no'> | null
  doctor?: Pick<CpDoctor, 'id' | 'name'> | null
}

export type DailyTestLogResult = {
  entries: LabTestLogWithRelations[]
  totalTests: number
  totalRevenue: number
  pendingCount: number
  completedCount: number
}

export type ChemicalWithLowStock = CpLabChemical & { isLowStock: boolean }

export type MachineryWithStatus = CpLabMachinery & {
  status: 'operational' | 'maintenance_due' | 'overdue'
  maintenanceRecords: CpLabMaintenance[]
}

export type LabReportData = {
  date: string
  clinicName: string
  entries: LabTestLogWithRelations[]
  totalTests: number
  totalRevenue: number
  doctorSplitPct: number
  clinicSplitPct: number
  doctorSplitAmount: number
  clinicSplitAmount: number
}

export type LabExpenseEntry = {
  id: string
  expense_date: string
  expense_head_id: string | null
  custom_head: string | null
  amount: number // paisas
  description: string | null
  receipt_url: string | null
  payment_method_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
  expense_head_name: string
  payment_method_name: string | null
}

export type LabExpenseResult = {
  entries: LabExpenseEntry[]
  totalAmount: number
  byHead: Record<string, number>
}

// =============================================================================
// Schemas
// =============================================================================

const recordTestSchema = z.object({
  test_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  test_id: z.string().uuid('Invalid test ID'),
  patient_id: z.string().uuid().nullable().optional(),
  patient_name: z.string().max(200).nullable().optional(),
  doctor_id: z.string().uuid().nullable().optional(),
  price_paisas: z.number().int().min(0),
  payment_method: z.enum(['cash', 'jazzcash', 'easypaisa', 'bank_transfer']).nullable().optional(),
  payment_status: z.enum(['pending', 'completed', 'refunded']).default('completed'),
  result: z.string().max(2000).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  qty: z.number().int().min(1).default(1),
})

const createTestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  category: z.string().max(100).nullable().optional(),
  price_paisas: z.number().int().min(0),
  duration_minutes: z.number().int().min(0).nullable().optional(),
  is_active: z.boolean().default(true),
})

const updateTestSchema = createTestSchema.partial()

const addMaintenanceSchema = z.object({
  service_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  description: z.string().max(1000).nullable().optional(),
  cost_paisas: z.number().int().min(0).default(0),
  technician: z.string().max(200).nullable().optional(),
  next_service: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
})

// =============================================================================
// Helpers
// =============================================================================

function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
}

// =============================================================================
// getDailyTestLog
// =============================================================================

export async function getDailyTestLog(date: string): Promise<ActionResult<DailyTestLogResult>> {
  try {
    await requireAuth()
    const dateParsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(date)
    if (!dateParsed.success) return { success: false, error: 'Invalid date format' }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_lab_test_logs')
      .select(
        `*, cp_lab_tests!test_id(id, name, category),
        cp_patients!patient_id(id, name, patient_no),
        cp_doctors!doctor_id(id, name)`
      )
      .eq('test_date', date)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (error) return { success: false, error: error.message }

    type Row = CpLabTestLog & {
      cp_lab_tests: Pick<CpLabTest, 'id' | 'name' | 'category'> | null
      cp_patients: Pick<CpPatient, 'id' | 'name' | 'patient_no'> | null
      cp_doctors: Pick<CpDoctor, 'id' | 'name'> | null
    }

    const entries: LabTestLogWithRelations[] = ((data ?? []) as unknown as Row[]).map((e) => ({
      ...e,
      test: e.cp_lab_tests ?? null,
      patient: e.cp_patients ?? null,
      doctor: e.cp_doctors ?? null,
    }))

    const totalRevenue = entries.reduce((sum, e) => sum + (e.price_paisas ?? 0), 0)

    return {
      success: true,
      data: {
        entries,
        totalTests: entries.length,
        totalRevenue,
        pendingCount: entries.filter((e) => e.payment_status === 'pending').length,
        completedCount: entries.filter((e) => e.payment_status === 'completed').length,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// recordTest
// =============================================================================

export async function recordTest(rawData: unknown): Promise<ActionResult<string>> {
  try {
    const authUser = await requireAuth()
    const parsed = recordTestSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

    const dateCheck = validateFinancialDate(parsed.data.test_date)
    if (!dateCheck.valid) return { success: false, error: dateCheck.error }

    const supabase = await createClient()

    // Denormalize test name
    const { data: testData } = await supabase.from('cp_lab_tests').select('name').eq('id', parsed.data.test_id).single()

    const { data, error } = await supabase
      .from('cp_lab_test_logs')
      .insert({
        test_date: parsed.data.test_date,
        test_id: parsed.data.test_id,
        test_name: (testData?.name as string) ?? '',
        patient_id: parsed.data.patient_id ?? null,
        patient_name: parsed.data.patient_name ?? null,
        doctor_id: parsed.data.doctor_id ?? null,
        price_paisas: parsed.data.price_paisas,
        payment_method: parsed.data.payment_method ?? null,
        payment_status: parsed.data.payment_status,
        result: parsed.data.result ?? null,
        notes: parsed.data.notes ?? null,
        qty: parsed.data.qty,
        created_by: authUser.id,
      })
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/lab')
    return { success: true, data: data.id as string }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getTestCatalog
// =============================================================================

export async function getTestCatalog(): Promise<ActionResult<CpLabTest[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cp_lab_tests')
      .select('id, name, category, price_paisas, duration_minutes, is_active, deleted_at')
      .is('deleted_at', null)
      .order('category', { ascending: true })
      .order('name', { ascending: true })
    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as unknown as CpLabTest[] }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// createTest
// =============================================================================

export async function createTest(rawData: unknown): Promise<ActionResult<CpLabTest>> {
  try {
    await requireAdmin()
    const parsed = createTestSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

    const supabase = await createClient()
    const { data, error } = await supabase.from('cp_lab_tests').insert({
      name: parsed.data.name,
      category: parsed.data.category ?? null,
      price_paisas: parsed.data.price_paisas,
      is_active: parsed.data.is_active,
    }).select('*').single()
    if (error) return { success: false, error: error.message }

    revalidateTag('lab-tests', 'default')
    revalidatePath('/lab/tests/new')
    revalidatePath('/lab/catalog')
    return { success: true, data: data as unknown as CpLabTest }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// updateTest
// =============================================================================

export async function updateTest(id: string, rawData: unknown): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid test ID' }

    const parsed = updateTestSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

    const updatePayload: {
      name?: string
      category?: string | null
      price_paisas?: number
      is_active?: boolean
    } = {}
    if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name
    if (parsed.data.category !== undefined) updatePayload.category = parsed.data.category ?? null
    if (parsed.data.price_paisas !== undefined) updatePayload.price_paisas = parsed.data.price_paisas
    if (parsed.data.is_active !== undefined) updatePayload.is_active = parsed.data.is_active

    const supabase = await createClient()
    const { error } = await supabase.from('cp_lab_tests').update(updatePayload).eq('id', id).is('deleted_at', null)
    if (error) return { success: false, error: error.message }

    revalidateTag('lab-tests', 'default')
    revalidatePath('/lab/tests/new')
    revalidatePath('/lab/catalog')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// createChemical
// =============================================================================

const createChemicalSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  unit: z.string().min(1, 'Unit is required').max(50),
  reorder_level: z.number().min(0),
  cost_price_paisas: z.number().int().min(0),
  supplier: z.string().max(200).optional().nullable(),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
})

export async function createChemical(rawData: unknown): Promise<ActionResult<CpLabChemical>> {
  try {
    await requireAuth()
    const parsed = createChemicalSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid data' }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cp_lab_chemicals')
      .insert({
        name: parsed.data.name,
        quantity: parsed.data.quantity,
        unit: parsed.data.unit,
        reorder_level: parsed.data.reorder_level,
        cost_price_paisas: parsed.data.cost_price_paisas,
        supplier: parsed.data.supplier ?? null,
        expiry_date: parsed.data.expiry_date ?? null,
        is_active: true,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    revalidatePath('/lab/chemicals')
    return { success: true, data: data as unknown as CpLabChemical }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// createEquipment
// =============================================================================

const createEquipmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  model: z.string().max(200).optional().nullable(),
  serial_number: z.string().max(100).optional().nullable(),
  purchase_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  next_service: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  purchase_price_paisas: z.number().int('Price must be a whole number').min(0, 'Price cannot be negative').max(100_000_000_000, 'Price exceeds maximum').optional().nullable(),
})

export async function createEquipment(rawData: unknown): Promise<ActionResult<CpLabMachinery>> {
  try {
    await requireAuth()
    const parsed = createEquipmentSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid data' }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cp_lab_machinery')
      .insert({
        name: parsed.data.name,
        model: parsed.data.model ?? null,
        serial_number: parsed.data.serial_number ?? null,
        purchase_date: parsed.data.purchase_date ?? null,
        next_service: parsed.data.next_service ?? null,
        notes: parsed.data.notes ?? null,
        purchase_price_paisas: parsed.data.purchase_price_paisas ?? null,
        status: 'operational',
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    revalidatePath('/lab/equipment')
    return { success: true, data: data as unknown as CpLabMachinery }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// deleteEquipment
// =============================================================================

export async function deleteEquipment(id: string): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()
    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid equipment ID' }

    const supabase = await createClient()
    const { error } = await supabase
      .from('cp_lab_machinery')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null)

    if (error) return { success: false, error: error.message }

    revalidatePath('/lab/equipment')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getChemicals
// =============================================================================

export async function getChemicals(): Promise<ActionResult<ChemicalWithLowStock[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_lab_chemicals')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (error) return { success: false, error: error.message }

    const chemicals: ChemicalWithLowStock[] = ((data ?? []) as CpLabChemical[]).map((c) => ({
      ...c,
      isLowStock: Number(c.quantity) <= Number(c.reorder_level),
    }))

    return { success: true, data: chemicals }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// adjustChemicalStock
// =============================================================================

export async function adjustChemicalStock(id: string, qty: number, type: 'in' | 'out'): Promise<ActionResult<undefined>> {
  try {
    await requireAuth()
    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid ID' }
    if (qty <= 0) return { success: false, error: 'Quantity must be positive' }

    const supabase = await createClient()
    const { data: current, error: fetchErr } = await supabase.from('cp_lab_chemicals').select('quantity').eq('id', id).single()
    if (fetchErr || !current) return { success: false, error: 'Chemical not found' }

    const newQty = type === 'in' ? Number(current.quantity) + qty : Math.max(0, Number(current.quantity) - qty)
    const { error } = await supabase.from('cp_lab_chemicals').update({ quantity: newQty }).eq('id', id)
    if (error) return { success: false, error: error.message }

    revalidatePath('/lab/chemicals')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getEquipment
// =============================================================================

export async function getEquipment(): Promise<ActionResult<MachineryWithStatus[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    // Embed maintenance rows so only records belonging to a live machine are
    // transferred (the old query pulled the whole append-only table every load).
    const machineryRes = await supabase
      .from('cp_lab_machinery')
      .select('*, cp_lab_maintenance(*)')
      .is('deleted_at', null)
      .order('name', { ascending: true })
      .order('service_date', { ascending: false, referencedTable: 'cp_lab_maintenance' })

    if (machineryRes.error) return { success: false, error: machineryRes.error.message }

    const today = new Date(todayISO())

    type MachineryRow = CpLabMachinery & { cp_lab_maintenance: CpLabMaintenance[] | null }

    const result = ((machineryRes.data ?? []) as unknown as MachineryRow[]).map((row) => {
      const { cp_lab_maintenance, ...m } = row
      const records = cp_lab_maintenance ?? []

      let status: 'operational' | 'maintenance_due' | 'overdue' = 'operational'
      if (m.next_service) {
        const nextDue = new Date(m.next_service)
        if (nextDue < today) {
          status = 'overdue'
        } else {
          const daysUntil = (nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          if (daysUntil <= 7) status = 'maintenance_due'
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
// addMaintenanceRecord
// =============================================================================

export async function addMaintenanceRecord(machineryId: string, rawData: unknown): Promise<ActionResult<undefined>> {
  try {
    const authUser = await requireAuth()
    const idParsed = z.string().uuid().safeParse(machineryId)
    if (!idParsed.success) return { success: false, error: 'Invalid machinery ID' }

    const parsed = addMaintenanceSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

    const supabase = await createClient()

    const { error: insertErr } = await supabase.from('cp_lab_maintenance').insert({
      machinery_id: machineryId,
      service_date: parsed.data.service_date,
      description: parsed.data.description ?? null,
      cost_paisas: parsed.data.cost_paisas,
      technician: parsed.data.technician ?? null,
      next_service: parsed.data.next_service ?? null,
      created_by: authUser.id,
    })

    if (insertErr) return { success: false, error: insertErr.message }

    // Update machinery's last and next service dates
    const machineUpdate: { last_service: string; next_service?: string } = { last_service: parsed.data.service_date }
    if (parsed.data.next_service) machineUpdate.next_service = parsed.data.next_service

    await supabase.from('cp_lab_machinery').update(machineUpdate).eq('id', machineryId)

    revalidatePath('/lab/equipment')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// Lab revenue split
// =============================================================================

export async function getLabRevenueSplit(): Promise<ActionResult<{ doctor_pct: number; clinic_pct: number }>> {
  try {
    await requireAuth()
    const supabase = await createClient()
    const { data } = await supabase.from('cp_settings').select('setting_value').eq('setting_key', 'lab.revenue_split').single()
    if (!data?.setting_value) return { success: true, data: { doctor_pct: 50, clinic_pct: 50 } }
    return { success: true, data: data.setting_value as { doctor_pct: number; clinic_pct: number } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// generateLabReport
// =============================================================================

export async function generateLabReport(date: string): Promise<ActionResult<LabReportData>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const [logsRes, splitRes, clinicRes] = await Promise.all([
      supabase.from('cp_lab_test_logs').select(
        `*, cp_lab_tests!test_id(id, name, category), cp_patients!patient_id(id, name, patient_no), cp_doctors!doctor_id(id, name)`
      ).eq('test_date', date).is('deleted_at', null).order('created_at', { ascending: true }),
      supabase.from('cp_settings').select('setting_value').eq('setting_key', 'lab.revenue_split').single(),
      supabase.from('cp_settings').select('setting_value').eq('setting_key', 'clinic.general').single(),
    ])

    type Row = CpLabTestLog & {
      cp_lab_tests: Pick<CpLabTest, 'id' | 'name' | 'category'> | null
      cp_patients: Pick<CpPatient, 'id' | 'name' | 'patient_no'> | null
      cp_doctors: Pick<CpDoctor, 'id' | 'name'> | null
    }

    const entries: LabTestLogWithRelations[] = ((logsRes.data ?? []) as unknown as Row[]).map((e) => ({
      ...e,
      test: e.cp_lab_tests ?? null,
      patient: e.cp_patients ?? null,
      doctor: e.cp_doctors ?? null,
    }))

    const totalRevenue = entries.reduce((sum, e) => sum + (e.price_paisas ?? 0), 0)
    const splitVal = splitRes.data?.setting_value as { doctor_pct?: number; clinic_pct?: number } | undefined
    const doctorSplitPct = splitVal?.doctor_pct ?? 50
    const clinicSplitPct = splitVal?.clinic_pct ?? 50
    const clinicGeneral = clinicRes.data?.setting_value as { clinic_name?: string } | undefined
    const clinicName = clinicGeneral?.clinic_name ?? 'ClinicPulse Medical Center'

    return {
      success: true,
      data: {
        date, clinicName, entries,
        totalTests: entries.length,
        totalRevenue,
        doctorSplitPct,
        clinicSplitPct,
        doctorSplitAmount: Math.round((totalRevenue * doctorSplitPct) / 100),
        clinicSplitAmount: Math.round((totalRevenue * clinicSplitPct) / 100),
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// Helpers for forms
// =============================================================================

export async function getExpenseHeadsForLab(): Promise<ActionResult<CpExpenseHead[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cp_expense_heads')
      .select('*')
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })

    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as CpExpenseHead[] }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// addLabExpense
// =============================================================================

export async function addLabExpense(input: {
  expense_date: string
  expense_head_id?: string
  custom_head?: string
  amount: number // paisas
  description?: string
  payment_method_id?: string
}): Promise<ActionResult<undefined>> {
  try {
    const authUser = await requireAuth()
    const supabase = await createClient()

    // Both lookups are independent and both ignore errors — one wave, not two.
    const [headRes, pmRes] = await Promise.all([
      input.expense_head_id
        ? supabase.from('cp_expense_heads').select('name').eq('id', input.expense_head_id).single()
        : Promise.resolve(null),
      input.payment_method_id
        ? supabase.from('cp_payment_methods').select('method').eq('id', input.payment_method_id).single()
        : Promise.resolve(null),
    ])

    // Resolve head_name
    let headName = input.custom_head ?? 'General'
    if (headRes?.data?.name) headName = headRes.data.name

    // Resolve payment_method enum value from UUID
    const paymentMethod: string | null = pmRes?.data?.method ?? null

    const { error } = await supabase
      .from('cp_expenses')
      .insert({
        expense_date: input.expense_date,
        head_id: input.expense_head_id ?? null,
        head_name: headName,
        department: 'lab' as const,
        amount_paisas: input.amount,
        payment_method: paymentMethod as "cash" | "jazzcash" | "easypaisa" | "bank_transfer" | null,
        description: input.description ?? null,
        status: 'active' as const,
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
// getPatientPendingLabTests
// Returns pending (unpaid) lab tests for a specific patient.
// =============================================================================

export type PendingLabTest = {
  id: string
  test_date: string
  test_name: string
  price_paisas: number
}

export async function getPatientPendingLabTests(
  patientId: string
): Promise<ActionResult<PendingLabTest[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_lab_test_logs')
      .select('id, test_date, test_name, price_paisas')
      .eq('patient_id', patientId)
      .eq('payment_status', 'pending')
      .is('deleted_at', null)
      .order('test_date', { ascending: false })

    if (error) return { success: false, error: error.message }

    return { success: true, data: (data ?? []) as PendingLabTest[] }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
