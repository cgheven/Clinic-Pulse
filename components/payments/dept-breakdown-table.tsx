import { formatCurrencyPaisas, formatDate } from '@/lib/utils'
import type { DeptPaymentRow } from '@/app/actions/payments'

// =============================================================================
// Column definitions
// =============================================================================

type ColumnKey = 'cash' | 'jazzcash' | 'easypaisa' | 'bank_transfer' | 'total'

interface Column {
  key: ColumnKey
  label: string
  isTotal?: boolean
}

const COLUMNS: Column[] = [
  { key: 'cash',          label: 'Cash'     },
  { key: 'jazzcash',      label: 'JazzCash' },
  { key: 'easypaisa',     label: 'Easypaisa'},
  { key: 'bank_transfer', label: 'Bank'     },
  { key: 'total',         label: 'Total', isTotal: true },
]

// =============================================================================
// Props
// =============================================================================

interface DeptBreakdownTableProps {
  rows: DeptPaymentRow[]
  date: string
}

// =============================================================================
// Component
// =============================================================================

export function DeptBreakdownTable({ rows, date }: DeptBreakdownTableProps) {
  const columnTotals: Record<ColumnKey, number> = {
    cash:          rows.reduce((s, r) => s + r.cash, 0),
    jazzcash:      rows.reduce((s, r) => s + r.jazzcash, 0),
    easypaisa:     rows.reduce((s, r) => s + r.easypaisa, 0),
    bank_transfer: rows.reduce((s, r) => s + r.bank_transfer, 0),
    total:         rows.reduce((s, r) => s + r.total, 0),
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      {/* Section header */}
      <div className="flex items-center justify-between border-b border-border bg-muted/20 px-4 py-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Department Breakdown
        </span>
        <span className="text-[12px] text-muted-foreground">
          {formatDate(date)}
        </span>
      </div>

      {/* Scrollable table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          {/* Column headers */}
          <thead>
            <tr className="border-b border-border/50">
              <th className="py-1.5 pl-4 pr-3 text-left text-[10px] uppercase tracking-wide text-muted-foreground/60">
                Department
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`px-3 py-1.5 text-right text-[10px] uppercase tracking-wide ${
                    col.isTotal ? 'text-primary/70' : 'text-muted-foreground/60'
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body rows */}
          <tbody className="divide-y divide-border/50">
            {rows.map((row) => (
              <tr
                key={row.department}
                className="transition-colors hover:bg-muted/20"
              >
                <td className="py-2.5 pl-4 pr-3 font-medium text-foreground">
                  {row.label}
                </td>
                {COLUMNS.map((col) => {
                  const value = row[col.key]
                  const isEmpty = value === 0 && !col.isTotal
                  return (
                    <td
                      key={col.key}
                      className={`px-3 py-2.5 text-right tabular-nums ${
                        col.isTotal
                          ? 'font-bold text-primary'
                          : isEmpty
                          ? 'text-muted-foreground/30'
                          : 'text-foreground'
                      }`}
                    >
                      {isEmpty ? '—' : formatCurrencyPaisas(value)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>

          {/* Totals footer */}
          <tfoot>
            <tr className="border-t-2 border-primary/20 bg-muted/10">
              <td className="py-2.5 pl-4 pr-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Total
              </td>
              {COLUMNS.map((col) => (
                <td
                  key={col.key}
                  className={`px-3 py-2.5 text-right tabular-nums font-bold ${
                    col.isTotal ? 'text-primary' : 'text-foreground'
                  }`}
                >
                  {formatCurrencyPaisas(columnTotals[col.key])}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
