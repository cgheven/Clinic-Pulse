import React from 'react'
import { ReportsTabNav } from '@/components/reports/reports-tab-nav'

/**
 * Shared layout for every /reports/* route.
 *
 * The tab bar used to live inside each page body, which meant Next.js
 * unmounted it (and swapped in loading.tsx) on every tab click. Hoisting it
 * into a layout keeps it mounted across tab switches, so the active-tab
 * highlight moves instantly while only the panel below streams.
 *
 * The wrapper markup is identical to the `<div className="space-y-0">` that
 * previously wrapped `<ReportsTabNav />` + page body in each page.
 */
export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-0">
      <ReportsTabNav />
      {children}
    </div>
  )
}
