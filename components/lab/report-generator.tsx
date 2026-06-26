'use client'

import React, { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn, formatCurrencyPaisas, formatBasisPoints } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import {
  Download,
  FileText,
  Loader2,
  TrendingUp,
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
  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border bg-muted/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Tests</p>
            <p className="text-2xl font-bold text-foreground">{data.totalTests}</p>
          </CardContent>
        </Card>
        <Card className="border-border bg-muted/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-xl font-bold text-primary">
              {formatCurrencyPaisas(data.totalRevenue)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-muted/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Doctor Split ({formatBasisPoints(data.doctorSplitPct)})
            </p>
            <p className="text-xl font-bold text-info">
              {formatCurrencyPaisas(data.doctorSplitAmount)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border bg-muted/20">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              Clinic Split ({formatBasisPoints(data.clinicSplitPct)})
            </p>
            <p className="text-xl font-bold text-success">
              {formatCurrencyPaisas(data.clinicSplitAmount)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Preview table */}
      {data.entries.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Test Log Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/20">
                    <th className="py-2 pl-4 pr-3 text-left text-xs font-semibold text-muted-foreground">
                      Test
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                      Patient
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">
                      Result
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground">
                      Price
                    </th>
                    <th className="py-2 pl-3 pr-4 text-left text-xs font-semibold text-muted-foreground">
                      Payment
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.entries.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/10">
                      <td className="py-2.5 pl-4 pr-3 text-foreground">
                        {e.test?.name ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {e.patient?.name ?? 'Walk-in'}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground">
                        {e.result ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium text-foreground">
                        {formatCurrencyPaisas(e.price_paisas)}
                      </td>
                      <td className="py-2.5 pl-3 pr-4 text-muted-foreground">
                        {({ cash: 'Cash', jazzcash: 'JazzCash', easypaisa: 'EasyPaisa', bank_transfer: 'Bank Transfer' } as Record<string, string>)[e.payment_method ?? ''] ?? e.payment_method ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// =============================================================================
// PDF generation (client-side)
// =============================================================================

async function downloadPDF(data: LabReportData) {
  // Dynamic import to avoid SSR issues
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  // ─── Header ────────────────────────────────────────────────────────────────
  doc.setFontSize(18)
  doc.setTextColor(40, 40, 40)
  doc.text(data.clinicName, pageW / 2, 18, { align: 'center' })

  doc.setFontSize(13)
  doc.setTextColor(80, 80, 80)
  doc.text('Laboratory Report', pageW / 2, 26, { align: 'center' })

  doc.setFontSize(10)
  doc.setTextColor(120, 120, 120)
  doc.text(formatDisplayDate(data.date), pageW / 2, 33, { align: 'center' })

  // Separator line
  doc.setDrawColor(200, 200, 200)
  doc.line(14, 37, pageW - 14, 37)

  // ─── Table ─────────────────────────────────────────────────────────────────
  const rows = data.entries.map((e) => [
    e.test?.name ?? '—',
    e.patient?.name ?? 'Walk-in',
    e.result ?? '—',
    `Rs. ${(e.price_paisas / 100).toFixed(2)}`,
    ({ cash: 'Cash', jazzcash: 'JazzCash', easypaisa: 'EasyPaisa', bank_transfer: 'Bank Transfer' } as Record<string, string>)[e.payment_method ?? ''] ?? e.payment_method ?? '—',
  ])

  autoTable(doc, {
    startY: 42,
    head: [['Test Name', 'Patient', 'Result', 'Price', 'Payment Method']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [245, 158, 11], // amber-500
      textColor: [10, 10, 15],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: { fontSize: 8.5, textColor: [40, 40, 40] },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      3: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  })

  // ─── Footer ────────────────────────────────────────────────────────────────
  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } })
    .lastAutoTable.finalY + 8

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

  // Page number
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
  const [date, setDate] = useState(
    initialDate ?? new Date().toISOString().split('T')[0]!
  )
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
    <div className="space-y-6">
      {/* Date picker + generate */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileText className="h-4 w-4 text-primary" />
            Generate Lab Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="report-date" className="text-xs text-muted-foreground">
                Report Date
              </Label>
              <Input
                id="report-date"
                type="date"
                value={date}
                onChange={(e) => {
                  setDate(e.target.value)
                  setReportData(null)
                }}
                className="w-48"
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isFetching || !date}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isFetching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading…
                </>
              ) : (
                <>
                  <TrendingUp className="mr-1.5 h-4 w-4" />
                  Generate
                </>
              )}
            </Button>

            {reportData && reportData.totalTests > 0 && (
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={isDownloading}
                className="border-border hover:bg-muted"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating PDF…
                  </>
                ) : (
                  <>
                    <Download className="mr-1.5 h-4 w-4" />
                    Download PDF
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {reportData && <ReportPreview data={reportData} />}
    </div>
  )
}
