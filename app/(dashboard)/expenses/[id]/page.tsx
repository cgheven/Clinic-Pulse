import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ChevronLeft,
  Receipt,
  CalendarDays,
  Building2,
  Tag,
  CreditCard,
  FileText,
  User2,
  Ban,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { requireAuth } from '@/lib/auth'
import { getExpenseById, voidExpense } from '@/app/actions/expenses'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrencyPaisas, formatDateTime, formatDate } from '@/lib/utils'
import { VoidButton } from './void-button'

export const metadata: Metadata = {
  title: 'Expense Detail — ClinicPulse',
}

// =============================================================================
// Page
// =============================================================================

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ExpenseDetailPage({ params }: PageProps) {
  const authUser = await requireAuth()
  const { id } = await params

  const result = await getExpenseById(id)

  if (!result.success) {
    notFound()
  }

  const expense = result.data
  const canVoid =
    !expense.is_voided &&
    (authUser.profile.role === 'admin' || authUser.profile.role === 'accountant')

  const categoryLabel =
    expense.expense_head_name ?? expense.custom_head ?? 'Uncategorised'

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* ── Back nav ─────────────────────────────────────────────────────────── */}
      <Link
        href="/expenses"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Expenses
      </Link>

      {/* ── Page header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={
              expense.is_voided
                ? 'flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10'
                : 'flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10'
            }
          >
            {expense.is_voided ? (
              <Ban className="h-5 w-5 text-destructive" />
            ) : (
              <Receipt className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">
                Expense Detail
              </h1>
              {expense.is_voided && (
                <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                  Voided
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(expense.expense_date, 'dd MMMM yyyy')}
            </p>
          </div>
        </div>

        {/* Void action */}
        {canVoid && <VoidButton expenseId={expense.id} />}
      </div>

      {/* ── Amount hero ──────────────────────────────────────────────────────── */}
      <div
        className={
          expense.is_voided
            ? 'rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-5'
            : 'rounded-xl border border-primary/20 bg-primary/5 px-6 py-5'
        }
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">
          Amount
        </p>
        <p
          className={
            expense.is_voided
              ? 'mt-1 text-4xl font-bold text-destructive/60 line-through'
              : 'mt-1 text-4xl font-bold text-primary'
          }
        >
          {formatCurrencyPaisas(expense.amount)}
        </p>
        {expense.is_voided && (
          <p className="mt-1 text-xs text-destructive/70">
            This expense has been voided and excluded from totals.
          </p>
        )}
      </div>

      {/* ── Detail fields ─────────────────────────────────────────────────────── */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Expense Information
          </CardTitle>
        </CardHeader>

        <CardContent className="divide-y divide-border pt-0">
          {/* Description */}
          <DetailRow
            icon={<FileText className="h-4 w-4 text-muted-foreground/60" />}
            label="Description"
            value={expense.description}
          />

          {/* Date */}
          <DetailRow
            icon={<CalendarDays className="h-4 w-4 text-muted-foreground/60" />}
            label="Date"
            value={formatDate(expense.expense_date, 'dd MMMM yyyy')}
          />

          {/* Category */}
          <DetailRow
            icon={<Tag className="h-4 w-4 text-muted-foreground/60" />}
            label="Category"
            value={
              <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {categoryLabel}
              </span>
            }
          />

          {/* Department */}
          <DetailRow
            icon={<Building2 className="h-4 w-4 text-muted-foreground/60" />}
            label="Department"
            value={
              expense.department_name ? (
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  {expense.department_name}
                </span>
              ) : (
                <span className="text-muted-foreground/60">General / Admin</span>
              )
            }
          />

          {/* Payment Method */}
          <DetailRow
            icon={<CreditCard className="h-4 w-4 text-muted-foreground/60" />}
            label="Payment Method"
            value={
              expense.payment_method_name ? (
                expense.payment_method_name
              ) : (
                <span className="text-muted-foreground/50">Not specified</span>
              )
            }
          />
        </CardContent>
      </Card>

      {/* ── Metadata card ────────────────────────────────────────────────────── */}
      <Card className="border-border bg-card">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-sm font-semibold text-muted-foreground">
            Record Metadata
          </CardTitle>
        </CardHeader>

        <CardContent className="divide-y divide-border pt-0">
          {/* Status */}
          <DetailRow
            icon={
              expense.is_voided ? (
                <Ban className="h-4 w-4 text-destructive/70" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-success/70" />
              )
            }
            label="Status"
            value={
              expense.is_voided ? (
                <span className="rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs font-semibold text-destructive">
                  Voided
                </span>
              ) : (
                <span className="rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
                  Active
                </span>
              )
            }
          />

          {/* Record ID */}
          <DetailRow
            icon={<FileText className="h-4 w-4 text-muted-foreground/60" />}
            label="Record ID"
            value={
              <code className="rounded bg-muted/30 px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                {expense.id}
              </code>
            }
          />

          {/* Created at */}
          <DetailRow
            icon={<Clock className="h-4 w-4 text-muted-foreground/60" />}
            label="Created At"
            value={formatDateTime(expense.created_at)}
          />

          {/* Voided at */}
          {expense.is_voided && expense.deleted_at && (
            <DetailRow
              icon={<Ban className="h-4 w-4 text-destructive/60" />}
              label="Voided At"
              value={
                <span className="text-destructive/80">
                  {formatDateTime(expense.deleted_at)}
                </span>
              }
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// =============================================================================
// DetailRow helper
// =============================================================================

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 py-3.5 px-0">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-[120px] shrink-0">
        <p className="text-xs font-medium text-muted-foreground/70">{label}</p>
      </div>
      <div className="flex-1 text-sm text-foreground">{value}</div>
    </div>
  )
}
