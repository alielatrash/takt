'use client'

import { useState, useEffect } from 'react'
import { CalendarDays } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePlanningWeeks } from '@/hooks/use-demand'

interface WeekSelectorProps {
  value: string | undefined
  onValueChange: (value: string) => void
}

export function WeekSelector({ value, onValueChange }: WeekSelectorProps) {
  const { data, isLoading } = usePlanningWeeks()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const planningCycle = data?.meta?.planningCycle || 'WEEKLY'
  const isMonthly = planningCycle === 'MONTHLY'
  const periodLabel = isMonthly ? 'month' : 'week'
  const periodLabelCapitalized = isMonthly ? 'Month' : 'Week'

  if (!mounted) {
    return (
      <div className="w-[280px] h-10 rounded-md border border-input bg-background flex items-center px-3 text-sm text-muted-foreground">
        <CalendarDays className="mr-2 h-4 w-4" />
        Loading...
      </div>
    )
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={isLoading}>
      <SelectTrigger className="w-[280px]">
        <CalendarDays className="mr-2 h-4 w-4" />
        <SelectValue placeholder={isLoading ? 'Loading...' : `Select planning ${periodLabel}`} />
      </SelectTrigger>
      <SelectContent>
        {data?.data?.map((week) => (
          <SelectItem key={week.id} value={week.id}>
            {isMonthly ? week.display : `${periodLabelCapitalized} ${week.weekNumber} - ${week.display}`}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
