'use client'

import { useState, useEffect, useMemo } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePlanningWeeks } from '@/hooks/use-demand'
import { cn } from '@/lib/utils'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns'

interface WeekSelectorProps {
  value: string | undefined
  onValueChange: (value: string) => void
}

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function WeekSelector({ value, onValueChange }: WeekSelectorProps) {
  const { data, isLoading } = usePlanningWeeks()
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  useEffect(() => {
    setMounted(true)
  }, [])

  const planningCycle = data?.meta?.planningCycle || 'WEEKLY'
  const isMonthly = planningCycle === 'MONTHLY'
  const periodLabel = isMonthly ? 'month' : 'week'

  // Get all week start dates from existing planning weeks
  const existingWeekStartDates = useMemo(() => {
    if (!data?.data) return new Set<string>()
    return new Set(data.data.map(week => {
      const date = new Date(week.weekStart)
      return format(date, 'yyyy-MM-dd')
    }))
  }, [data])

  // Check if a date is a week start day (Sunday = 0)
  const isWeekStartDay = (date: Date) => {
    return date.getDay() === 0
  }

  // Get selected week info
  const selectedWeek = useMemo(() => {
    if (!value || !data?.data) return null
    return data.data.find(week => week.id === value)
  }, [value, data])

  // Get selected date (either from selectedWeek or from value if it's a date string)
  const selectedDate = useMemo(() => {
    if (selectedWeek) {
      return new Date(selectedWeek.weekStart)
    } else if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // value is a date string in ISO format
      return new Date(value)
    }
    return null
  }, [selectedWeek, value])

  // Calculate week number and display for dates without planning week records
  const calculatedWeekInfo = useMemo(() => {
    if (!selectedDate || selectedWeek) return null

    // Calculate week number (ISO week number)
    const startOfYear = new Date(selectedDate.getFullYear(), 0, 1)
    const daysSinceStartOfYear = Math.floor((selectedDate.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000))
    const weekNumber = Math.ceil((daysSinceStartOfYear + startOfYear.getDay() + 1) / 7)

    // Calculate week end date (Saturday)
    const weekEnd = new Date(selectedDate)
    weekEnd.setDate(weekEnd.getDate() + 6)

    // Format display
    const display = `${format(selectedDate, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`

    return { weekNumber, display }
  }, [selectedDate, selectedWeek])

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentMonth)
    const end = endOfMonth(currentMonth)
    const days = eachDayOfInterval({ start, end })

    // Add padding days for start of month
    const startDay = start.getDay()
    const paddingStart = Array(startDay).fill(null)

    // Add padding days for end of month
    const endDay = end.getDay()
    const paddingEnd = Array(6 - endDay).fill(null)

    return [...paddingStart, ...days, ...paddingEnd]
  }, [currentMonth])

  // Find week ID for a given date
  const getWeekIdForDate = (date: Date) => {
    if (!data?.data) return null
    const dateStr = format(date, 'yyyy-MM-dd')
    const week = data.data.find(week => {
      const weekStartDate = format(new Date(week.weekStart), 'yyyy-MM-dd')
      return weekStartDate === dateStr
    })
    return week?.id
  }

  const handleDateClick = (date: Date) => {
    const weekId = getWeekIdForDate(date)
    if (weekId) {
      // Existing planning week found, use its ID
      onValueChange(weekId)
    } else {
      // No planning week exists, pass the date in ISO format
      // Parent component will handle creating the planning week
      onValueChange(format(date, 'yyyy-MM-dd'))
    }
    setOpen(false)
  }

  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1))
  }

  // Get current week index and navigation handlers
  const currentWeekIndex = useMemo(() => {
    if (!value || !data?.data) return -1
    return data.data.findIndex(week => week.id === value)
  }, [value, data])

  const handlePreviousWeek = () => {
    if (!selectedDate) return

    // If there's a previous week in the data, use it
    if (data?.data && currentWeekIndex > 0) {
      const previousWeek = data.data[currentWeekIndex - 1]
      onValueChange(previousWeek.id)
      return
    }

    // Otherwise, calculate previous week (7 days back) and let parent handle it
    const previousWeekStart = new Date(selectedDate)
    previousWeekStart.setDate(previousWeekStart.getDate() - 7)

    // Check if this week exists in data
    const weekId = getWeekIdForDate(previousWeekStart)
    if (weekId) {
      onValueChange(weekId)
    } else {
      // Pass date string for parent to handle
      onValueChange(format(previousWeekStart, 'yyyy-MM-dd'))
    }
  }

  const handleNextWeek = () => {
    if (!selectedDate) return

    // If there's a next week in the data, use it
    if (data?.data && currentWeekIndex >= 0 && currentWeekIndex < data.data.length - 1) {
      const nextWeek = data.data[currentWeekIndex + 1]
      onValueChange(nextWeek.id)
      return
    }

    // Otherwise, calculate next week (7 days forward) and let parent handle it
    const nextWeekStart = new Date(selectedDate)
    nextWeekStart.setDate(nextWeekStart.getDate() + 7)

    // Check if this week exists in data
    const weekId = getWeekIdForDate(nextWeekStart)
    if (weekId) {
      onValueChange(weekId)
    } else {
      // Pass date string for parent to handle
      onValueChange(format(nextWeekStart, 'yyyy-MM-dd'))
    }
  }

  if (!mounted) {
    return (
      <div className="w-[280px] h-10 rounded-md border border-input bg-background flex items-center px-3 text-sm text-muted-foreground">
        <CalendarDays className="mr-2 h-4 w-4" />
        Loading...
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {/* Previous Week Button */}
      <Button
        variant="outline"
        size="icon"
        onClick={handlePreviousWeek}
        disabled={!value || !selectedDate}
        className="h-10 w-10"
        title="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Week Selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[280px] justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            {selectedWeek
              ? isMonthly
                ? selectedWeek.display
                : `Week ${selectedWeek.weekNumber} - ${selectedWeek.display}`
              : calculatedWeekInfo
              ? `Week ${calculatedWeekInfo.weekNumber} - ${calculatedWeekInfo.display}`
              : `Select planning ${periodLabel}`
            }
          </Button>
        </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          {/* Month/Year Navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={handlePreviousMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex gap-2">
              <Select
                value={format(currentMonth, 'M')}
                onValueChange={(month) => {
                  setCurrentMonth(new Date(currentMonth.getFullYear(), parseInt(month) - 1, 1))
                }}
              >
                <SelectTrigger className="w-[110px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>
                      {format(new Date(2000, i, 1), 'MMMM')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={currentMonth.getFullYear().toString()}
                onValueChange={(year) => {
                  setCurrentMonth(new Date(parseInt(year), currentMonth.getMonth(), 1))
                }}
              >
                <SelectTrigger className="w-[90px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i
                    return (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Weekday headers */}
            {WEEKDAYS.map((day, index) => (
              <div
                key={index}
                className="h-9 w-9 flex items-center justify-center text-sm font-medium text-muted-foreground"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="h-9 w-9" />
              }

              const dateStr = format(day, 'yyyy-MM-dd')
              const isWeekStart = isWeekStartDay(day)
              const hasExistingWeek = existingWeekStartDates.has(dateStr)
              const isSelected = selectedDate && isSameDay(day, selectedDate)

              return (
                <button
                  key={dateStr}
                  onClick={() => isWeekStart && handleDateClick(day)}
                  disabled={!isWeekStart}
                  className={cn(
                    "h-9 w-9 flex items-center justify-center text-sm transition-colors relative",
                    !isWeekStart && "text-muted-foreground cursor-default"
                  )}
                >
                  <span className={cn(
                    "flex items-center justify-center h-8 w-8 rounded-full font-medium transition-colors",
                    isWeekStart && !isSelected && hasExistingWeek && "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20",
                    isWeekStart && !isSelected && !hasExistingWeek && "bg-primary/5 text-primary cursor-pointer hover:bg-primary/15 border border-primary/20",
                    isSelected && "bg-primary text-primary-foreground",
                    !isWeekStart && "bg-transparent"
                  )}>
                    {format(day, 'd')}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>

    {/* Next Week Button */}
    <Button
      variant="outline"
      size="icon"
      onClick={handleNextWeek}
      disabled={!value || !selectedDate}
      className="h-10 w-10"
      title="Next week"
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
  )
}
