'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { DeptRevenue } from '@/app/actions/dashboard'
import { formatCurrencyPaisas } from '@/lib/utils'

// =============================================================================
// Types
// =============================================================================

interface RevenueChartProps {
  data: DeptRevenue[]
  loading?: boolean
}

// =============================================================================
// Loading skeleton
// =============================================================================

function ChartSkeleton() {
  return (
    <div className="animate-pulse space-y-3 py-2">
      <div className="flex items-end gap-4 h-40 px-4">
        {[60, 85, 40, 70].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-muted"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="flex gap-4 px-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-1 h-3 rounded bg-muted" />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Custom tooltip
// =============================================================================

interface TooltipPayloadItem {
  value: number
  name: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-lg">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs text-muted-foreground">
          {formatCurrencyPaisas(entry.value)}
        </p>
      ))}
    </div>
  )
}

// =============================================================================
// Amber shades per bar
// =============================================================================

const BAR_COLORS = ['#f59e0b', '#d97706', '#fbbf24', '#b45309']

// =============================================================================
// RevenueChart
// =============================================================================

export function RevenueChart({ data, loading = false }: RevenueChartProps) {
  if (loading) return <ChartSkeleton />

  const hasData = data.some((d) => d.revenue > 0)

  if (!hasData) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No revenue recorded today
      </div>
    )
  }

  const chartData = data.map((d) => ({
    name: d.dept,
    revenue: d.revenue,
    // Display value in rupees for axis label
    displayRupees: d.revenue / 100,
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
        barCategoryGap="28%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
          }
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
          // Y-axis data is in rupees (paisas / 100)
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'rgba(245,158,11,0.06)' }}
        />
        <Bar dataKey="displayRupees" radius={[4, 4, 0, 0]} maxBarSize={56}>
          {chartData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
