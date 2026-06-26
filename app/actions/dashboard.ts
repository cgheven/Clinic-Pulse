'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { format, addDays } from 'date-fns'

function getTodayPKT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' })
}

// =============================================================================
// Return types
// =============================================================================

export type DeptRevenue = {
  dept: 'OPD' | 'Pharmacy' | 'Laboratory' | 'X-Ray'
  revenue: number // paisas
}

export type PaymentTotal = {
  method: string
  label: string
  total: number // paisas
}

export type RecentVisit = {
  id: string
  visit_date: string
  patient_name: string
  doctor_name: string | null
  fee_paisas: number
}

export type LowStockItem = {
  id: string
  name: string
  stock_qty: number
  reorder_level: number
  unit: string
}

export type UpcomingService = {
  id: string
  name: string
  model: string | null
  next_service: string
  days_until: number
}

export type DashboardStats = {
  revenue: number
  patients: number
  pharmSales: number
  labTests: number
  revenueByDept: DeptRevenue[]
  paymentTotals: PaymentTotal[]
  recentVisits: RecentVisit[]
  lowStockItems: LowStockItem[]
  lowStockCount: number
  upcomingService: UpcomingService[]
}

// =============================================================================
// getDashboardStats
// =============================================================================

export async function getDashboardStats(date?: string): Promise<DashboardStats> {
  await requireAuth()

  const supabase = await createClient()
  const today = date ?? getTodayPKT()

  const [
    visitsResult,
    pharmSalesResult,
    labLogsResult,
    xrayResult,
    paymentMethodsResult,
    machineryResult,
  ] = await Promise.all([
    // OPD visits today — fee_paisas, payment_method (enum), no deleted_at on visits
    supabase
      .from('cp_patient_visits')
      .select(
        'id, visit_date, fee_paisas, payment_method,' +
        'cp_patients!patient_id(name, patient_no),' +
        'cp_doctors!doctor_id(name)'
      )
      .eq('visit_date', today)
      .order('created_at', { ascending: false }),

    // Pharmacy sales today — total_paisas, payment_method (enum)
    supabase
      .from('cp_pharmacy_sales')
      .select('id, total_paisas, payment_method')
      .eq('sale_date', today),

    // Lab test logs today — price_paisas, payment_method (enum), test_date
    supabase
      .from('cp_lab_test_logs')
      .select('id, price_paisas, payment_method')
      .eq('test_date', today),

    // X-Ray revenue today — amount_paisas, payment_method (enum)
    supabase
      .from('cp_xray_revenue')
      .select('id, amount_paisas, payment_method')
      .eq('revenue_date', today),

    // Payment methods for labels
    supabase
      .from('cp_payment_methods')
      .select('method, label')
      .eq('is_enabled', true)
      .order('sort_order'),

    // Lab machinery with upcoming service (next 30 days)
    supabase
      .from('cp_lab_machinery')
      .select('id, name, model, next_service')
      .not('next_service', 'is', null)
      .lte('next_service', format(addDays(new Date(today), 30), 'yyyy-MM-dd'))
      .order('next_service', { ascending: true })
      .limit(5),
  ])

  type VisitRow = {
    id: string
    visit_date: string
    fee_paisas: number
    payment_method: string
    cp_patients: { name: string; patient_no: number } | null
    cp_doctors: { name: string } | null
  }

  const visits = (visitsResult.data as unknown as VisitRow[]) ?? []
  const pharmSales = pharmSalesResult.data ?? []
  const labLogs = labLogsResult.data ?? []
  const xrayRevenue = xrayResult.data ?? []
  const paymentMethods = paymentMethodsResult.data ?? []
  const machineryRaw = machineryResult.data ?? []

  // Low stock — separate query (Supabase can't compare two columns inline)
  const { data: allInventory } = await supabase
    .from('cp_pharmacy_inventory')
    .select('id, name, stock_qty, reorder_level, unit')
    .eq('is_active', true)
    .is('deleted_at', null)
    .gt('reorder_level', 0)

  const lowStockItems: LowStockItem[] = (allInventory ?? [])
    .filter((item) => (item.stock_qty as number) <= (item.reorder_level as number))
    .slice(0, 8)
    .map((item) => ({
      id: item.id as string,
      name: item.name as string,
      stock_qty: item.stock_qty as number,
      reorder_level: item.reorder_level as number,
      unit: item.unit as string,
    }))

  // Revenue sums
  const opdRevenue = visits.reduce((s, v) => s + (v.fee_paisas ?? 0), 0)
  const pharmRevenue = pharmSales.reduce((s, p: { total_paisas: number }) => s + (p.total_paisas ?? 0), 0)
  const labRevenue = labLogs.reduce((s, l: { price_paisas: number }) => s + (l.price_paisas ?? 0), 0)
  const xrayRev = xrayRevenue.reduce((s, x: { amount_paisas: number }) => s + (x.amount_paisas ?? 0), 0)

  const revenueByDept: DeptRevenue[] = [
    { dept: 'OPD', revenue: opdRevenue },
    { dept: 'Pharmacy', revenue: pharmRevenue },
    { dept: 'Laboratory', revenue: labRevenue },
    { dept: 'X-Ray', revenue: xrayRev },
  ]

  // Payment totals — group by enum value
  const pmMap = new Map<string, number>()
  const addAmt = (rows: Array<{ payment_method: string; [k: string]: unknown }>, amtKey: string) => {
    for (const row of rows) {
      if (!row.payment_method) continue
      const amt = (row[amtKey] as number) ?? 0
      pmMap.set(row.payment_method, (pmMap.get(row.payment_method) ?? 0) + amt)
    }
  }
  addAmt(visits as unknown as Array<{ payment_method: string; fee_paisas: number }>, 'fee_paisas')
  addAmt(pharmSales as unknown as Array<{ payment_method: string; total_paisas: number }>, 'total_paisas')
  addAmt(labLogs as unknown as Array<{ payment_method: string; price_paisas: number }>, 'price_paisas')
  addAmt(xrayRevenue as unknown as Array<{ payment_method: string; amount_paisas: number }>, 'amount_paisas')

  const paymentTotals: PaymentTotal[] = paymentMethods.map((pm) => ({
    method: pm.method as string,
    label: pm.label as string,
    total: pmMap.get(pm.method as string) ?? 0,
  }))

  // Recent visits (last 5)
  const recentVisits: RecentVisit[] = visits.slice(0, 5).map((v) => ({
    id: v.id,
    visit_date: v.visit_date,
    patient_name: v.cp_patients?.name ?? 'Unknown',
    doctor_name: v.cp_doctors?.name ?? null,
    fee_paisas: v.fee_paisas,
  }))

  // Upcoming service
  const upcomingService: UpcomingService[] = machineryRaw.map((m) => {
    const nextDate = m.next_service as string
    const daysUntil = Math.ceil(
      (new Date(nextDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
    )
    return {
      id: m.id as string,
      name: m.name as string,
      model: m.model as string | null,
      next_service: nextDate,
      days_until: daysUntil,
    }
  })

  return {
    revenue: opdRevenue + pharmRevenue + labRevenue + xrayRev,
    patients: visits.length,
    pharmSales: pharmRevenue,
    labTests: labLogs.length,
    revenueByDept,
    paymentTotals,
    recentVisits,
    lowStockItems,
    lowStockCount: lowStockItems.length,
    upcomingService,
  }
}
