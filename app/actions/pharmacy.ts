'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireAdmin } from '@/lib/auth'
import type { CpPharmacyInventory, CpPharmacySale, CpPharmacySaleItem, CpPatient, PaginatedResponse } from '@/types/index'

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================================================
// Types
// =============================================================================

export type InventoryParams = {
  search?: string
  lowStock?: boolean
  page?: number
  pageSize?: number
}

export type SaleLineItem = {
  inventory_id: string
  qty: number
}

export type SaleCreateData = {
  items: SaleLineItem[]
  patient_id?: string | null
  payment_method: 'cash' | 'jazzcash' | 'easypaisa' | 'bank_transfer'
  discount_paisas?: number
  notes?: string | null
}

export type SaleWithItems = CpPharmacySale & {
  items: (CpPharmacySaleItem & { inventory: Pick<CpPharmacyInventory, 'id' | 'name' | 'unit'> | null })[]
  patient: Pick<CpPatient, 'id' | 'name' | 'patient_no'> | null
}

export type DailySalesResult = {
  sales: SaleWithItems[]
  total_paisas: number
  sale_count: number
}

export type LowStockItem = Pick<CpPharmacyInventory, 'id' | 'name' | 'generic_name' | 'stock_qty' | 'reorder_level' | 'unit' | 'expiry_date'> & {
  stock_status: 'critical' | 'low'
}

export type RevenueSplitData = {
  doctor_pct: number
  clinic_pct: number
  staff_pct: number
}

// =============================================================================
// Schemas
// =============================================================================

const inventoryCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(300),
  generic_name: z.string().max(300).nullable().optional(),
  category: z.string().max(100).nullable().optional(),
  unit: z.string().min(1, 'Unit is required').max(50),
  stock_qty: z.number().int().min(0).default(0),
  reorder_level: z.number().int().min(0).default(0),
  cost_price_paisas: z.number().int().min(0).default(0),
  sale_price_paisas: z.number().int().min(0),
  batch_number: z.string().max(100).nullable().optional(),
  expiry_date: z.string().nullable().optional(),
})

const inventoryUpdateSchema = inventoryCreateSchema.partial().extend({ is_active: z.boolean().optional() })

const saleItemSchema = z.object({
  inventory_id: z.string().uuid(),
  qty: z.number().int().min(1),
})

const saleCreateSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  patient_id: z.string().uuid().nullable().optional(),
  payment_method: z.enum(['cash', 'jazzcash', 'easypaisa', 'bank_transfer']),
  discount_paisas: z.number().int().min(0).default(0),
  notes: z.string().max(500).nullable().optional(),
})

// =============================================================================
// Helpers
// =============================================================================

function todayISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
}

// =============================================================================
// getInventoryItem
// =============================================================================

