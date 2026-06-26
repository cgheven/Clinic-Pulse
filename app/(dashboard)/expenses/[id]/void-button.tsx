'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Ban, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { voidExpense } from '@/app/actions/expenses'

interface VoidButtonProps {
  expenseId: string
}

export function VoidButton({ expenseId }: VoidButtonProps) {
  const router = useRouter()
  const [showDialog, setShowDialog] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await voidExpense(expenseId)

      if (result.success) {
        toast({
          title: 'Expense voided',
          description: 'The expense has been voided and excluded from totals.',
        })
        setShowDialog(false)
        router.refresh()
      } else {
        toast({
          title: 'Failed to void expense',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setShowDialog(true)}
        className="border-destructive/30 text-destructive hover:border-destructive hover:bg-destructive/10"
      >
        <Ban className="mr-2 h-4 w-4" />
        Void Expense
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-card sm:max-w-sm">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <DialogTitle className="text-foreground">Void this expense?</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            This will mark the expense as voided. It will be excluded from all
            totals and reports. This action cannot be undone.
          </p>

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isPending}
              className="border-border"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Voiding…
                </>
              ) : (
                <>
                  <Ban className="mr-2 h-4 w-4" />
                  Confirm Void
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
