import type { Metadata } from 'next'
import Link from 'next/link'
import {
  AlertTriangle,
  Beaker,
  FileText,
  FlaskConical,
  Microscope,
  Plus,
  Receipt,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getDailyTestLog, getChemicals } from '@/app/actions/lab'
import { TestLogTable } from '@/components/lab/test-log-table'
import { formatCurrencyPaisas, getTodayPKT } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Laboratory',
}

// =============================================================================
// Quick-access nav links
// =============================================================================

const navLinks = [
  { label: 'Record Test', href: '/lab/tests/new', icon: Plus },
  { label: 'Test Catalog', href: '/lab/catalog', icon: FlaskConical },
  { label: 'Chemicals', href: '/lab/chemicals', icon: Beaker },
  { label: 'Equipment', href: '/lab/equipment', icon: Microscope },
  { label: 'Expenses', href: '/lab/expenses', icon: Receipt },
  { label: 'Reports', href: '/lab/reports', icon: FileText },
]

// =============================================================================
// Page
// =============================================================================

export default async function LabDashboardPage() {
  const today = getTodayPKT()

  const [testLogResult, chemicalsResult] = await Promise.all([
    getDailyTestLog(today),
    getChemicals(),
  ])

  const testLog = testLogResult.success ? testLogResult.data : null
  const chemicals = chemicalsResult.success ? chemicalsResult.data : []
  const lowStockCount = chemicals.filter((c) => c.isLowStock).length

  const stats = [
    {
      label: "Today's Tests",
      value: String(testLog?.totalTests ?? '—'),
      icon: FlaskConical,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      label: "Today's Revenue",
      value: testLog ? formatCurrencyPaisas(testLog.totalRevenue) : '—',
      icon: TrendingUp,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      label: 'Pending Tests',
      value: String(testLog?.pendingCount ?? '—'),
      icon: FlaskConical,
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    {
      label: 'Low Stock',
      value: String(lowStockCount),
      icon: AlertTriangle,
      iconBg: lowStockCount > 0 ? 'bg-destructive/10' : 'bg-muted/20',
      iconColor: lowStockCount > 0 ? 'text-destructive' : 'text-muted-foreground',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Laboratory</h1>
        <Button size="sm" asChild>
          <Link href="/lab/tests/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Record Test
          </Link>
        </Button>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div
              key={s.label}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5"
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${s.iconBg}`}
              >
                <Icon className={`h-4 w-4 ${s.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60 mb-0.5 leading-none">
                  {s.label}
                </p>
                <p className="text-sm font-bold tabular-nums text-foreground leading-tight">
                  {s.value}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick-link pill strip */}
      <div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Quick Access
        </p>
        <div className="flex flex-wrap gap-2">
          {navLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                <Icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Today's test log */}
      {testLog && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Today&apos;s Test Log
          </p>
          <TestLogTable result={testLog} date={today} showAddButton={false} />
        </div>
      )}
    </div>
  )
}