export async function getInventoryItem(id: string): Promise<ActionResult<CpPharmacyInventory>> {
  try {
    await requireAuth()
    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid ID' }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cp_pharmacy_inventory')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return { success: false, error: error?.message ?? 'Item not found' }
    return { success: true, data: data as CpPharmacyInventory }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getInventory
// =============================================================================

export async function getInventory(params: InventoryParams = {}): Promise<ActionResult<PaginatedResponse<CpPharmacyInventory>>> {
  try {
    await requireAuth()
    const supabase = await createClient()
    const { search, page = 1, pageSize = 20 } = params
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('cp_pharmacy_inventory')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('name', { ascending: true })
      .range(from, to)

    if (search?.trim()) query = query.ilike('name', `%${search.trim()}%`)

    const { data, error, count } = await query
    if (error) return { success: false, error: error.message }

    let items = (data ?? []) as CpPharmacyInventory[]
    if (params.lowStock) items = items.filter((i) => i.stock_qty <= i.reorder_level)

    return {
      success: true,
      data: { data: items, count: count ?? 0, page, pageSize, totalPages: Math.ceil((count ?? 0) / pageSize) },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// createInventoryItem
// =============================================================================

export async function createInventoryItem(rawData: unknown): Promise<ActionResult<CpPharmacyInventory>> {
  try {
    const authUser = await requireAuth()
    const parsed = inventoryCreateSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

    const supabase = await createClient()
    const { category: _category, ...inventoryInsertData } = parsed.data
    const { data, error } = await supabase
      .from('cp_pharmacy_inventory')
      .insert({ ...inventoryInsertData, is_active: true, created_by: authUser.id })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    revalidatePath('/pharmacy/inventory')
    return { success: true, data: data as CpPharmacyInventory }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// updateInventoryItem
// =============================================================================

export async function updateInventoryItem(id: string, rawData: unknown): Promise<ActionResult<CpPharmacyInventory>> {
  try {
    await requireAuth()
    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid ID' }

    const parsed = inventoryUpdateSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

    const supabase = await createClient()
    const { category: _category, ...inventoryUpdateData } = parsed.data
    const { data, error } = await supabase.from('cp_pharmacy_inventory').update(inventoryUpdateData).eq('id', id).select().single()
    if (error) return { success: false, error: error.message }

    revalidatePath('/pharmacy/inventory')
    return { success: true, data: data as CpPharmacyInventory }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// adjustStock — manual stock in / out
// =============================================================================

export async function adjustStock(id: string, qty: number, type: 'in' | 'out', notes?: string): Promise<ActionResult<{ new_qty: number }>> {
  try {
    await requireAuth()
    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid ID' }
    if (!Number.isInteger(qty) || qty <= 0) return { success: false, error: 'Quantity must be a positive integer' }

    const supabase = await createClient()
    const { data: current, error: fetchErr } = await supabase
      .from('cp_pharmacy_inventory')
      .select('stock_qty, name')
      .eq('id', id)
      .single()

    if (fetchErr || !current) return { success: false, error: 'Item not found' }

    const newQty = type === 'in' ? (current.stock_qty as number) + qty : (current.stock_qty as number) - qty
    if (newQty < 0) return { success: false, error: `Cannot reduce below zero. Current: ${current.stock_qty}, Requested: ${qty}` }

    const { error: updErr } = await supabase.from('cp_pharmacy_inventory').update({ stock_qty: newQty }).eq('id', id)
    if (updErr) return { success: false, error: updErr.message }

    revalidatePath('/pharmacy/inventory')
    return { success: true, data: { new_qty: newQty } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// recordSale — insert header + line items; DB trigger decrements inventory
// =============================================================================

export async function recordSale(rawData: unknown): Promise<ActionResult<{ sale_id: string; total_paisas: number }>> {
  try {
    const authUser = await requireAuth()
    const parsed = saleCreateSchema.safeParse(rawData)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

    const { items, patient_id, payment_method, discount_paisas, notes } = parsed.data
    const supabase = await createClient()
    const today = todayISO()

    // Server-side price & stock validation — NEVER trust client prices
    const inventoryCache = new Map<string, { stock_qty: number; name: string; is_active: boolean; sale_price_paisas: number }>()
    for (const item of items) {
      const { data: inv, error: invErr } = await supabase
        .from('cp_pharmacy_inventory')
        .select('stock_qty, name, is_active, sale_price_paisas')
        .eq('id', item.inventory_id)
        .single()

      if (invErr || !inv) return { success: false, error: `Item not found: ${item.inventory_id}` }
      if (!(inv.is_active as boolean)) return { success: false, error: `Item is inactive: ${inv.name}` }
      if ((inv.stock_qty as number) < item.qty) return { success: false, error: `Insufficient stock for ${inv.name}. Available: ${inv.stock_qty}, Requested: ${item.qty}` }

      inventoryCache.set(item.inventory_id, inv as { stock_qty: number; name: string; is_active: boolean; sale_price_paisas: number })
    }

    // Compute line totals
    let lineTotals = 0
    const lineRows = items.map((item) => {
      const inv = inventoryCache.get(item.inventory_id)!
      const lineTotal = inv.sale_price_paisas * item.qty
      lineTotals += lineTotal
      return { inventory_id: item.inventory_id, qty: item.qty, unit_price_paisas: inv.sale_price_paisas, total_paisas: lineTotal }
    })

    const headerTotalPaisas = Math.max(0, lineTotals - (discount_paisas ?? 0))

    // Insert sale header
    const { data: saleHeader, error: headerErr } = await supabase
      .from('cp_pharmacy_sales')
      .insert({
        sale_date: today,
        patient_id: patient_id ?? null,
        total_paisas: headerTotalPaisas,
        payment_method,
        discount_paisas: discount_paisas ?? 0,
        notes: notes ?? null,
        created_by: authUser.id,
      })
      .select('id')
      .single()

    if (headerErr || !saleHeader) return { success: false, error: headerErr?.message ?? 'Failed to create sale' }

    // Insert line items
    const { error: itemsErr } = await supabase
      .from('cp_pharmacy_sale_items')
      .insert(lineRows.map((r) => ({ ...r, sale_id: saleHeader.id as string })))

    if (itemsErr) return { success: false, error: itemsErr.message }

    // Decrement inventory (explicit, in case DB trigger is not set up)
    for (const item of items) {
      const inv = inventoryCache.get(item.inventory_id)!
      await supabase.from('cp_pharmacy_inventory').update({ stock_qty: inv.stock_qty - item.qty }).eq('id', item.inventory_id)
    }

    revalidatePath('/pharmacy/sales')
    revalidatePath('/pharmacy')
    return { success: true, data: { sale_id: saleHeader.id as string, total_paisas: headerTotalPaisas } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getDailySales
// =============================================================================

export async function getDailySales(date: string): Promise<ActionResult<DailySalesResult>> {
  try {
    await requireAuth()
    const dateParsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(date)
    if (!dateParsed.success) return { success: false, error: 'Invalid date format' }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_pharmacy_sales')
      .select(
        `*, cp_patients!patient_id(id, name, patient_no),
        cp_pharmacy_sale_items(id, inventory_id, qty, unit_price_paisas, total_paisas,
          cp_pharmacy_inventory!inventory_id(id, name, unit))`
      )
      .eq('sale_date', date)
      .order('created_at', { ascending: false })

    if (error) return { success: false, error: error.message }

    type Row = CpPharmacySale & {
      cp_patients: Pick<CpPatient, 'id' | 'name' | 'patient_no'> | null
      cp_pharmacy_sale_items: (CpPharmacySaleItem & { cp_pharmacy_inventory: Pick<CpPharmacyInventory, 'id' | 'name' | 'unit'> | null })[]
    }

    const sales: SaleWithItems[] = ((data ?? []) as unknown as Row[]).map((s) => ({
      ...s,
      patient: s.cp_patients ?? null,
      items: (s.cp_pharmacy_sale_items ?? []).map((item) => ({ ...item, inventory: item.cp_pharmacy_inventory ?? null })),
    }))

    return {
      success: true,
      data: { sales, total_paisas: sales.reduce((sum, s) => sum + (s.total_paisas ?? 0), 0), sale_count: sales.length },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getLowStockItems
// =============================================================================

export async function getLowStockItems(): Promise<ActionResult<LowStockItem[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_pharmacy_inventory')
      .select('id, name, generic_name, stock_qty, reorder_level, unit, expiry_date')
      .eq('is_active', true)
      .is('deleted_at', null)
      .gt('reorder_level', 0)
      .order('stock_qty', { ascending: true })

    if (error) return { success: false, error: error.message }

    const items: LowStockItem[] = ((data ?? []) as unknown as Pick<CpPharmacyInventory, 'id' | 'name' | 'generic_name' | 'stock_qty' | 'reorder_level' | 'unit' | 'expiry_date'>[])
      .filter((i) => i.stock_qty <= Math.ceil(i.reorder_level * 1.2))
      .map((i) => ({ ...i, stock_status: (i.stock_qty <= i.reorder_level ? 'critical' : 'low') as 'critical' | 'low' }))

    return { success: true, data: items }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getActiveInventoryForSale — lightweight dropdown list
// =============================================================================

export async function getActiveInventoryForSale(): Promise<ActionResult<Pick<CpPharmacyInventory, 'id' | 'name' | 'generic_name' | 'unit' | 'sale_price_paisas' | 'stock_qty'>[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_pharmacy_inventory')
      .select('id, name, generic_name, unit, sale_price_paisas, stock_qty')
      .eq('is_active', true)
      .is('deleted_at', null)
      .gt('stock_qty', 0)
      .order('name', { ascending: true })

    if (error) return { success: false, error: error.message }
    return { success: true, data: data ?? [] }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// Revenue Split (stored in cp_settings)
// =============================================================================

export async function getPharmacyRevenueSplit(): Promise<ActionResult<RevenueSplitData>> {
  try {
    await requireAuth()
    const supabase = await createClient()
    const { data } = await supabase.from('cp_settings').select('setting_value').eq('setting_key', 'pharmacy.revenue_split').single()
    if (!data?.setting_value) return { success: true, data: { doctor_pct: 30, clinic_pct: 60, staff_pct: 10 } }
    return { success: true, data: data.setting_value as RevenueSplitData }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

export async function updatePharmacyRevenueSplit(rawData: unknown): Promise<ActionResult<undefined>> {
  try {
    const authUser = await requireAdmin()
    const schema = z.object({
      doctor_pct: z.number().min(0).max(100),
      clinic_pct: z.number().min(0).max(100),
      staff_pct: z.number().min(0).max(100),
    }).refine((d) => Math.round((d.doctor_pct + d.clinic_pct + d.staff_pct) * 10) === 1000, { message: 'Percentages must sum to 100' })

    const parsed = schema.safeParse(rawData)
    if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }

    const supabase = await createClient()
    const { error } = await supabase.from('cp_settings').upsert(
      { setting_key: 'pharmacy.revenue_split', setting_value: parsed.data as unknown as Record<string, unknown>, updated_by: authUser.id },
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
// getActivePaymentMethods — for sale form
// =============================================================================

export async function getActivePaymentMethods(): Promise<ActionResult<Array<{ method: string; label: string }>>> {
  try {
    await requireAuth()
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('cp_payment_methods')
      .select('method, label')
      .eq('is_enabled', true)
      .order('sort_order', { ascending: true })

    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as Array<{ method: string; label: string }> }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
