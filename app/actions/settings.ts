'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import type { CpPaymentMethod, CpExpenseHead, CpDoctor, CpXrayPartner } from '@/types/index'

// =============================================================================
// Shared return type
// =============================================================================

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================================================
// Exported data types
// =============================================================================

export type GeneralSettingsData = {
  clinic_name: string
  clinic_address: string
  clinic_phone: string
  clinic_email: string
  working_days: string[]
  currency_symbol: string
}

export type DeptRevenueSplitData = {
  doctor_pct: number // basis points (0-10000)
  clinic_pct: number // basis points (0-10000)
}

export type PharmacyRevenueSplitData = {
  id: string
  doctor_pct: number
  clinic_pct: number
  staff_pct: number
  effective_from: string
}

export type XrayPartnerWithSplit = CpXrayPartner & {
  split_pct: number // percentage (0-100)
}

export type DoctorWithCommission = CpDoctor & {
  current_commission_pct: number | null // basis points (0-10000); null when salaried
}

// =============================================================================
// Zod Schemas
// =============================================================================

const generalSettingsSchema = z.object({
  clinic_name: z.string().min(1, 'Clinic name is required').max(200),
  clinic_address: z.string().max(500),
  clinic_phone: z.string().max(50),
  clinic_email: z.string().max(200),
  working_days: z.array(z.string()).min(1, 'Select at least one working day'),
  currency_symbol: z.string().min(1).max(10),
})

const deptSplitSchema = z
  .object({
    doctor_pct: z.number().int().min(0).max(10000),
    clinic_pct: z.number().int().min(0).max(10000),
  })
  .refine((d) => d.doctor_pct + d.clinic_pct === 10000, {
    message: 'Doctor % + Clinic % must equal 100%',
  })

const pharmacySplitSchema = z
  .object({
    doctor_pct: z.number().int().min(0).max(10000),
    clinic_pct: z.number().int().min(0).max(10000),
    staff_pct: z.number().int().min(0).max(10000),
  })
  .refine((d) => d.doctor_pct + d.clinic_pct + d.staff_pct === 10000, {
    message: 'Doctor % + Clinic % + Staff % must equal 100%',
  })

const createExpenseHeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  department_id: z.string().nullable().optional(),
})

const updateExpenseHeadSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  is_active: z.boolean().optional(),
})

const xrayPartnerSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Partner name is required').max(200),
  phone: z.string().max(50).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  split_pct: z.number().min(0).max(100),
})

const doctorSettingsSchema = z.object({
  earning_model: z.enum(['salaried', 'commission']),
  commission_pct: z.number().min(0).max(100).optional(),
  monthly_salary: z.number().int().min(0).optional(),
})

const staffTypesSchema = z.object({
  types: z.array(z.string().min(1).max(100)).max(50),
})

// =============================================================================
// Internal helpers
// =============================================================================

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/, '')
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!
}

