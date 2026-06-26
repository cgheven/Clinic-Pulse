'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Loader2, Plus } from 'lucide-react'
import { createPatient } from '@/app/actions/opd'
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

export default function NewPatientPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Form fields
  const [fullName, setFullName] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male')
  const [dob, setDob] = useState('')
  const [ageYears, setAgeYears] = useState('')
  const [bloodGroup, setBloodGroup] = useState('unknown')
  const [cnic, setCnic] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [knownAllergies, setKnownAllergies] = useState('')
  const [chronicConditions, setChronicConditions] = useState('')
  const [notes, setNotes] = useState('')
  const [referredBy, setReferredBy] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!fullName.trim()) {
      setError('Full name is required')
      return
    }

    startTransition(async () => {
      const result = await createPatient({
        full_name: fullName.trim(),
        father_name: fatherName.trim() || null,
        gender,
        date_of_birth: dob || null,
        age_years: ageYears ? parseInt(ageYears) : null,
        blood_group: bloodGroup as 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'unknown',
        cnic: cnic.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        known_allergies: knownAllergies.trim() || null,
        chronic_conditions: chronicConditions.trim() || null,
        notes: notes.trim() || null,
        referred_by: referredBy.trim() || null,
      })

      if (!result.success) {
        setError(result.error)
        return
      }

      router.push(`/opd/patients/${result.data.id}`)
    })
  }

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/opd/patients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Patients
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Register New Patient</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fill in the patient details. Fields marked * are required.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Personal Info */}
        <Section title="Personal Information" icon={<User className="h-4 w-4 text-primary" />}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Muhammad Ahmed"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="father_name">Father / Guardian Name</Label>
              <Input
                id="father_name"
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                placeholder="e.g. Muhammad Ali"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gender">Gender *</Label>
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
              <Label htmlFor="blood_group">Blood Group</Label>
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

            <div className="space-y-1.5">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="age_years">Age (years) — if DOB unknown</Label>
              <Input
                id="age_years"
                type="number"
                min="0"
                max="150"
                value={ageYears}
                onChange={(e) => setAgeYears(e.target.value)}
                placeholder="e.g. 35"
                disabled={!!dob}
              />
            </div>
          </div>
        </Section>

        {/* Contact */}
        <Section title="Contact Information">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03XX-XXXXXXX"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cnic">CNIC</Label>
              <Input
                id="cnic"
                value={cnic}
                onChange={(e) => setCnic(e.target.value)}
                placeholder="XXXXX-XXXXXXX-X"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Karachi"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="referred_by">Referred By</Label>
              <Input
                id="referred_by"
                value={referredBy}
                onChange={(e) => setReferredBy(e.target.value)}
                placeholder="Doctor or clinic name"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full address..."
                rows={2}
              />
            </div>
          </div>
        </Section>

        {/* Medical */}
        <Section title="Medical Information">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="known_allergies">Known Allergies</Label>
              <Textarea
                id="known_allergies"
                value={knownAllergies}
                onChange={(e) => setKnownAllergies(e.target.value)}
                placeholder="List any known drug or food allergies..."
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="chronic_conditions">Chronic Conditions</Label>
              <Textarea
                id="chronic_conditions"
                value={chronicConditions}
                onChange={(e) => setChronicConditions(e.target.value)}
                placeholder="e.g. Diabetes, Hypertension..."
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>
        </Section>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Register Patient
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}
