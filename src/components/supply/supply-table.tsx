'use client'

import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2, Check, X, Send } from 'lucide-react'
import { toast } from 'sonner'
import { format, addWeeks } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useUpdateSupplyCommitment, useDeleteSupplyCommitment } from '@/hooks/use-supply'
import { usePlanningWeeks } from '@/hooks/use-demand'
import { WEEK_DAYS } from '@/types'
import { formatCitym } from '@/lib/citym'
import { cn } from '@/lib/utils'

const MONTH_WEEKS = [
  { key: 'week1', label: 'Week 1' },
  { key: 'week2', label: 'Week 2' },
  { key: 'week3', label: 'Week 3' },
  { key: 'week4', label: 'Week 4' },
]

interface SupplyTarget {
  routeKey: string
  forecastCount: number
  target: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; week1: number; week2: number; week3: number; week4: number; total: number }
  committed: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; week1: number; week2: number; week3: number; week4: number; total: number }
  gap: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; week1: number; week2: number; week3: number; week4: number; total: number }
  gapPercent: number
  truckTypes?: Array<{ id: string; name: string }>
  clients: Array<{
    client: { id: string; name: string; code: string | null }
    day1: number
    day2: number
    day3: number
    day4: number
    day5: number
    day6: number
    day7: number
    total: number
  }>
  commitments: Array<{
    id: string
    party: { id: string; name: string; code: string | null }
    day1Committed: number
    day2Committed: number
    day3Committed: number
    day4Committed: number
    day5Committed: number
    day6Committed: number
    day7Committed: number
    totalCommitted: number
  }>
}

interface SupplyTableProps {
  data: SupplyTarget[] | undefined
  isLoading: boolean
  onAddCommitment: (routeKey: string) => void
  planningWeekId?: string
  weekStart?: Date | string
}

