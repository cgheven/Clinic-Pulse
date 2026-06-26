'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth'
import { getTodayPKT } from '@/lib/utils'
import { format, addDays } from 'date-fns'

// =============================================================================
// Return types
// =============================================================================

export type DeptRevenue = {
  dept: 'OPD' | 'Pharmacy' | 'Laboratory' | 'X-Ray'
  revenue: number // paisas
}

export type PaymentTotal = {
  id: string
  name: string
  slug: string
  icon_name: string | null
  total: number // paisas
}

export type RecentVisit = {
  id: string
  visit_date: string
  visit_time: string
  patient_name: string
  patient_no: string
  doctor_name: string | null
  net_fee: number // paisas
  payment_status: string
}

export type LowStockItem = {
  id: string
  medicine_name: string
  quantity: number
  low_stock_threshold: number
  unit: string
}

export type UpcomingService = {
  id: string
  machine_name: string
  model_no: string | null
  next_maintenance_date: string
  days_until: number
}

export type DashboardStats = {
  revenue: number          // total today — paisas
  patients: number         // OPD patient visits today
  pharmSales: number       // pharmacy sales today — paisas
  labTests: number         // lab test logs today count
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

  // Run all queries in parallel
  const [
    visitsResult,
    pharmSalesResult,
    labLogsResult,
    xrayResult,
    paymentMethodsResult,
    lowStockResult,
    machineryResult,
  ] = await Promise.all([
    // OPD visits today
    supabase
      .from('cp_patient_visits')
      .select(
        'id, visit_date, visit_time, net_fee, payment_status, payment_method_id, ' +
        'cp_patients!patient_id(full_name, patient_no), ' +
        'cp_doctors!doctor_id(full_name)'
      )
      .eq('visit_date', today)
      .is('deleted_at', null)
      .order('visit_time', { ascending: false }),

    // Pharmacy sales today
    supabase
      .from('cp_pharmacy_sales')
      .select('id, total_amount, payment_method_id, payment_status')
      .eq('sale_date', today)
      .is('deleted_at', null),

    // Lab test logs today
    supabase
      .from('cp_lab_test_logs')
      .select('id, total_amount, payment_method_id, payment_status')
      .eq('log_date', today)
      .is('deleted_at', null),

    // X-Ray revenue today
    supabase
      .from('cp_xray_revenue')
      .select('id, gross_amount, payment_method_id, payment_status')
      .eq('revenue_date', today)
      .is('deleted_at', null),

    // Payment methods
    supabase
      .from('cp_payment_methods')
      .select('id, name, slug, icon_name')
      .eq('is_active', true)
      .order('sort_order'),

    // Low stock pharmacy items
    supabase
      .from('cp_pharmacy_inventory')
      .select('id, medicine_name, quantity, low_stock_threshold, unit')
      .eq('is_active', true)
      .is('deleted_at', null)
      .filter('quantity', 'lte', 'low_stock_threshold'),

    // Lab machinery with upcoming service (next 30 days)
    supabase
      .from('cp_lab_machinery')
      .select('id, machine_name, model_no, next_maintenance_date')
      .eq('is_active', true)
      .is('deleted_at', null)
      .not('next_maintenance_date', 'is', null)
      .lte('next_maintenance_date', format(addDays(new Date(today), 30), 'yyyy-MM-dd'))
      .order('next_maintenance_date', { ascending: true })
      .limit(5),
  ])

  type VisitRow = {
    id: string
    visit_date: string
    visit_time: string
    net_fee: number
    payment_status: string
    payment_method_id: string | null
    cp_patients: { full_name: string; patient_no: string } | null
    cp_doctors: { full_name: string } | null
  }

  const visits: VisitRow[] = (visitsResult.data as unknown as VisitRow[]) ?? []

  const pharmSales = pharmSalesResult.data ?? []
  const labLogs = labLogsResult.data ?? []
  const xrayRevenue = xrayResult.data ?? []
  const paymentMethods = paymentMethodsResult.data ?? []
  const machineryRaw = machineryResult.data ?? []

  // ── Low stock: re-query correctly (Supabase can't compare two columns in .filter)
  const { data: allInventory } = await supabase
    .from('cp_pharmacy_inventory')
    .select('id, medicine_name, quantity, low_stock_threshold, unit')
    .eq('is_active', true)
    .is('deleted_at', null)
    .gt('low_stock_threshold', 0)

  const lowStockItems: LowStockItem[] = (allInventory ?? [])
    .filter((item) => item.quantity <= item.low_stock_threshold)
    .slice(0, 8)
    .map((item) => ({
      id: item.id as string,
      medicine_name: item.medicine_name as string,
      quantity: item.quantity as number,
      low_stock_threshold: item.low_stock_threshold as number,
      unit: item.unit as string,
    }))

  // ── Revenue sums
  const opdRevenue = visits.reduce((s, v) => s + (v.net_fee ?? 0), 0)
  const pharmRevenue = pharmSales.reduce(
    (s: number, p: { total_amount: number }) => s + (p.total_amount ?? 0),
    0
  )
  const labRevenue = labLogs.reduce(
    (s: number, l: { total_amount: number }) => s + (l.total_amount ?? 0),
    0
  )
  const xrayRev = xrayRevenue.reduce(
    (s: number, x: { gross_amount: number }) => s + (x.gross_amount ?? 0),
    0
  )

  const revenueByDept: DeptRevenue[] = [
    { dept: 'OPD', revenue: opdRevenue },
    { dept: 'Pharmacy', revenue: pharmRevenue },
    { dept: 'Laboratory', revenue: labRevenue },
    { dept: 'X-Ray', revenue: xrayRev },
  ]

  // ── Payment method totals (across all depts)
  const pmMap = new Map<string, number>()

  const addPayments = (
    rows: Array<{ payment_method_id: string | null; total_amount?: number; net_fee?: number; gross_amount?: number }>
  ) => {
    for (const row of rows) {
      if (!row.payment_method_id) continue
      const amount = row.total_amount ?? row.net_fee ?? row.gross_amount ?? 0
      pmMap.set(row.payment_method_id, (pmMap.get(row.payment_method_id) ?? 0) + amount)
    }
  }

  addPayments(visits.map((v) => ({ payment_method_id: v.payment_method_id, net_fee: v.net_fee })))
  addPayments(pharmSales as Array<{ payment_method_id: string | null; total_amount: number }>)
  addPayments(labLogs as Array<{ payment_method_id: string | null; total_amount: number }>)
  addPayments(xrayRevenue as Array<{ payment_method_id: string | null; gross_amount: number }>)

  const paymentTotals: PaymentTotal[] = paymentMethods.map((pm) => ({
    id: pm.id as string,
    name: pm.name as string,
    slug: pm.slug as string,
    icon_name: pm.icon_name as string | null,
    total: pmMap.get(pm.id as string) ?? 0,
  }))

  // ── Recent visits (last 5)
  const recentVisits: RecentVisit[] = visits.slice(0, 5).map((v) => ({
    id: v.id,
    visit_date: v.visit_date,
    visit_time: v.visit_time,
    patient_name: v.cp_patients?.full_name ?? 'Unknown',
    patient_no: v.cp_patients?.patient_no ?? '—',
    doctor_name: v.cp_doctors?.full_name ?? null,
    net_fee: v.net_fee,
    payment_status: v.payment_status,
  }))

  // ── Upcoming service
  const upcomingService: UpcomingService[] = machineryRaw.map((m) => {
    const nextDate = m.next_maintenance_date as string
    const daysUntil = Math.ceil(
      (new Date(nextDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)
    )
    return {
      id: m.id as string,
      machine_name: m.machine_name as string,
      model_no: m.model_no as string | null,
      next_maintenance_date: nextDate,
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
