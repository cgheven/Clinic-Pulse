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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getDailyTestLog, getChemicals } from '@/app/actions/lab'
import { TestLogTable } from '@/components/lab/test-log-table'
import { formatCurrencyPaisas } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Laboratory',
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!
}

// =============================================================================
// Quick-access nav cards
// =============================================================================

const navCards = [
  {
    label: 'Record Test',
    description: 'Log a new lab test',
    href: '/lab/tests/new',
    icon: Plus,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  {
    label: 'Test Catalog',
    description: 'Manage test pricing',
    href: '/lab/catalog',
    icon: FlaskConical,
    color: 'text-info',
    bg: 'bg-info/10',
  },
  {
    label: 'Chemicals',
    description: 'Reagent inventory',
    href: '/lab/chemicals',
    icon: Beaker,
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  {
    label: 'Equipment',
    description: 'Machinery & maintenance',
    href: '/lab/equipment',
    icon: Microscope,
    color: 'text-success',
    bg: 'bg-success/10',
  },
  {
    label: 'Expenses',
    description: 'Lab-specific costs',
    href: '/lab/expenses',
    icon: Receipt,
    color: 'text-destructive',
    bg: 'bg-destructive/10',
  },
  {
    label: 'Reports',
    description: 'Generate PDF reports',
    href: '/lab/reports',
    icon: FileText,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
]

// =============================================================================
// Page
// =============================================================================

export default async function LabDashboardPage() {
  const today = todayISO()

  const [testLogResult, chemicalsResult] = await Promise.all([
    getDailyTestLog(today),
    getChemicals(),
  ])

  const testLog = testLogResult.success ? testLogResult.data : null
  const chemicals = chemicalsResult.success ? chemicalsResult.data : []
  const lowStockCount = chemicals.filter((c) => c.isLowStock).length

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Laboratory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Today's activity, inventory, and equipment at a glance
          </p>
        </div>
        <Link
          href="/lab/tests/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm shadow-primary/20 transition-colors hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Record Test
        </Link>
      </div>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Tests
            </CardTitle>
            <div className="rounded-lg bg-primary/10 p-2">
              <FlaskConical className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {testLog?.totalTests ?? '—'}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {testLog?.pendingCount
                ? `${testLog.pendingCount} pending payment`
                : 'All payments cleared'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Revenue
            </CardTitle>
            <div className="rounded-lg bg-success/10 p-2">
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {testLog ? formatCurrencyPaisas(testLog.totalRevenue) : '—'}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Lab test collections
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Tests
            </CardTitle>
            <div className="rounded-lg bg-warning/10 p-2">
              <FlaskConical className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {testLog?.pendingCount ?? '—'}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>

        <Card
          className={
            lowStockCount > 0
              ? 'border-destructive/30 bg-destructive/5'
              : 'border-border bg-card'
          }
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock
            </CardTitle>
            <div className="rounded-lg bg-destructive/10 p-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {lowStockCount}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Chemicals below threshold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick navigation */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quick Access
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {navCards.map((c) => {
            const Icon = c.icon
            return (
              <Link
                key={c.href}
                href={c.href}
                className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:bg-card/80 hover:shadow-sm"
              >
                <div className={`rounded-lg p-2.5 ${c.bg}`}>
                  <Icon className={`h-5 w-5 ${c.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Today's test log */}
      {testLog && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Today's Test Log
          </h2>
          <TestLogTable result={testLog} date={today} showAddButton={false} />
        </div>
      )}
    </div>
  )
}