export function SupplyTable({ data, isLoading, onAddCommitment, planningWeekId, weekStart }: SupplyTableProps) {
  const { data: planningWeeksData } = usePlanningWeeks()
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [editingCell, setEditingCell] = useState<{ id: string; day: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')
  const updateMutation = useUpdateSupplyCommitment()
  const deleteMutation = useDeleteSupplyCommitment()

  const planningCycle = planningWeeksData?.meta?.planningCycle || 'WEEKLY'
  const isMonthlyPlanning = planningCycle === 'MONTHLY'

  // Calculate week date ranges for monthly planning
  const weekDateRanges = useMemo(() => {
    if (!isMonthlyPlanning || !planningWeeksData?.data || !planningWeekId) return []

    const selectedWeek = planningWeeksData.data.find(w => w.id === planningWeekId)
    if (!selectedWeek) return []

    const monthStart = new Date(selectedWeek.weekStart)

    return MONTH_WEEKS.map((_, index) => {
      const weekStartDate = addWeeks(monthStart, index)
      const weekEndDate = addWeeks(weekStartDate, 1)
      weekEndDate.setDate(weekEndDate.getDate() - 1)

      return {
        start: format(weekStartDate, 'd'),
        end: format(weekEndDate, 'd')
      }
    })
  }, [isMonthlyPlanning, planningWeeksData, planningWeekId])

  // Calculate dates for each day of the week
  const dayDates = useMemo(() => {
    if (!weekStart) return []

    const startDate = new Date(weekStart)
    return WEEK_DAYS.map((_, index) => {
      const date = new Date(startDate)
      date.setDate(date.getDate() + index)
      return format(date, 'dd-MMM')
    })
  }, [weekStart])

  const toggleRow = (routeKey: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(routeKey)) {
      newExpanded.delete(routeKey)
    } else {
      newExpanded.add(routeKey)
    }
    setExpandedRows(newExpanded)
  }

  const handleCellClick = (id: string, day: string, currentValue: number) => {
    setEditingCell({ id, day })
    setEditValue(currentValue.toString())
  }

  const handleSaveEdit = async (id: string, day: string) => {
    const newValue = parseInt(editValue) || 0
    setEditingCell(null)

    try {
      await updateMutation.mutateAsync({
        id,
        [day]: newValue,
      })
      toast.success('Commitment updated')
    } catch (error) {
      toast.error('Failed to update commitment')
    }
  }

  const handleCancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string, day: string) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveEdit(id, day)
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const handleDeleteCommitment = async (id: string, supplierName: string) => {
    if (!confirm(`Are you sure you want to delete the commitment from ${supplierName}?`)) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Commitment deleted successfully')
    } catch (error) {
      toast.error('Failed to delete commitment')
    }
  }

  const handleSendToSupplier = (supplierName: string) => {
    toast.warning('🚀 Pro Feature', {
      description: `Send supply plans directly to suppliers with Pro Plan!`,
      duration: 4000,
      action: {
        label: 'Upgrade Now',
        onClick: () => {
          // TODO: Open contact sales modal or redirect to pricing page
          console.log('Upgrade clicked')
        },
      },
    })
  }

  const getGapBadgeVariant = (gap: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (gap > 0) return 'destructive' // Undersupply
    if (gap < 0) return 'secondary' // Oversupply
    return 'outline' // Balanced
  }

  if (isLoading) {
    const columnCount = isMonthlyPlanning ? 4 : 7
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead className="w-56 font-semibold">Route</TableHead>
              <TableHead className="w-32 font-semibold">Truck Type</TableHead>
              <TableHead className="w-24 font-semibold">Plan</TableHead>
              {isMonthlyPlanning ? (
                MONTH_WEEKS.map((week) => (
                  <TableHead key={week.key} className="text-center w-20 font-semibold">{week.label}</TableHead>
                ))
              ) : (
                WEEK_DAYS.map((day, index) => (
                  <TableHead key={day.key} className="text-center w-16 font-semibold">
                    <div className="flex flex-col items-center gap-0.5">
                      <span>{day.label}</span>
                      {dayDates[index] && (
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {dayDates[index]}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))
              )}
              <TableHead className="text-center font-semibold w-20">Total</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 6 + columnCount }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (!data?.length) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">No demand forecasts for this week yet.</p>
        <p className="text-sm text-muted-foreground mt-1">Add demand forecasts first to see supply targets.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead className="sticky left-0 bg-card w-56 font-semibold">Route</TableHead>
            <TableHead className="w-32 font-semibold">Truck Type</TableHead>
            <TableHead className="w-20 font-semibold text-center">Status</TableHead>
            <TableHead className="w-16 font-semibold text-center">Gap</TableHead>
            <TableHead className="w-24 font-semibold">Plan</TableHead>
            {isMonthlyPlanning ? (
              MONTH_WEEKS.map((week, index) => (
                <TableHead key={week.key} className="text-center w-20 font-semibold">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{week.label}</span>
                    {weekDateRanges[index] && (
                      <span className="text-[10px] font-normal text-muted-foreground">
                        days {weekDateRanges[index].start}-{weekDateRanges[index].end}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))
            ) : (
              WEEK_DAYS.map((day, index) => (
                <TableHead key={day.key} className="text-center w-16 font-semibold">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{day.label}</span>
                    {dayDates[index] && (
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {dayDates[index]}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))
            )}
            <TableHead className="text-center font-semibold w-20">Total</TableHead>
            <TableHead className="w-20"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.flatMap((target, targetIndex) => {
            const isExpanded = expandedRows.has(target.routeKey)
            const baseRowIndex = targetIndex * 3

            const rows: React.ReactElement[] = []

            // Target Row
            rows.push(
              <TableRow key={`${target.routeKey}-target`} className="bg-transparent hover:bg-muted/30">
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    onClick={() => toggleRow(target.routeKey)}
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="sticky left-0 bg-white font-medium w-56 max-w-[200px] truncate">
                  {formatCitym(target.routeKey)}
                </TableCell>
                <TableCell className="w-32">
                  <div className="flex flex-wrap gap-1">
                    {target.truckTypes && target.truckTypes.length > 0 ? (
                      target.truckTypes.map(tt => (
                        <Badge key={tt.id} variant="secondary" className="text-xs">
                          {tt.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <span className={cn(
                    "inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap min-w-[130px]",
                    target.gapPercent <= 0 && "bg-emerald-100 text-emerald-600",
                    target.gapPercent > 0 && "bg-red-100 text-red-600"
                  )}>
                    {target.gapPercent <= 0 && "CAPACITY FILLED"}
                    {target.gapPercent > 0 && "FILL RISK"}
                  </span>
                </TableCell>
                <TableCell className="text-center">
                  <span className={cn(
                    "text-sm font-semibold",
                    target.gapPercent > 0 && "text-red-600",
                    target.gapPercent < 0 && "text-emerald-600",
                    target.gapPercent === 0 && "text-muted-foreground"
                  )}>
                    {target.gapPercent}%
                  </span>
                </TableCell>
                <TableCell className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Target</TableCell>
                {WEEK_DAYS.map((day, index) => {
                  const key = `day${index + 1}` as keyof typeof target.target
                  return (
                    <TableCell key={day.key} className="text-center font-medium">
                      {target.target[key]}
                    </TableCell>
                  )
                })}
                <TableCell className="text-center font-semibold">
                  {target.target.total}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            )

            // Committed Row
            rows.push(
              <TableRow key={`${target.routeKey}-committed`} className="bg-transparent hover:bg-muted/30">
                <TableCell></TableCell>
                <TableCell className="sticky left-0 bg-white"></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Committed</TableCell>
                {WEEK_DAYS.map((day, index) => {
                  const key = `day${index + 1}` as keyof typeof target.committed
                  return (
                    <TableCell key={day.key} className="text-center font-medium text-emerald-700 dark:text-emerald-500">
                      {target.committed[key]}
                    </TableCell>
                  )
                })}
                <TableCell className="text-center font-semibold text-emerald-700 dark:text-emerald-500">
                  {target.committed.total}
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => onAddCommitment(target.routeKey)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span className="text-xs font-semibold">Add</span>
                  </Button>
                </TableCell>
              </TableRow>
            )

            // Gap Row
            rows.push(
              <TableRow key={`${target.routeKey}-gap`} className={cn(
                "bg-transparent hover:bg-muted/30",
                // Add border if not expanded
                !isExpanded && "border-b-[3px] border-border"
              )}>
                <TableCell></TableCell>
                <TableCell className="sticky left-0 bg-white"></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell></TableCell>
                <TableCell className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Gap</TableCell>
                {WEEK_DAYS.map((day, index) => {
                  const key = `day${index + 1}` as keyof typeof target.gap
                  const value = target.gap[key]
                  return (
                    <TableCell
                      key={day.key}
                      className={cn(
                        'text-center font-medium',
                        value !== 0 && 'text-red-600 dark:text-red-400',
                        value === 0 && 'text-muted-foreground'
                      )}
                    >
                      {value}
                    </TableCell>
                  )
                })}
                <TableCell
                  className={cn(
                    'text-center bg-muted/30 font-semibold',
                    target.gap.total !== 0 && 'text-red-600 dark:text-red-400',
                    target.gap.total === 0 && 'text-muted-foreground'
                  )}
                >
                  {target.gap.total}
                </TableCell>
                <TableCell></TableCell>
              </TableRow>
            )

            // Client Breakdown Rows (expandable)
            if (isExpanded && target.clients?.length > 0) {
              // Client header row
              rows.push(
                <TableRow key={`${target.routeKey}-clients-header`} className="bg-muted/15 border-t border-border/50">
                  <TableCell></TableCell>
                  <TableCell colSpan={12} className="py-1.5 px-2">
                    <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Target Breakdown by Client
                    </div>
                  </TableCell>
                </TableRow>
              )

              // Client data rows
              target.clients.forEach((clientData, idx) => {
                const isLastClient = idx === target.clients.length - 1
                const shouldShowBorder = isLastClient && !target.commitments?.length

                rows.push(
                  <TableRow key={`${target.routeKey}-client-${idx}`} className={cn(
                    "bg-muted/10 hover:bg-muted/20",
                    shouldShowBorder && "border-b-[3px] border-border"
                  )}>
                    <TableCell></TableCell>
                    <TableCell className="sticky left-0 bg-muted/10 pl-8 text-sm">
                      {clientData.client.name}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    {WEEK_DAYS.map((day, index) => {
                      const dayKey = `day${index + 1}` as keyof typeof clientData
                      const value = clientData[dayKey] as number
                      return (
                        <TableCell key={day.key} className="text-center text-sm">
                          {value}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center text-sm font-medium">
                      {clientData.total}
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                )
              })
            }

            // Supplier Commitment Rows (expandable)
            if (isExpanded && target.commitments?.length > 0) {
              // Commitments header row
              rows.push(
                <TableRow key={`${target.routeKey}-commitments-header`} className="bg-emerald-50/50 border-t border-emerald-200/50">
                  <TableCell></TableCell>
                  <TableCell colSpan={12} className="py-1.5 px-2">
                    <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">
                      Supplier Commitments
                    </div>
                  </TableCell>
                </TableRow>
              )

              // Commitment data rows
              target.commitments.forEach((commitment, idx) => {
                rows.push(
                  <TableRow
                    key={commitment.id}
                    className={cn(
                      "bg-emerald-50/20 hover:bg-emerald-50/40",
                      // Add clear separator to last commitment row
                      idx === target.commitments.length - 1 && "border-b-[3px] border-border"
                    )}
                  >
                    <TableCell></TableCell>
                    <TableCell className="sticky left-0 bg-emerald-50/20 pl-8 text-sm">
                      {commitment.party.name}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    {WEEK_DAYS.map((day, index) => {
                      const dayKey = `day${index + 1}Committed` as keyof typeof commitment
                      const value = commitment[dayKey] as number
                      const isEditing = editingCell?.id === commitment.id && editingCell?.day === dayKey

                      return (
                        <TableCell key={day.key} className="text-center p-1">
                          {isEditing ? (
                            <div className="flex items-center gap-1 justify-center">
                              <Input
                                type="number"
                                min="0"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, commitment.id, dayKey)}
                                className="h-7 w-14 text-center text-sm border-primary/50 focus:border-primary"
                                autoFocus
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                                onClick={() => handleSaveEdit(commitment.id, dayKey)}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCellClick(commitment.id, dayKey, value)}
                              className="w-full h-7 hover:bg-primary/10 hover:text-primary rounded px-2 transition-colors font-medium"
                            >
                              {value}
                            </button>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center text-sm font-medium">{commitment.totalCommitted}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => handleSendToSupplier(commitment.party.name)}
                          title="Send to supplier"
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteCommitment(commitment.id, commitment.party.name)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            }

            return rows
          })}
        </TableBody>
      </Table>
    </div>
  )
}
