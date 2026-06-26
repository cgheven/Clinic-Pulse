'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, TrendingUp, TrendingDown, ArrowDownUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { adjustStock } from '@/app/actions/pharmacy'

interface StockAdjustFormProps {
  medicineId: string
  medicineName: string
}

export function StockAdjustForm({ medicineId, medicineName }: StockAdjustFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [type, setType] = useState<'in' | 'out'>('in')
  const [qty, setQty] = useState('1')
  const [notes, setNotes] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const quantity = parseInt(qty)
    if (!quantity || quantity <= 0) {
      toast({ title: 'Quantity must be a positive integer', variant: 'destructive' })
      return
    }

    startTransition(async () => {
      const result = await adjustStock(medicineId, quantity, type, notes.trim() || undefined)

      if (result.success) {
        toast({
          title: `Stock ${type === 'in' ? 'added' : 'removed'}`,
          description: `${medicineName}: New quantity is ${result.data.new_qty}.`,
        })
        setQty('1')
        setNotes('')
        setIsOpen(false)
        router.refresh()
      } else {
        toast({
          title: 'Adjustment failed',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
              <ArrowDownUp className="h-3.5 w-3.5 text-primary" />
            </div>
            <CardTitle className="text-base">Stock Adjustment</CardTitle>
          </div>
          <button
            onClick={() => setIsOpen((v) => !v)}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-50"
          >
            {isOpen ? 'Cancel' : 'Adjust Stock'}
          </button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type selector */}
            <div className="space-y-1.5">
              <Label className="text-sm">Adjustment Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('in')}
                  disabled={isPending}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
                    type === 'in'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                      : 'border-border text-muted-foreground hover:border-border hover:text-foreground'
                  )}
                >
                  <TrendingUp className="h-4 w-4" />
                  Stock In
                </button>

                <button
                  type="button"
                  onClick={() => setType('out')}
                  disabled={isPending}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
                    type === 'out'
                      ? 'border-red-500/40 bg-red-500/10 text-red-400'
                      : 'border-border text-muted-foreground hover:border-border hover:text-foreground'
                  )}
                >
                  <TrendingDown className="h-4 w-4" />
                  Stock Out
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {type === 'in'
                  ? 'Add stock (receiving shipment, returns, etc.)'
                  : 'Remove stock (expired, damaged, write-off, etc.)'}
              </p>
            </div>

            {/* Quantity */}
            <div className="space-y-1.5">
              <Label htmlFor="adj_qty" className="text-sm">
                Quantity <span className="text-destructive">*</span>
              </Label>
              <Input
                id="adj_qty"
                type="number"
                min="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                disabled={isPending}
                className="text-center text-lg font-semibold"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label htmlFor="adj_notes" className="text-sm">
                Reason / Notes
              </Label>
              <Textarea
                id="adj_notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={
                  type === 'in'
                    ? 'e.g. New batch received from supplier'
                    : 'e.g. Expired, damaged, or write-off'
                }
                rows={2}
                disabled={isPending}
              />
            </div>

            <Button
              type="submit"
              disabled={isPending || !qty || parseInt(qty) <= 0}
              className={cn(
                'w-full gap-2',
                type === 'out' && 'bg-red-500 text-white hover:bg-red-600'
              )}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Adjusting…
                </>
              ) : (
                <>
                  {type === 'in' ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {type === 'in' ? 'Add' : 'Remove'} {qty || '0'} Units
                </>
              )}
            </Button>
          </form>
        </CardContent>
      )}
    </Card>
  )
}
