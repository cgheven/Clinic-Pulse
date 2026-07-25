import type { Metadata } from 'next'
import { ReportGenerator } from '@/components/lab/report-generator'
import { getTodayPKT } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Lab Reports',
}

export default function LabReportsPage() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-foreground sm:text-xl">Lab Reports</h1>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Generate daily PDF reports for laboratory activity
        </p>
      </div>

      <ReportGenerator initialDate={getTodayPKT()} />
    </div>
  )
}