/** Fetch xray partner splits config from cp_settings */
async function fetchXrayPartnerSplitsConfig(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<Record<string, number>> {
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
}

/** Persist xray partner splits config to cp_settings */
async function saveXrayPartnerSplitsConfig(
  supabase: Awaited<ReturnType<typeof createClient>>,
  config: Record<string, number>
): Promise<void> {
  const { error } = await supabase.from('cp_settings').upsert(
    {
      setting_key: 'xray.partner_splits_config',
      setting_value: config,
    },
    { onConflict: 'setting_key' }
  )
  if (error) throw new Error(error.message)
}

// =============================================================================
// General Settings
// =============================================================================

export async function getGeneralSettings(): Promise<ActionResult<GeneralSettingsData>> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_settings')
      .select('setting_key, setting_value')
      .like('setting_key', 'clinic.%')

    if (error) return { success: false, error: error.message }

    const map: Record<string, unknown> = {}
    for (const row of data ?? []) {
      const subKey = (row.setting_key as string).slice('clinic.'.length)
      map[subKey] = row.setting_value
    }

    let working_days: string[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    const rawDays = map['working_days']
    if (Array.isArray(rawDays)) {
      working_days = rawDays as string[]
    } else if (typeof rawDays === 'string') {
      try { working_days = JSON.parse(rawDays) as string[] } catch { /* keep default */ }
    }

    return {
      success: true,
      data: {
        clinic_name: (map['clinic_name'] as string) ?? 'ClinicPulse Medical Center',
        clinic_address: (map['clinic_address'] as string) ?? '',
        clinic_phone: (map['clinic_phone'] as string) ?? '',
        clinic_email: (map['clinic_email'] as string) ?? '',
        working_days,
        currency_symbol: (map['currency_symbol'] as string) ?? 'Rs.',
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function updateGeneralSettings(
  rawData: unknown
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()

    const parsed = generalSettingsSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const data = parsed.data
    const supabase = await createClient()

    const upserts: Array<{ setting_key: string; setting_value: unknown }> = [
      { setting_key: 'clinic.clinic_name', setting_value: data.clinic_name },
      { setting_key: 'clinic.clinic_address', setting_value: data.clinic_address },
      { setting_key: 'clinic.clinic_phone', setting_value: data.clinic_phone },
      { setting_key: 'clinic.clinic_email', setting_value: data.clinic_email },
      { setting_key: 'clinic.working_days', setting_value: data.working_days },
      { setting_key: 'clinic.currency_symbol', setting_value: data.currency_symbol },
    ]

    for (const row of upserts) {
      const { error } = await supabase
        .from('cp_settings')
        .upsert(row, { onConflict: 'setting_key' })
      if (error) return { success: false, error: error.message }
    }

    revalidatePath('/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// Revenue Splits — OPD / Lab
// =============================================================================

export async function getDeptRevenueSplit(
  dept: 'opd' | 'lab'
): Promise<ActionResult<DeptRevenueSplitData>> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data } = await supabase
      .from('cp_settings')
      .select('setting_value')
      .eq('setting_key', `${dept}.split`)
      .maybeSingle()

    if (!data?.setting_value) {
      return {
        success: true,
        data: { doctor_pct: 5000, clinic_pct: 5000 },
      }
    }

    try {
      const val = data.setting_value
      const split = (typeof val === 'object' ? val : JSON.parse(val as string)) as DeptRevenueSplitData
      return { success: true, data: split }
    } catch {
      return { success: true, data: { doctor_pct: 5000, clinic_pct: 5000 } }
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function updateDeptRevenueSplit(
  dept: 'opd' | 'lab',
  rawData: unknown
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()

    const parsed = deptSplitSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const supabase = await createClient()
    const { error } = await supabase.from('cp_settings').upsert(
      {
        setting_key: `${dept}.split`,
        setting_value: parsed.data,
      },
      { onConflict: 'setting_key' }
    )

    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// Revenue Splits — Pharmacy
// =============================================================================

export async function getPharmacyRevenueSplit(): Promise<ActionResult<PharmacyRevenueSplitData>> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_pharmacy_revenue_split')
      .select('*')
      .order('effective_from', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) {
      return {
        success: true,
        data: {
          id: '',
          doctor_pct: 3000,
          clinic_pct: 6000,
          staff_pct: 1000,
          effective_from: todayISO(),
        },
      }
    }

    return {
      success: true,
      data: {
        id: data.id,
        doctor_pct: data.doctor_pct,
        clinic_pct: data.clinic_pct,
        staff_pct: data.staff_pct,
        effective_from: data.effective_from,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function updatePharmacyRevenueSplit(
  rawData: unknown
): Promise<ActionResult<undefined>> {
  try {
    const authUser = await requireAdmin()

    const parsed = pharmacySplitSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const supabase = await createClient()

    const { error } = await supabase.from('cp_pharmacy_revenue_split').insert({
      clinic_pct: parsed.data.clinic_pct,
      doctor_pct: parsed.data.doctor_pct,
      staff_pct: parsed.data.staff_pct,
      effective_from: todayISO(),
      notes: `Updated via settings on ${todayISO()}`,
      created_by: authUser.id,
    })

    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// Payment Methods
// =============================================================================

export async function getPaymentMethods(): Promise<ActionResult<CpPaymentMethod[]>> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_payment_methods')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) return { success: false, error: error.message }

    return { success: true, data: (data ?? []) as CpPaymentMethod[] }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function togglePaymentMethod(
  id: string,
  enabled: boolean
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()

    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid payment method ID' }

    const supabase = await createClient()
    const { error } = await supabase
      .from('cp_payment_methods')
      .update({ is_enabled: enabled })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// Expense Heads
// =============================================================================

export async function getExpenseHeads(): Promise<ActionResult<CpExpenseHead[]>> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_expense_heads')
      .select('*')
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })

    if (error) return { success: false, error: error.message }

    return { success: true, data: (data ?? []) as CpExpenseHead[] }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function createExpenseHead(rawData: unknown): Promise<ActionResult<CpExpenseHead>> {
  try {
    await requireAdmin()

    const parsed = createExpenseHeadSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const { name, department_id } = parsed.data

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_expense_heads')
      .insert({
        name,
        department: (department_id ?? 'general') as "opd" | "pharmacy" | "lab" | "xray" | "general",
        is_active: true,
        is_system: false,
        sort_order: 99,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    return { success: true, data: data as CpExpenseHead }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function updateExpenseHead(
  id: string,
  rawUpdates: unknown
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()

    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid ID' }

    const parsed = updateExpenseHeadSchema.safeParse(rawUpdates)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const supabase = await createClient()

    const updatePayload: Partial<{
      name: string
      is_active: boolean
    }> = {}
    if (parsed.data.name !== undefined) {
      updatePayload.name = parsed.data.name
    }
    if (parsed.data.is_active !== undefined) {
      updatePayload.is_active = parsed.data.is_active
    }

    const { error } = await supabase
      .from('cp_expense_heads')
      .update(updatePayload)
      .eq('id', id)
      .is('deleted_at', null)

    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function deleteExpenseHead(id: string): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()

    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid ID' }

    const supabase = await createClient()

    const { data: head } = await supabase
      .from('cp_expense_heads')
      .select('*')
      .eq('id', id)
      .single()

    if (head?.is_system) {
      return { success: false, error: 'System expense heads cannot be deleted' }
    }

    const { error } = await supabase
      .from('cp_expense_heads')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// X-Ray Partners
// =============================================================================

export async function getXrayPartners(): Promise<ActionResult<XrayPartnerWithSplit[]>> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const [partnersResult, splitsConfig] = await Promise.all([
      supabase
        .from('cp_xray_partners')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true }),
      fetchXrayPartnerSplitsConfig(supabase),
    ])

    if (partnersResult.error) return { success: false, error: partnersResult.error.message }

    const partners = (partnersResult.data ?? []) as CpXrayPartner[]
    const result: XrayPartnerWithSplit[] = partners.map((p) => ({
      ...p,
      split_pct: splitsConfig[p.id] ?? 0,
    }))

    return { success: true, data: result }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function upsertXrayPartner(rawData: unknown): Promise<ActionResult<undefined>> {
  try {
    const authUser = await requireAdmin()

    const parsed = xrayPartnerSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const { id, split_pct, notes: _notes, ...partnerFields } = parsed.data
    const supabase = await createClient()

    let partnerId: string

    if (id) {
      const { data, error } = await supabase
        .from('cp_xray_partners')
        .update({ ...partnerFields, is_active: true })
        .eq('id', id)
        .select('*')
        .single()

      if (error) return { success: false, error: error.message }
      partnerId = data.id
    } else {
      const { data, error } = await supabase
        .from('cp_xray_partners')
        .insert({ ...partnerFields, is_active: true })
        .select('*')
        .single()

      if (error) return { success: false, error: error.message }
      partnerId = data.id
    }

    // Update split config
    const splitsConfig = await fetchXrayPartnerSplitsConfig(supabase)
    splitsConfig[partnerId] = split_pct

    // Validate: sum of all active partner splits must equal 100
    const { data: activePartners } = await supabase
      .from('cp_xray_partners')
      .select('id')
      .eq('is_active', true)

    const activeIds = new Set((activePartners ?? []).map((p) => p.id as string))
    const cleaned: Record<string, number> = {}
    for (const [pid, pct] of Object.entries(splitsConfig)) {
      if (activeIds.has(pid)) cleaned[pid] = pct
    }

    await saveXrayPartnerSplitsConfig(supabase, cleaned)

    revalidatePath('/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function deleteXrayPartner(id: string): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()

    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid ID' }

    const supabase = await createClient()

    const { error } = await supabase
      .from('cp_xray_partners')
      .update({ is_active: false })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    // Remove from split config
    const splitsConfig = await fetchXrayPartnerSplitsConfig(supabase)
    delete splitsConfig[id]
    await saveXrayPartnerSplitsConfig(supabase, splitsConfig)

    revalidatePath('/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// Doctor Settings
// commission_pct is stored directly on cp_doctors (not a separate table)
// =============================================================================

export async function getDoctorSettings(): Promise<ActionResult<DoctorWithCommission[]>> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const doctorsRes = await supabase
      .from('cp_doctors')
      .select('*')
      .is('deleted_at', null)
      .order('name', { ascending: true })

    if (doctorsRes.error) return { success: false, error: doctorsRes.error.message }

    const result: DoctorWithCommission[] = ((doctorsRes.data ?? []) as CpDoctor[]).map((d) => ({
      ...d,
      current_commission_pct:
        (d as unknown as { commission_pct: number | null }).commission_pct ?? null,
    }))

    return { success: true, data: result }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function updateDoctorSettings(
  doctorId: string,
  rawData: unknown
): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()

    const idParsed = z.string().uuid().safeParse(doctorId)
    if (!idParsed.success) return { success: false, error: 'Invalid doctor ID' }

    const parsed = doctorSettingsSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const { earning_model, commission_pct, monthly_salary } = parsed.data
    const supabase = await createClient()

    const doctorUpdate: {
      earning_model: 'salaried' | 'commission'
      monthly_salary?: number | null
      commission_pct?: number | null
    } = { earning_model }

    if (earning_model === 'salaried') {
      doctorUpdate.monthly_salary = monthly_salary ?? null
      doctorUpdate.commission_pct = null
    } else {
      doctorUpdate.commission_pct = commission_pct ?? null
      doctorUpdate.monthly_salary = null
    }

    const { error: doctorError } = await supabase
      .from('cp_doctors')
      .update(doctorUpdate)
      .eq('id', doctorId)

    if (doctorError) return { success: false, error: doctorError.message }

    revalidatePath('/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// Doctors — Create / Deactivate
// =============================================================================

const createDoctorSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(200),
    specialization: z.string().max(200).nullable().optional(),
    phone: z.string().max(50).nullable().optional(),
    earning_model: z.enum(['salaried', 'commission']),
    commission_pct: z.number().min(0).max(100).optional(),
    monthly_salary: z.number().int().min(0).optional(),
  })
  .refine(
    (d) => d.earning_model !== 'commission' || d.commission_pct !== undefined,
    { message: 'Commission % is required for commission-based doctors', path: ['commission_pct'] }
  )

export async function createDoctor(rawData: unknown): Promise<ActionResult<DoctorWithCommission>> {
  try {
    await requireAdmin()

    const parsed = createDoctorSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const { name, specialization, phone, earning_model, commission_pct, monthly_salary } =
      parsed.data
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_doctors')
      .insert({
        name,
        specialization: specialization ?? null,
        phone: phone ?? null,
        earning_model,
        commission_pct: earning_model === 'commission' ? (commission_pct ?? null) : null,
        monthly_salary: earning_model === 'salaried' ? (monthly_salary ?? null) : null,
        is_active: true,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    const row = data as CpDoctor
    const result: DoctorWithCommission = {
      ...row,
      current_commission_pct: row.commission_pct ?? null,
    }

    revalidatePath('/settings')
    return { success: true, data: result }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function deactivateDoctor(id: string): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()

    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid doctor ID' }

    const supabase = await createClient()

    // Set both is_active=false AND deleted_at so getDoctorSettings (which filters
    // on deleted_at IS NULL) excludes this doctor on every subsequent page load.
    const { error } = await supabase
      .from('cp_doctors')
      .update({ is_active: false, deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// Staff Types
// =============================================================================

export async function getStaffTypes(): Promise<ActionResult<string[]>> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    const { data } = await supabase
      .from('cp_settings')
      .select('setting_value')
      .eq('setting_key', 'staff.staff_types')
      .maybeSingle()

    if (!data?.setting_value) {
      return {
        success: true,
        data: ['Receptionist', 'Nurse', 'Technician', 'Cleaner', 'Security Guard'],
      }
    }

    const val = data.setting_value
    if (Array.isArray(val)) return { success: true, data: val as string[] }
    try {
      return { success: true, data: JSON.parse(val as string) as string[] }
    } catch {
      return { success: true, data: [] }
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function updateStaffTypes(rawData: unknown): Promise<ActionResult<undefined>> {
  try {
    await requireAdmin()

    const parsed = staffTypesSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const supabase = await createClient()
    const { error } = await supabase.from('cp_settings').upsert(
      {
        setting_key: 'staff.staff_types',
        setting_value: parsed.data.types,
      },
      { onConflict: 'setting_key' }
    )

    if (error) return { success: false, error: error.message }

    revalidatePath('/settings')
    return { success: true, data: undefined }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
