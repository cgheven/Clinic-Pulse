'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  CalendarDays,
  Stethoscope,
  Scan,
  Receipt,
  Users,
  FlaskConical,
  BookOpen,
} from 'lucide-react'

const TABS = [
  { label: 'Daily Revenue', href: '/reports/daily', icon: CalendarDays },
  { label: 'Doctor Earnings', href: '/reports/doctors', icon: Stethoscope },
  { label: 'Partner Payouts', href: '/reports/partners', icon: Scan },
  { label: 'Expenses', href: '/reports/expenses', icon: Receipt },
  { label: 'Payroll', href: '/reports/payroll', icon: Users },
  { label: 'Lab Report', href: '/reports/lab', icon: FlaskConical },
  { label: 'Cash Ledger', href: '/reports/ledger', icon: BookOpen },
] as const

export function ReportsTabNav() {
  const pathname = usePathname()

  return (
    <div className="border-b border-border bg-card">
      <nav className="flex overflow-x-auto px-4 -mb-px" aria-label="Report tabs">
        {TABS.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                active
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <Icon className={cn('h-4 w-4', active ? 'text-primary' : 'text-muted-foreground')} />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
