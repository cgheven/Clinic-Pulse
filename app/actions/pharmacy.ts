'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, requireAdmin } from '@/lib/auth'
import type {
  CpPharmacyInventory,
  CpPharmacySale,
  CpPaymentMethod,
  CpPatient,
  PaginatedResponse,
} from '@/types/index'

// =============================================================================
// Shared result type
// =============================================================================

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string }

// =============================================================================
// Exported data types
// =============================================================================

export type InventoryParams = {
  search?: string
  lowStock?: boolean
  page?: number
  pageSize?: number
}

export type MedicineCreateData = {
  medicine_name: string
  generic_name?: string | null
  manufacturer?: string | null
  batch_no?: string | null
  barcode?: string | null
  unit: string
  pack_size: number
  cost_price_per_unit: number  // paisas
  selling_price_per_unit: number  // paisas
  quantity: number
  low_stock_threshold: number
  expiry_date?: string | null
  location?: string | null
  notes?: string | null
}

export type MedicineUpdateData = Partial<MedicineCreateData> & {
  is_active?: boolean
}

export type StockAdjustType = 'in' | 'out'

export type SaleItem = {
  inventory_item_id: string
  quantity_sold: number
  unit_price: number       // paisas — snapshot at time of sale
  discount_amount?: number // paisas
}

export type SaleCreateData = {
  items: SaleItem[]
  patient_id?: string | null
  payment_method_id: string
  notes?: string | null
}

export type SaleWithItem = CpPharmacySale & {
  inventory_item: Pick<
    CpPharmacyInventory,
    'id' | 'medicine_name' | 'generic_name' | 'unit' | 'selling_price_per_unit'
  > | null
  payment_method: Pick<CpPaymentMethod, 'id' | 'name' | 'slug'> | null
  patient: Pick<CpPatient, 'id' | 'full_name' | 'patient_no'> | null
}

export type DailySalesResult = {
  sales: SaleWithItem[]
  total_amount: number        // paisas
  sale_count: number
  revenue_split: RevenueSplitResult
}

export type RevenueSplitResult = {
  total_sales: number    // paisas
  clinic_pct: number     // basis points
  doctor_pct: number     // basis points
  staff_pct: number      // basis points
  clinic_share: number   // paisas
  doctor_share: number   // paisas
  staff_share: number    // paisas
  effective_from: string
}

export type LowStockItem = Pick<
  CpPharmacyInventory,
  | 'id'
  | 'medicine_name'
  | 'generic_name'
  | 'quantity'
  | 'low_stock_threshold'
  | 'unit'
  | 'expiry_date'
  | 'location'
> & {
  stock_status: 'critical' | 'low'
}

// =============================================================================
// Zod schemas
// =============================================================================

const medicineCreateSchema = z.object({
  medicine_name: z.string().min(1, 'Medicine name is required').max(300),
  generic_name: z.string().max(300).nullable().optional(),
  manufacturer: z.string().max(200).nullable().optional(),
  batch_no: z.string().max(100).nullable().optional(),
  barcode: z.string().max(100).nullable().optional(),
  unit: z.string().min(1, 'Unit is required').max(50),
  pack_size: z.number().int().min(1),
  cost_price_per_unit: z.number().int().min(0),
  selling_price_per_unit: z.number().int().min(0),
  quantity: z.number().int().min(0),
  low_stock_threshold: z.number().int().min(0),
  expiry_date: z.string().nullable().optional(),
  location: z.string().max(100).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
})

const medicineUpdateSchema = medicineCreateSchema.partial().extend({
  is_active: z.boolean().optional(),
})

const saleItemSchema = z.object({
  inventory_item_id: z.string().uuid(),
  quantity_sold: z.number().int().min(1),
  unit_price: z.number().int().min(0),
  discount_amount: z.number().int().min(0).optional().default(0),
})

const saleCreateSchema = z.object({
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
  patient_id: z.string().uuid().nullable().optional(),
  payment_method_id: z.string().uuid(),
  notes: z.string().max(500).nullable().optional(),
})

// =============================================================================
// Helpers
// =============================================================================

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!
}

// =============================================================================
// getInventory — paginated, searchable inventory list
// =============================================================================

