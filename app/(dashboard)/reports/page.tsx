import type { Metadata } from 'next'
import Link from 'next/link'
import {
  CalendarDays,
  Stethoscope,
  Scan,
  Receipt,
  Users,
  FlaskConical,
  BookOpen,
} from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { ReportsTabNav } from '@/components/reports/reports-tab-nav'

// =============================================================================
// Metadata
// =============================================================================

export const metadata: Metadata = {
  title: 'Reports — ClinicPulse',
}

// =============================================================================
// Quick links
// =============================================================================

const REPORT_LINKS = [
  { href: '/reports/daily', label: 'Daily Revenue', icon: CalendarDays },
  { href: '/reports/doctors', label: 'Doctor Earnings', icon: Stethoscope },
  { href: '/reports/lab', label: 'Lab Report', icon: FlaskConical },
  { href: '/reports/partners', label: 'Partner Payouts', icon: Scan },
  { href: '/reports/payroll', label: 'Payroll', icon: Users },
  { href: '/reports/expenses', label: 'Expenses', icon: Receipt },
  { href: '/reports/ledger', label: 'Cash Ledger', icon: BookOpen },
] as const

// =============================================================================
// Page
// =============================================================================

export default async function ReportsPage() {
  await requireAuth()

  return (
    <div className="space-y-0">
      <ReportsTabNav />

      <div className="space-y-4 p-4">
        <div>
          <h1 className="text-lg font-bold text-foreground sm:text-xl">Reports</h1>
          <p className="text-[12px] text-muted-foreground">
            Select a report type to view detailed data
          </p>
        </div>

        {/* Quick-link pill strip */}
        <div className="flex flex-wrap gap-2">
          {REPORT_LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
