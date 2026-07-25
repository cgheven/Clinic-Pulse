'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter, CalendarDays, X } from 'lucide-react'
import { DateInput } from '@/components/ui/date-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PatientFiltersProps {
  search: string
  gender: string
  registeredOn: string
}

export function PatientFilters({ search: initSearch, gender: initGender, registeredOn: initDate }: PatientFiltersProps) {
  const router = useRouter()
  const [search, setSearch] = useState(initSearch)
  const [gender, setGender] = useState(initGender || 'all')
  const [date, setDate] = useState(initDate)

  const hasFilters = search || (gender && gender !== 'all') || date

  function navigate({ s = search, g = gender, d = date } = {}) {
    const params = new URLSearchParams()
    if (s.trim()) params.set('search', s.trim())
    if (g && g !== 'all') params.set('gender', g)
    if (d) params.set('date', d)
    router.push(`/opd/patients?${params.toString()}`)
  }

  function handleGenderChange(val: string) {
    setGender(val)
    navigate({ g: val })
  }

  function handleDateChange(val: string) {
    setDate(val)
    navigate({ d: val })
  }

  function clear() {
    setSearch('')
    setGender('all')
    setDate('')
    router.push('/opd/patients')
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search — applies on Enter */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && navigate()}
          placeholder="Search by name, phone, patient ID..."
          className="w-full rounded-lg border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
        />
      </div>

      {/* Gender — applies instantly on selection */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select value={gender} onValueChange={handleGenderChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Genders" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genders</SelectItem>
            <SelectItem value="male">Male</SelectItem>
            <SelectItem value="female">Female</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Date — applies instantly on selection */}
      <div className="flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
        <DateInput
          value={date}
          onChange={(v) => handleDateChange(v)}
          className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors"
        />
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={clear}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          Clear
        </button>
      )}
    </div>
  )
}
