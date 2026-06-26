import type { Metadata } from 'next'
import { ReportGenerator } from '@/components/lab/report-generator'

export const metadata: Metadata = {
  title: 'Lab Reports',
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]!
}

export default function LabReportsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lab Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate daily or monthly PDF reports for laboratory activity
        </p>
      </div>

      <ReportGenerator initialDate={todayISO()} />
    </div>
  )
}