export async function getInventory(
  params: InventoryParams = {}
): Promise<ActionResult<PaginatedResponse<CpPharmacyInventory>>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { search, lowStock, page = 1, pageSize = 20 } = params
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from('cp_pharmacy_inventory')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('medicine_name', { ascending: true })
      .range(from, to)

    if (search && search.trim().length > 0) {
      query = query.ilike('medicine_name', `%${search.trim()}%`)
    }

    if (lowStock) {
      // quantity <= low_stock_threshold
      query = query.filter('quantity', 'lte', 'low_stock_threshold')
    }

    const { data, error, count } = await query

    if (error) return { success: false, error: error.message }

    // Apply lowStock filter in JS since Supabase doesn't support column comparisons in filter
    let items = (data ?? []) as CpPharmacyInventory[]
    if (lowStock) {
      items = items.filter((i) => i.quantity <= i.low_stock_threshold)
    }

    const totalCount = lowStock ? items.length : (count ?? 0)

    return {
      success: true,
      data: {
        data: items,
        count: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize),
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getMedicine — single medicine detail with recent sales history
// =============================================================================

export async function getMedicine(id: string): Promise<
  ActionResult<{
    medicine: CpPharmacyInventory
    recentSales: SaleWithItem[]
  }>
> {
  try {
    await requireAuth()

    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid medicine ID' }

    const supabase = await createClient()

    const [medicineRes, salesRes] = await Promise.all([
      supabase
        .from('cp_pharmacy_inventory')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single(),
      supabase
        .from('cp_pharmacy_sales')
        .select(
          `*,
          inventory_item:cp_pharmacy_inventory(id, medicine_name, generic_name, unit, selling_price_per_unit),
          payment_method:cp_payment_methods(id, name, slug),
          patient:cp_patients(id, full_name, patient_no)`
        )
        .eq('inventory_item_id', id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    if (medicineRes.error || !medicineRes.data) {
      return { success: false, error: medicineRes.error?.message ?? 'Medicine not found' }
    }

    return {
      success: true,
      data: {
        medicine: medicineRes.data as CpPharmacyInventory,
        recentSales: (salesRes.data ?? []) as unknown as SaleWithItem[],
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// createMedicine — add medicine to inventory
// =============================================================================

export async function createMedicine(
  rawData: unknown
): Promise<ActionResult<CpPharmacyInventory>> {
  try {
    const authUser = await requireAuth()

    const parsed = medicineCreateSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_pharmacy_inventory')
      .insert({ ...parsed.data, created_by: authUser.id, is_active: true })
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/pharmacy/inventory')
    revalidatePath('/pharmacy')
    return { success: true, data: data as CpPharmacyInventory }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// updateMedicine — update medicine details / pricing
// =============================================================================

export async function updateMedicine(
  id: string,
  rawData: unknown
): Promise<ActionResult<CpPharmacyInventory>> {
  try {
    await requireAuth()

    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid medicine ID' }

    const parsed = medicineUpdateSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_pharmacy_inventory')
      .update(parsed.data)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/pharmacy/inventory')
    revalidatePath(`/pharmacy/inventory/${id}`)
    revalidatePath('/pharmacy')
    return { success: true, data: data as CpPharmacyInventory }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// adjustStock — manual stock in / out (direct quantity update)
// The DB trigger fn_adjust_inventory_on_sale handles sale-based decrements;
// this action handles manual adjustments (receiving shipments, write-offs, etc.)
// =============================================================================

export async function adjustStock(
  id: string,
  qty: number,
  type: StockAdjustType,
  notes?: string
): Promise<ActionResult<{ new_quantity: number }>> {
  try {
    await requireAuth()

    const idParsed = z.string().uuid().safeParse(id)
    if (!idParsed.success) return { success: false, error: 'Invalid medicine ID' }

    if (!Number.isInteger(qty) || qty <= 0) {
      return { success: false, error: 'Quantity must be a positive integer' }
    }

    const supabase = await createClient()

    // Fetch current quantity
    const { data: current, error: fetchError } = await supabase
      .from('cp_pharmacy_inventory')
      .select('quantity, medicine_name')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !current) {
      return { success: false, error: fetchError?.message ?? 'Medicine not found' }
    }

    const newQty = type === 'in' ? current.quantity + qty : current.quantity - qty

    if (newQty < 0) {
      return {
        success: false,
        error: `Cannot reduce stock below zero. Current: ${current.quantity}, Requested reduction: ${qty}`,
      }
    }

    const { error: updateError } = await supabase
      .from('cp_pharmacy_inventory')
      .update({
        quantity: newQty,
        notes: notes
          ? `[${type === 'in' ? 'Stock IN' : 'Stock OUT'} ${qty} units on ${todayISO()}]: ${notes}`
          : undefined,
      })
      .eq('id', id)

    if (updateError) return { success: false, error: updateError.message }

    revalidatePath('/pharmacy/inventory')
    revalidatePath(`/pharmacy/inventory/${id}`)
    revalidatePath('/pharmacy')
    return { success: true, data: { new_quantity: newQty } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getDailySales — all sales for a date with totals + revenue split
// =============================================================================

export async function getDailySales(
  date: string
): Promise<ActionResult<DailySalesResult>> {
  try {
    await requireAuth()

    const dateParsed = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(date)
    if (!dateParsed.success) return { success: false, error: 'Invalid date format (YYYY-MM-DD)' }

    const supabase = await createClient()

    const { data: salesData, error: salesError } = await supabase
      .from('cp_pharmacy_sales')
      .select(
        `*,
        inventory_item:cp_pharmacy_inventory(id, medicine_name, generic_name, unit, selling_price_per_unit),
        payment_method:cp_payment_methods(id, name, slug),
        patient:cp_patients(id, full_name, patient_no)`
      )
      .eq('sale_date', date)
      .eq('payment_status', 'completed')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (salesError) return { success: false, error: salesError.message }

    const sales = (salesData ?? []) as unknown as SaleWithItem[]
    const total_amount = sales.reduce((sum, s) => sum + (s.total_amount ?? 0), 0)

    const splitResult = await getRevenueSplit(date)
    const revenue_split: RevenueSplitResult =
      splitResult.success
        ? splitResult.data
        : {
            total_sales: total_amount,
            clinic_pct: 6000,
            doctor_pct: 3000,
            staff_pct: 1000,
            clinic_share: Math.round(total_amount * 0.6),
            doctor_share: Math.round(total_amount * 0.3),
            staff_share: Math.round(total_amount * 0.1),
            effective_from: date,
          }

    return {
      success: true,
      data: {
        sales,
        total_amount,
        sale_count: sales.length,
        revenue_split,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// recordSale — insert sale line items; DB trigger decrements inventory
// =============================================================================

export async function recordSale(
  rawData: unknown
): Promise<ActionResult<{ sale_ids: string[]; total_amount: number }>> {
  try {
    const authUser = await requireAuth()

    const parsed = saleCreateSchema.safeParse(rawData)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? 'Validation failed' }
    }

    const { items, patient_id, payment_method_id, notes } = parsed.data
    const supabase = await createClient()
    const today = todayISO()

    // SECURITY FIX (FINDING-005): Fetch server-side inventory data for ALL
    // stock and price validation.  The client-supplied unit_price is IGNORED —
    // we always use the authoritative selling_price_per_unit from the DB.
    // This prevents financial fraud via price manipulation through the API.
    const inventoryCache = new Map<
      string,
      { quantity: number; medicine_name: string; is_active: boolean; selling_price_per_unit: number }
    >()

    for (const item of items) {
      const { data: inv, error: invErr } = await supabase
        .from('cp_pharmacy_inventory')
        .select('quantity, medicine_name, is_active, selling_price_per_unit')
        .eq('id', item.inventory_item_id)
        .is('deleted_at', null)
        .single()

      if (invErr || !inv) {
        return { success: false, error: `Medicine not found: ${item.inventory_item_id}` }
      }
      if (!inv.is_active) {
        return { success: false, error: `Medicine is inactive: ${inv.medicine_name}` }
      }
      if (inv.quantity < item.quantity_sold) {
        return {
          success: false,
          error: `Insufficient stock for ${inv.medicine_name}. Available: ${inv.quantity}, Requested: ${item.quantity_sold}`,
        }
      }
      inventoryCache.set(item.inventory_item_id, inv)
    }

    // Insert all sale rows — unit_price sourced from server-side inventory record
    const insertRows = items.map((item) => {
      const inv = inventoryCache.get(item.inventory_item_id)!
      return {
        sale_date: today,
        patient_id: patient_id ?? null,
        inventory_item_id: item.inventory_item_id,
        quantity_sold: item.quantity_sold,
        unit_price: inv.selling_price_per_unit, // always use DB price, never client value
        discount_amount: item.discount_amount ?? 0,
        payment_method_id,
        payment_status: 'completed' as const,
        notes: notes ?? null,
        sold_by: authUser.id,
      }
    })

    const { data: inserted, error: insertError } = await supabase
      .from('cp_pharmacy_sales')
      .insert(insertRows)
      .select('id, total_amount')

    if (insertError) return { success: false, error: insertError.message }

    const sale_ids = (inserted ?? []).map((r) => r.id as string)
    const total_amount = (inserted ?? []).reduce(
      (sum, r) => sum + ((r.total_amount as number) ?? 0),
      0
    )

    revalidatePath('/pharmacy/sales')
    revalidatePath('/pharmacy')
    return { success: true, data: { sale_ids, total_amount } }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getRevenueSplit — fetch active split config and calculate shares for a date
// =============================================================================

export async function getRevenueSplit(
  date: string
): Promise<ActionResult<RevenueSplitResult>> {
  try {
    await requireAuth()

    const supabase = await createClient()

    // Fetch most recent split config effective on or before the given date
    const { data: splitData, error: splitError } = await supabase
      .from('cp_pharmacy_revenue_split')
      .select('*')
      .lte('effective_from', date)
      .order('effective_from', { ascending: false })
      .limit(1)
      .single()

    const split = splitError || !splitData
      ? { clinic_pct: 6000, doctor_pct: 3000, staff_pct: 1000, effective_from: date }
      : splitData

    // Fetch total sales for that date
    const { data: totalsData, error: totalsError } = await supabase
      .from('cp_pharmacy_sales')
      .select('total_amount')
      .eq('sale_date', date)
      .eq('payment_status', 'completed')
      .is('deleted_at', null)

    if (totalsError) return { success: false, error: totalsError.message }

    const total_sales = (totalsData ?? []).reduce(
      (sum, r) => sum + ((r.total_amount as number) ?? 0),
      0
    )

    const clinic_share = Math.round((total_sales * split.clinic_pct) / 10000)
    const doctor_share = Math.round((total_sales * split.doctor_pct) / 10000)
    const staff_share = Math.round((total_sales * split.staff_pct) / 10000)

    return {
      success: true,
      data: {
        total_sales,
        clinic_pct: split.clinic_pct,
        doctor_pct: split.doctor_pct,
        staff_pct: split.staff_pct,
        clinic_share,
        doctor_share,
        staff_share,
        effective_from: split.effective_from,
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getLowStockItems — items at or below reorder threshold
// =============================================================================

export async function getLowStockItems(): Promise<ActionResult<LowStockItem[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_pharmacy_inventory')
      .select(
        'id, medicine_name, generic_name, quantity, low_stock_threshold, unit, expiry_date, location'
      )
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('quantity', { ascending: true })

    if (error) return { success: false, error: error.message }

    // Filter items at or below threshold, or within 20% above it
    const threshold120Pct = (item: { quantity: number; low_stock_threshold: number }) =>
      item.quantity <= Math.ceil(item.low_stock_threshold * 1.2)

    const items = (data ?? [])
      .filter(threshold120Pct)
      .map((item) => ({
        ...item,
        stock_status: (item.quantity <= item.low_stock_threshold ? 'critical' : 'low') as
          | 'critical'
          | 'low',
      }))

    return { success: true, data: items }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getActiveInventoryForSale — lightweight list for sale form dropdowns
// =============================================================================

export async function getActiveInventoryForSale(): Promise<
  ActionResult<
    Pick<
      CpPharmacyInventory,
      'id' | 'medicine_name' | 'generic_name' | 'unit' | 'selling_price_per_unit' | 'quantity'
    >[]
  >
> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_pharmacy_inventory')
      .select('id, medicine_name, generic_name, unit, selling_price_per_unit, quantity')
      .eq('is_active', true)
      .is('deleted_at', null)
      .gt('quantity', 0)
      .order('medicine_name', { ascending: true })

    if (error) return { success: false, error: error.message }

    return { success: true, data: data ?? [] }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}

// =============================================================================
// getActivePaymentMethods — for sale form
// =============================================================================

export async function getActivePaymentMethods(): Promise<ActionResult<CpPaymentMethod[]>> {
  try {
    await requireAuth()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('cp_payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) return { success: false, error: error.message }

    return { success: true, data: (data ?? []) as CpPaymentMethod[] }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unexpected error' }
  }
}
