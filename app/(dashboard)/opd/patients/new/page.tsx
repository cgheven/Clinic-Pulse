'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Plus } from 'lucide-react'
import { createPatient } from '@/app/actions/opd'
import { getTodayPKT } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  )
}

export default function NewPatientPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male')
  const [dob, setDob] = useState('')
  const [bloodGroup, setBloodGroup] = useState('unknown')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [history, setHistory] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Full name is required')
      return
    }

    startTransition(async () => {
      const result = await createPatient({
        name: name.trim(),
        gender,
        date_of_birth: dob || null,
        blood_group: bloodGroup as
          | 'A+'
          | 'A-'
          | 'B+'
          | 'B-'
          | 'AB+'
          | 'AB-'
          | 'O+'
          | 'O-'
          | 'unknown',
        phone: phone.trim() || null,
        address: address.trim() || null,
        history: history.trim() || null,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      router.push(`/opd/patients/${result.data.id}`)
    })
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/opd/patients"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-lg font-bold text-foreground sm:text-xl">New Patient</h1>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl">
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Unified card with section dividers */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          {/* Section 1: Basic Information */}
          <div className="px-4 py-3">
            <SectionLabel>Basic Information</SectionLabel>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name" className="text-[12px]">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Muhammad Ahmed"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="gender" className="text-[12px]">
                  Gender <span className="text-destructive">*</span>
                </Label>
                <Select value={gender} onValueChange={(v) => setGender(v as typeof gender)}>
                  <SelectTrigger id="gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="blood_group" className="text-[12px]">
                  Blood Group
                </Label>
                <Select value={bloodGroup} onValueChange={setBloodGroup}>
                  <SelectTrigger id="blood_group">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unknown">Unknown</SelectItem>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="dob" className="text-[12px]">
                  Date of Birth
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  max={getTodayPKT()}
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-b border-border/70" />

          {/* Section 2: Contact */}
          <div className="px-4 py-3">
            <SectionLabel>Contact</SectionLabel>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="phone" className="text-[12px]">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="03XX-XXXXXXX"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address" className="text-[12px]">
                  Address
                </Label>
                <Textarea
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Full address..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-b border-border/70" />

          {/* Section 3: Medical History */}
          <div className="px-4 py-3">
            <SectionLabel>Medical History</SectionLabel>
            <div className="mt-3">
              <div className="space-y-1.5">
                <Label htmlFor="history" className="text-[12px]">
                  Notes / History
                </Label>
                <Textarea
                  id="history"
                  value={history}
                  onChange={(e) => setHistory(e.target.value)}
                  placeholder="Any relevant medical history, allergies, chronic conditions..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Actions row */}
          <div className="flex items-center justify-end gap-2.5 border-t border-border/70 px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Register Patient
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
