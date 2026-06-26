'use client'

import { format, parseISO } from 'date-fns'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrencyPaisas } from '@/lib/utils'
import type { DailyTrendPoint } from '@/app/actions/payments'

// =============================================================================
// Constants
// =============================================================================

/** Amber-led palette that respects the dark luxury theme */
const METHOD_COLORS: Record<string, string> = {
  cash:          '#f59e0b', // amber-500  (primary)
  jazzcash:      '#3b82f6', // blue-500   (info)
  easypaisa:     '#22c55e', // green-500  (success)
  bank_transfer: '#a78bfa', // violet-400
}

const METHOD_LABELS: Record<string, string> = {
  cash:          'Cash',
  jazzcash:      'JazzCash',
  easypaisa:     'Easypaisa',
  bank_transfer: 'Bank Transfer',
}

// =============================================================================
// Helpers
// =============================================================================

function formatAxisTick(value: number): string {
  if (value === 0) return '0'
  const pkr = value / 100
  if (pkr >= 100_000) return `${(pkr / 100_000).toFixed(1)}L`
  if (pkr >= 1_000)   return `${(pkr / 1_000).toFixed(0)}k`
  return String(Math.round(pkr))
}

function shortDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'dd MMM')
  } catch {
    return dateStr
  }
}

function longDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'EEEE, dd MMM yyyy')
  } catch {
    return dateStr
  }
}

// =============================================================================
// Custom Tooltip
// =============================================================================

interface TooltipPayloadEntry {
  dataKey: string
  value: number
  color: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length || !label) return null

  const total = payload.reduce((s, p) => s + (p.value ?? 0), 0)

  return (
    <div className="rounded-xl border border-border bg-card/95 p-3 shadow-xl backdrop-blur-sm">
      <p className="mb-2 text-xs font-semibold text-foreground">{longDate(label)}</p>
      <div className="space-y-1">
        {[...payload].reverse().map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-[11px] text-muted-foreground">
                {METHOD_LABELS[entry.dataKey] ?? entry.dataKey}
              </span>
            </div>
            <span className="text-[11px] font-semibold tabular-nums text-foreground">
              {formatCurrencyPaisas(entry.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 border-t border-border pt-2 flex items-center justify-between">
        <span className="text-[11px] font-bold text-muted-foreground">Total</span>
        <span className="text-xs font-bold tabular-nums text-primary">
          {formatCurrencyPaisas(total)}
        </span>
      </div>
    </div>
  )
}

// =============================================================================
// Props
// =============================================================================

interface DailyTrendChartProps {
  data: DailyTrendPoint[]
}

// =============================================================================
// Component
// =============================================================================

export function DailyTrendChart({ data }: DailyTrendChartProps) {
  const hasData = data.some((d) => d.total > 0)

  return (
    <Card className="border-border bg-card">
      <CardHeader className="border-b border-border pb-3 pt-4">
        <CardTitle className="text-sm font-semibold text-foreground">
          30-Day Payment Trend
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Stacked by payment method — completed transactions only
        </p>
      </CardHeader>

      <CardContent className="pb-3 pt-4">
        {!hasData ? (
          <div className="flex h-[280px] items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No payment data in the last 30 days.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={data}
              margin={{ top: 4, right: 12, left: 0, bottom: 0 }}
            >
              {/* Gradient fills */}
              <defs>
                {Object.entries(METHOD_COLORS).map(([key, color]) => (
                  <linearGradient
                    key={key}
                    id={`cpGrad-${key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%"  stopColor={color} stopOpacity={0.30} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1e1e2d"
                vertical={false}
              />

              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fill: '#7c7c9a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={40}
              />

              <YAxis
                tickFormatter={formatAxisTick}
                tick={{ fill: '#7c7c9a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={68}
              />

              <Tooltip content={<CustomTooltip />} />

              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', paddingTop: '14px' }}
                formatter={(name: string) => METHOD_LABELS[name] ?? name}
              />

              {/* Stacked areas — rendered in reverse so the legend order makes sense */}
              {Object.entries(METHOD_COLORS).map(([key, color]) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stackId="payments"
                  stroke={color}
                  strokeWidth={1.5}
                  fill={`url(#cpGrad-${key})`}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}
