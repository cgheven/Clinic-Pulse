'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import type {
  DailyRevenueReport,
  DoctorEarningsReport,
  PartnerPayoutReport,
  ExpenseReport,
  PayrollReport,
  LabDailyReport,
} from '@/app/actions/reports'

// =============================================================================
// Types
// =============================================================================

type ReportData =
  | { type: 'daily'; data: DailyRevenueReport }
  | { type: 'doctors'; data: DoctorEarningsReport }
  | { type: 'partners'; data: PartnerPayoutReport }
  | { type: 'expenses'; data: ExpenseReport }
  | { type: 'payroll'; data: PayrollReport }
  | { type: 'lab'; data: LabDailyReport }

interface PdfGeneratorProps {
  report: ReportData
  fileName?: string
  className?: string
}

// =============================================================================
// Helpers
// =============================================================================

function pks(paisas: number): string {
  return `Rs. ${(paisas / 100).toLocaleString('en-PK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function bps(bp: number): string {
  return `${(bp / 100).toFixed(2)}%`
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-PK', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatMonth(ym: string): string {
  const [y, m] = ym.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return d.toLocaleDateString('en-PK', { year: 'numeric', month: 'long' })
}

// =============================================================================
// PDF builders (one per report type)
// =============================================================================

// Shared header builder
async function buildPdfHeader(
  doc: import('jspdf').jsPDF,
  clinicName: string,
  reportTitle: string,
  subTitle: string
): Promise<number> {
  const pageW = doc.internal.pageSize.getWidth()

  // Amber accent bar
  doc.setFillColor(245, 158, 11)
  doc.rect(0, 0, pageW, 2, 'F')

  // Clinic name
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 40)
  doc.text(clinicName, pageW / 2, 16, { align: 'center' })

  // Report title
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 90)
  doc.text(reportTitle, pageW / 2, 24, { align: 'center' })

  // Subtitle (date/period)
  doc.setFontSize(9)
  doc.setTextColor(130, 130, 145)
  doc.text(subTitle, pageW / 2, 31, { align: 'center' })

  // Separator
  doc.setDrawColor(220, 220, 230)
  doc.line(14, 35, pageW - 14, 35)

  return 40 // return Y position to start content
}

// Page footer builder
async function addFooters(doc: import('jspdf').jsPDF): Promise<void> {
  const pageCount = doc.getNumberOfPages()
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setDrawColor(220, 220, 230)
    doc.line(14, pageH - 14, pageW - 14, pageH - 14)
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 170)
    doc.text(
      `Generated on ${new Date().toLocaleString('en-PK')} — Page ${i} of ${pageCount}`,
      pageW / 2,
      pageH - 8,
      { align: 'center' }
    )
  }
}

// ── Daily Revenue ──────────────────────────────────────────────────────────────

async function generateDailyPdf(data: DailyRevenueReport): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const startY = await buildPdfHeader(
    doc,
    data.clinic_name,
    'Daily Revenue Report',
    formatDisplayDate(data.date)
  )

  // Summary section
  const depts = [
    { label: 'OPD', d: data.opd },
    { label: 'Pharmacy', d: data.pharmacy },
    { label: 'Laboratory', d: data.lab },
    { label: 'X-Ray', d: data.xray },
  ]

  // Summary table
  autoTable(doc, {
    startY,
    head: [['Department', 'Transactions', 'Revenue']],
    body: [
      ...depts.map(({ label, d }) => [label, d.count.toString(), pks(d.total)]),
      ['TOTAL', depts.reduce((s, { d }) => s + d.count, 0).toString(), pks(data.grand_total)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11], textColor: [10, 10, 15], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [40, 40, 50] },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
    margin: { left: 14, right: 14 },
    didParseCell: (hookData) => {
      if (hookData.row.index === depts.length) {
        hookData.cell.styles.fontStyle = 'bold'
        hookData.cell.styles.fillColor = [245, 245, 248]
      }
    },
  })

  const afterSummary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  // Payment breakdown table
  if (data.payment_totals.length > 0) {
    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(80, 80, 90)
    doc.text('Payment Method Breakdown', 14, afterSummary)

    autoTable(doc, {
      startY: afterSummary + 4,
      head: [['Payment Method', 'Transactions', 'Amount']],
      body: data.payment_totals.map((p) => [p.method_name, p.count.toString(), pks(p.amount)]),
      theme: 'striped',
      headStyles: { fillColor: [50, 50, 65], textColor: [240, 240, 245], fontSize: 8.5 },
      bodyStyles: { fontSize: 8.5, textColor: [40, 40, 50] },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })
  }

  await addFooters(doc)
  doc.save(`daily-revenue-${data.date}.pdf`)
}

// ── Doctor Earnings ────────────────────────────────────────────────────────────

async function generateDoctorsPdf(data: DoctorEarningsReport): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const startY = await buildPdfHeader(
    doc,
    data.clinic_name,
    'Doctor Earnings Report',
    formatMonth(data.month)
  )

  autoTable(doc, {
    startY,
    head: [['Doctor', 'Specialty', 'Model', 'Visits', 'Revenue', 'Rate / Base', 'Days', 'Earnings']],
    body: [
      ...data.entries.map((e) => [
        e.doctor_name,
        e.specialty ?? '—',
        e.earning_model === 'salaried' ? 'Salaried' : 'Commission',
        e.total_visits.toString(),
        pks(e.total_revenue),
        e.earning_model === 'commission'
          ? e.commission_pct !== null ? bps(e.commission_pct) : '—'
          : pks(e.monthly_salary ?? 0),
        `${e.days_worked} / ${e.working_days}`,
        pks(e.gross_earnings),
      ]),
      [
        'TOTAL', '', '',
        data.entries.reduce((s, e) => s + e.total_visits, 0).toString(),
        pks(data.entries.reduce((s, e) => s + e.total_revenue, 0)),
        '', '',
        pks(data.total_gross_earnings),
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11], textColor: [10, 10, 15], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [40, 40, 50] },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: {
      3: { halign: 'center' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'center' },
      7: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (hookData) => {
      if (hookData.row.index === data.entries.length) {
        hookData.cell.styles.fontStyle = 'bold'
        hookData.cell.styles.fillColor = [245, 245, 248]
      }
    },
  })

  await addFooters(doc)
  doc.save(`doctor-earnings-${data.month}.pdf`)
}

// ── Partner Payouts ────────────────────────────────────────────────────────────

async function generatePartnersPdf(data: PartnerPayoutReport): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const startY = await buildPdfHeader(
    doc,
    data.clinic_name,
    'X-Ray Partner Payout Report',
    formatMonth(data.month)
  )

  // Summary
  autoTable(doc, {
    startY,
    head: [['Item', 'Amount']],
    body: [
      ['Total X-Ray Revenue', pks(data.total_xray_revenue)],
      ['Total Partner Payouts', pks(data.total_payout)],
      ['Clinic Share (Retained)', pks(data.clinic_share)],
    ],
    theme: 'plain',
    headStyles: { fillColor: [245, 158, 11], textColor: [10, 10, 15], fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [40, 40, 50] },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  })

  const afterSummary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  autoTable(doc, {
    startY: afterSummary,
    head: [['Partner', 'Type', 'Entries', 'Split %', 'Payout Amount']],
    body: [
      ...data.entries.map((e) => [
        e.partner_name,
        e.partner_type || 'Partner',
        e.revenue_entries.toString(),
        bps(e.split_pct_display),
        pks(e.payout_amount),
      ]),
      ['Clinic Share', 'Retained', '—',
        data.total_xray_revenue > 0
          ? `${((data.clinic_share / data.total_xray_revenue) * 100).toFixed(1)}%`
          : '—',
        pks(data.clinic_share),
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11], textColor: [10, 10, 15], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [40, 40, 50] },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: {
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  })

  await addFooters(doc)
  doc.save(`partner-payouts-${data.month}.pdf`)
}

// ── Expenses ───────────────────────────────────────────────────────────────────

async function generateExpensesPdf(data: ExpenseReport): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const startY = await buildPdfHeader(
    doc,
    data.clinic_name,
    'Expense Report',
    formatMonth(data.month)
  )

  // Overview table
  autoTable(doc, {
    startY,
    head: [['Department', 'Amount']],
    body: [
      ...data.by_department.map((d) => [d.dept_name, pks(d.total_amount)]),
      ['GRAND TOTAL', pks(data.grand_total)],
    ],
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11], textColor: [10, 10, 15], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [40, 40, 50] },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
    didParseCell: (hookData) => {
      if (hookData.row.index === data.by_department.length) {
        hookData.cell.styles.fontStyle = 'bold'
        hookData.cell.styles.fillColor = [245, 245, 248]
      }
    },
  })

  let currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8

  // Per-dept detail
  for (const dept of data.by_department) {
    if (dept.by_head.length === 0) continue

    if (currentY > 240) {
      doc.addPage()
      currentY = 20
    }

    doc.setFontSize(9)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(60, 60, 75)
    doc.text(dept.dept_name, 14, currentY)

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Expense Head', 'Items', 'Amount']],
      body: dept.by_head.map((h) => [h.head_name, h.item_count.toString(), pks(h.total_amount)]),
      theme: 'striped',
      headStyles: { fillColor: [50, 50, 65], textColor: [240, 240, 245], fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [40, 40, 50] },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' } },
      margin: { left: 14, right: 14 },
    })

    currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  }

  await addFooters(doc)
  doc.save(`expenses-${data.month}.pdf`)
}

// ── Payroll ────────────────────────────────────────────────────────────────────

async function generatePayrollPdf(data: PayrollReport): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const startY = await buildPdfHeader(
    doc,
    data.clinic_name,
    'Staff Payroll Report',
    formatMonth(data.month)
  )

  autoTable(doc, {
    startY,
    head: [['Employee', 'Designation', 'Department', 'Base Salary', 'Present/WD', 'Earned', 'Deductions', 'Net Pay']],
    body: [
      ...data.entries.map((e) => [
        e.full_name,
        e.designation,
        e.department ?? '—',
        pks(e.monthly_salary),
        `${e.present_days} / ${e.working_days}`,
        pks(e.earned_salary),
        e.deductions > 0 ? pks(e.deductions) : '—',
        pks(e.net_salary),
      ]),
      [
        'TOTAL', '', '',
        pks(data.total_base),
        '',
        pks(data.total_earned),
        data.total_deductions > 0 ? pks(data.total_deductions) : '—',
        pks(data.total_net),
      ],
    ],
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11], textColor: [10, 10, 15], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [40, 40, 50] },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'center' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (hookData) => {
      if (hookData.row.index === data.entries.length) {
        hookData.cell.styles.fontStyle = 'bold'
        hookData.cell.styles.fillColor = [245, 245, 248]
      }
    },
  })

  await addFooters(doc)
  doc.save(`payroll-${data.month}.pdf`)
}

// ── Lab Daily ──────────────────────────────────────────────────────────────────

async function generateLabPdf(data: LabDailyReport): Promise<void> {
  const { jsPDF } = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const startY = await buildPdfHeader(
    doc,
    data.clinic_name,
    'Laboratory Daily Report',
    formatDisplayDate(data.date)
  )

  // Summary row
  autoTable(doc, {
    startY,
    head: [['Total Tests', 'Total Revenue', 'Total Discount', 'Net Revenue']],
    body: [[
      data.total_tests.toString(),
      pks(data.total_revenue),
      pks(data.total_discount),
      pks(data.net_revenue),
    ]],
    theme: 'plain',
    headStyles: { fillColor: [245, 158, 11], textColor: [10, 10, 15], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9.5, textColor: [40, 40, 50], fontStyle: 'bold' },
    columnStyles: { 0: { halign: 'center' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  })

  const afterSummary = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  // Test log table
  autoTable(doc, {
    startY: afterSummary,
    head: [['Test', 'Patient', 'Result', 'Price', 'Payment', 'Status']],
    body: data.entries.map((e) => [
      e.test?.test_name ?? '—',
      e.patient?.full_name ?? 'Walk-in',
      e.result_value
        ? `${e.result_value}${e.result_unit ? ' ' + e.result_unit : ''}`
        : '—',
      pks(e.total_amount),
      e.payment_method?.name ?? '—',
      e.payment_status,
    ]),
    theme: 'grid',
    headStyles: { fillColor: [245, 158, 11], textColor: [10, 10, 15], fontStyle: 'bold', fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [40, 40, 50] },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: { 3: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  })

  await addFooters(doc)
  doc.save(`lab-report-${data.date}.pdf`)
}

// =============================================================================
// Main dispatcher
// =============================================================================

async function generatePdf(report: ReportData): Promise<void> {
  switch (report.type) {
    case 'daily':
      return generateDailyPdf(report.data)
    case 'doctors':
      return generateDoctorsPdf(report.data)
    case 'partners':
      return generatePartnersPdf(report.data)
    case 'expenses':
      return generateExpensesPdf(report.data)
    case 'payroll':
      return generatePayrollPdf(report.data)
    case 'lab':
      return generateLabPdf(report.data)
  }
}

// =============================================================================
// PdfGenerator component
// =============================================================================

export function PdfGenerator({ report, fileName: _fileName, className }: PdfGeneratorProps) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      await generatePdf(report)
      toast({ title: 'PDF downloaded successfully' })
    } catch (err) {
      toast({
        title: 'PDF generation failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleDownload}
      disabled={loading}
      className={`border-border hover:bg-muted gap-2 ${className ?? ''}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      {loading ? 'Generating…' : 'Download PDF'}
    </Button>
  )
}
