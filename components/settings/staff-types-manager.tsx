'use client'

import React, { useState, useTransition } from 'react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { Plus, X, Save, Loader2 } from 'lucide-react'
import { updateStaffTypes } from '@/app/actions/settings'

// =============================================================================
// Validation
// =============================================================================

const typeNameSchema = z.string().min(1, 'Required').max(100, 'Too long')

// =============================================================================
// Component
// =============================================================================

interface StaffTypesManagerProps {
  initialTypes: string[]
}

export function StaffTypesManager({ initialTypes }: StaffTypesManagerProps) {
  const [types, setTypes] = useState<string[]>(initialTypes)
  const [savedTypes, setSavedTypes] = useState<string[]>(initialTypes)
  const [newType, setNewType] = useState('')
  const [newTypeError, setNewTypeError] = useState('')
  const [isDirty, setIsDirty] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleAddType() {
    const parsed = typeNameSchema.safeParse(newType.trim())
    if (!parsed.success) {
      setNewTypeError(parsed.error.issues[0]?.message ?? 'Invalid')
      return
    }

    const trimmed = parsed.data
    if (types.includes(trimmed)) {
      setNewTypeError('Already exists')
      return
    }

    const next = [...types, trimmed]
    setTypes(next)
    setNewType('')
    setNewTypeError('')
    setIsDirty(JSON.stringify(next) !== JSON.stringify(savedTypes))
  }

  function handleRemoveType(name: string) {
    const next = types.filter((t) => t !== name)
    setTypes(next)
    setIsDirty(JSON.stringify(next) !== JSON.stringify(savedTypes))
  }

  function handleNewTypeKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddType()
    }
  }

  function handleSave() {
    startTransition(async () => {
      const result = await updateStaffTypes({ types })
      if (result.success) {
        setSavedTypes([...types])
        setIsDirty(false)
        toast({ title: 'Staff types saved', description: 'Staff type list updated.' })
      } else {
        toast({
          title: 'Save failed',
          description: result.error ?? 'Unknown error',
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Staff Types</h3>
        <p className="text-xs text-muted-foreground">
          Define staff designation types available across the clinic.
        </p>
      </div>

      {/* Current types as badges */}
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Configured Types ({types.length})
        </p>

        {types.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-4 text-center">
            <p className="text-sm text-muted-foreground">No staff types configured yet.</p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {types.map((type) => (
              <div
                key={type}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-foreground"
              >
                {type}
                <button
                  type="button"
                  onClick={() => handleRemoveType(type)}
                  disabled={isPending}
                  className="ml-0.5 rounded text-muted-foreground/60 transition-colors hover:text-destructive"
                  aria-label={`Remove ${type}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add new type */}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Add New Type
        </p>
        <div className="flex gap-2">
          <Input
            value={newType}
            onChange={(e) => {
              setNewType(e.target.value)
              setNewTypeError('')
            }}
            onKeyDown={handleNewTypeKeyDown}
            placeholder="e.g. Lab Technician"
            disabled={isPending}
            className={cn(
              'max-w-xs',
              newTypeError && 'border-destructive'
            )}
          />
          <Button
            type="button"
            size="sm"
            onClick={handleAddType}
            disabled={isPending || !newType.trim()}
            variant="outline"
            className="border-border"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
        {newTypeError && (
          <p className="text-xs text-destructive">{newTypeError}</p>
        )}
      </div>

      {/* Save button */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          onClick={handleSave}
          disabled={!isDirty || isPending}
          className={cn(
            'bg-primary text-primary-foreground hover:bg-primary/90',
            !isDirty && 'opacity-50'
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Staff Types
            </>
          )}
        </Button>

        {isDirty && (
          <Badge className="bg-primary/15 text-primary text-xs">
            Unsaved changes
          </Badge>
        )}
      </div>
    </div>
  )
}
