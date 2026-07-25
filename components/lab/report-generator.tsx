'use client'

import React, { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
import { cn, formatCurrencyPaisas, formatBasisPoints, getTodayPKT } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import {
  Download,
  FileText,
  Loader2,
  TrendingUp,
  FlaskConical,
  DollarSign,
  Users,
  Building2,
} from 'lucide-react'
import { generateLabReport } from '@/app/actions/lab'
import type { LabReportData } from '@/app/actions/lab'

// =============================================================================
// Props
// =============================================================================

interface ReportGeneratorProps {
  initialDate?: string
}

// =============================================================================
// Helper: format date for display
// =============================================================================

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// =============================================================================
// Report preview component
// =============================================================================

function ReportPreview({ data }: { data: LabReportData }) {
  const chips = [
    {
      label: 'Total Tests',
      value: data.totalTests.toString(),
      icon: FlaskConical,
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      label: 'Total Revenue',
      value: formatCurrencyPaisas(data.totalRevenue),
      icon: DollarSign,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      label: `Doctor (${formatBasisPoints(data.doctorSplitPct)})`,
      value: formatCurrencyPaisas(data.doctorSplitAmount),
      icon: Users,
      iconBg: 'bg-info/10',
      iconColor: 'text-info',
    },
    {
      label: `Clinic (${formatBasisPoints(data.clinicSplitPct)})`,
      value: formatCurrencyPaisas(data.clinicSplitAmount),
      icon: Building2,
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
    },
  ]

  return (
    <div className="space-y-3">
      {/* Stat chips */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {chips.map((c) => {
          const Icon = c.icon
          return (
            <div
              key={c.label}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5"
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${c.iconBg}`}
              >
                <Icon className={`h-4 w-4 ${c.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60 mb-0.5 leading-none">
                  {c.label}
                </p>
                <p className="text-sm font-bold tabular-nums text-foreground leading-tight">
                  {c.value}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Preview table */}
      {data.entries.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Test Log Preview
            </span>
            <span className="text-[11px] text-muted-foreground">
              {data.entries.length} entries
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="py-1.5 pl-4 pr-3 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Test
                  </th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Patient
                  </th>
                  <th className="px-3 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                    Result
                  </th>
                  <th className="px-3 py-1.5 text-right text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    Price
                  </th>
                  <th className="py-1.5 pl-3 pr-4 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground hidden sm:table-cell">
                    Payment
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {data.entries.map((e) => (
                  <tr key={e.id} className="hover:bg-muted/20 transition-colors">
                    <td className="py-2.5 pl-4 pr-3 text-sm font-medium text-foreground">
                      {e.test?.name ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
                      {e.patient?.name ?? 'Walk-in'}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-muted-foreground hidden sm:table-cell">
                      {e.result ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-sm font-medium text-foreground">
                      {formatCurrencyPaisas(e.price_paisas)}
                    </td>
                    <td className="py-2.5 pl-3 pr-4 text-[12px] text-muted-foreground hidden sm:table-cell">
                      {(
                        {
                          cash: 'Cash',
                          jazzcash: 'JazzCash',
                          easypaisa: 'EasyPaisa',
                          bank_transfer: 'Bank Transfer',
                        } as Record<string, string>
                      )[e.payment_method ?? ''] ??
                        e.payment_method ??
                        '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// PDF generation (client-side)
// =============================================================================

async function downloadPDF(data: LabReportData) {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  doc.setFontSize(18)
  doc.setTextColor(40, 40, 40)
  doc.text(data.clinicName, pageW / 2, 18, { align: 'center' })

  doc.setFontSize(13)
  doc.setTextColor(80, 80, 80)
  doc.text('Laboratory Report', pageW / 2, 26, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(120, 120, 120)
  doc.text(formatDisplayDate(data.date), pageW / 2, 33, { align: 'center' })

  doc.setDrawColor(200, 200, 200)
  doc.line(14, 37, pageW - 14, 37)

  const rows = data.entries.map((e) => [
    e.test?.name ?? '—',
    e.patient?.name ?? 'Walk-in',
    e.result ?? '—',
    `Rs. ${(e.price_paisas / 100).toFixed(2)}`,
    (
      {
        cash: 'Cash',
        jazzcash: 'JazzCash',
        easypaisa: 'EasyPaisa',
        bank_transfer: 'Bank Transfer',
      } as Record<string, string>
    )[e.payment_method ?? ''] ??
      e.payment_method ??
      '—',
  ])

  autoTable(doc, {
    startY: 42,
    head: [['Test Name', 'Patient', 'Result', 'Price', 'Payment Method']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [245, 158, 11],
      textColor: [10, 10, 15],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8.5, textColor: [40, 40, 40] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: { 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  })

  const finalY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  doc.setDrawColor(200, 200, 200)
  doc.line(14, finalY, pageW - 14, finalY)

  const colW = (pageW - 28) / 4
  const footerY = finalY + 8

  const footerItems = [
    ['Total Tests', data.totalTests.toString()],
    ['Total Revenue', `Rs. ${(data.totalRevenue / 100).toFixed(2)}`],
    [
      `Doctor Split (${(data.doctorSplitPct / 100).toFixed(0)}%)`,
      `Rs. ${(data.doctorSplitAmount / 100).toFixed(2)}`,
    ],
    [
      `Clinic Split (${(data.clinicSplitPct / 100).toFixed(0)}%)`,
      `Rs. ${(data.clinicSplitAmount / 100).toFixed(2)}`,
    ],
  ]

  footerItems.forEach(([label, value], i) => {
    const x = 14 + i * colW
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text(label!, x, footerY)
    doc.setFontSize(10)
    doc.setTextColor(40, 40, 40)
    doc.setFont('helvetica', 'bold')
    doc.text(value!, x, footerY + 6)
    doc.setFont('helvetica', 'normal')
  })

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text(
      `Generated on ${new Date().toLocaleString('en-PK')} — Page ${i} of ${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: 'center' }
    )
  }

  doc.save(`lab-report-${data.date}.pdf`)
}

// =============================================================================
// ReportGenerator
// =============================================================================

export function ReportGenerator({ initialDate }: ReportGeneratorProps) {
  const [date, setDate] = useState(initialDate ?? getTodayPKT())
  const [reportData, setReportData] = useState<LabReportData | null>(null)
  const [isFetching, setIsFetching] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [, startTransition] = useTransition()

  function handleGenerate() {
    setIsFetching(true)
    startTransition(async () => {
      const result = await generateLabReport(date)
      setIsFetching(false)

      if (result.success) {
        setReportData(result.data)
        if (result.data.totalTests === 0) {
          toast({
            title: 'No tests found',
            description: `No test records for ${formatDisplayDate(date)}.`,
          })
        }
      } else {
        toast({
          title: 'Failed to generate report',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  async function handleDownload() {
    if (!reportData) return
    setIsDownloading(true)
    try {
      await downloadPDF(reportData)
      toast({ title: 'PDF downloaded', description: `lab-report-${date}.pdf saved.` })
    } catch (err) {
      toast({
        title: 'Download failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Generator panel */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border bg-muted/20 px-4 py-2">
          <FileText className="h-3.5 w-3.5 text-primary" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Generate Lab Report
          </span>
        </div>
        <div className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="report-date" className="text-xs text-muted-foreground">
                Report Date
              </Label>
              <DateInput
                id="report-date"
                value={date}
                onChange={(v) => {
                  setDate(v)
                  setReportData(null)
                }}
                className="w-44 h-8 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={isFetching || !date}
              >
                {isFetching ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-1.5 h-3.5 w-3.5" />
                    Generate
                  </>
                )}
              </Button>

              {reportData && reportData.totalTests > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="border-border"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Generating PDF…
                    </>
                  ) : (
                    <>
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download PDF
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      {reportData && <ReportPreview data={reportData} />}
    </div>
  )
}
