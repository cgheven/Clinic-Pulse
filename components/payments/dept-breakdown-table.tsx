import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  date: string  // YYYY-MM-DD — shown as a subtitle
}

// =============================================================================
// Component
// =============================================================================

export function DeptBreakdownTable({ rows, date }: DeptBreakdownTableProps) {
  // Column-level totals (sum across all departments)
  const columnTotals: Record<ColumnKey, number> = {
    cash:          rows.reduce((s, r) => s + r.cash, 0),
    jazzcash:      rows.reduce((s, r) => s + r.jazzcash, 0),
    easypaisa:     rows.reduce((s, r) => s + r.easypaisa, 0),
    bank_transfer: rows.reduce((s, r) => s + r.bank_transfer, 0),
    total:         rows.reduce((s, r) => s + r.total, 0),
  }

  return (
    <Card className="overflow-hidden border-border bg-card">
      <CardHeader className="border-b border-border pb-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-sm font-semibold text-foreground">
            Department Breakdown
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {formatDate(date)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            {/* ── Table head ──────────────────────────────────────────────── */}
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="py-2.5 pl-4 pr-3 text-left text-xs font-semibold text-muted-foreground">
                  Department
                </th>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className={`py-2.5 px-3 text-right text-xs font-semibold ${
                      col.isTotal ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* ── Table body ──────────────────────────────────────────────── */}
            <tbody className="divide-y divide-border">
              {rows.map((row) => (
                <tr
                  key={row.department}
                  className="transition-colors hover:bg-muted/10"
                >
                  <td className="py-3 pl-4 pr-3 font-medium text-foreground">
                    {row.label}
                  </td>
                  {COLUMNS.map((col) => {
                    const value = row[col.key]
                    const isEmpty = value === 0 && !col.isTotal
                    return (
                      <td
                        key={col.key}
                        className={`py-3 px-3 text-right tabular-nums ${
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

            {/* ── Totals footer ───────────────────────────────────────────── */}
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/20">
                <td className="py-3 pl-4 pr-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Total
                </td>
                {COLUMNS.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3 px-3 text-right tabular-nums font-bold ${
                      col.isTotal ? 'text-primary text-base' : 'text-foreground text-sm'
                    }`}
                  >
                    {formatCurrencyPaisas(columnTotals[col.key])}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
