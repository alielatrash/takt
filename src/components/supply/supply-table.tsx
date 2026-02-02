'use client'

import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
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
  target: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; total: number }
  committed: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; total: number }
  gap: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; total: number }
  gapPercent: number
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
    day1: number
    day2: number
    day3: number
    day4: number
    day5: number
    day6: number
    day7: number
    total: number
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

  const handleCellBlur = async (id: string, day: string) => {
    const newValue = parseInt(editValue) || 0
    setEditingCell(null)

    try {
      await updateMutation.mutateAsync({
        id,
        [`${day}Committed`]: newValue,
      })
    } catch (error) {
      toast.error('Failed to update commitment')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string, day: string) => {
    if (e.key === 'Enter') {
      handleCellBlur(id, day)
    } else if (e.key === 'Escape') {
      setEditingCell(null)
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

  const getGapBadgeVariant = (gap: number): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (gap > 0) return 'destructive' // Undersupply
    if (gap < 0) return 'secondary' // Oversupply
    return 'outline' // Balanced
  }

  if (isLoading) {
    const columnCount = isMonthlyPlanning ? 4 : 7
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Route (CITYm)</TableHead>
              <TableHead>Row</TableHead>
              {isMonthlyPlanning ? (
                MONTH_WEEKS.map((week) => (
                  <TableHead key={week.key} className="text-center w-20">{week.label}</TableHead>
                ))
              ) : (
                WEEK_DAYS.map((day) => (
                  <TableHead key={day.key} className="text-center w-16">{day.label}</TableHead>
                ))
              )}
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 5 + columnCount }).map((_, j) => (
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
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead className="sticky left-0 bg-background">Route (CITYm)</TableHead>
            <TableHead>Row</TableHead>
            {isMonthlyPlanning ? (
              MONTH_WEEKS.map((week, index) => (
                <TableHead key={week.key} className="text-center w-20">
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
              WEEK_DAYS.map((day) => (
                <TableHead key={day.key} className="text-center w-16">{day.label}</TableHead>
              ))
            )}
            <TableHead className="text-center font-semibold">Total</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((target) => {
            const isExpanded = expandedRows.has(target.routeKey)

            return (
              <React.Fragment key={target.routeKey}>
                {/* Target Row */}
                <TableRow className="bg-muted/30">
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => toggleRow(target.routeKey)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="sticky left-0 bg-muted/30 font-medium">
                    {formatCitym(target.routeKey)}
                  </TableCell>
                  <TableCell className="font-semibold text-blue-600">TARGET</TableCell>
                  {WEEK_DAYS.map((day, index) => {
                    const key = `day${index + 1}` as keyof typeof target.target
                    return (
                      <TableCell key={day.key} className="text-center font-semibold text-blue-600">
                        {target.target[key]}
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-center font-bold text-blue-600">
                    {target.target.total}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onAddCommitment(target.routeKey)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>

                {/* Committed Row */}
                <TableRow>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell className="font-semibold text-green-600">COMMITTED</TableCell>
                  {WEEK_DAYS.map((day, index) => {
                    const key = `day${index + 1}` as keyof typeof target.committed
                    return (
                      <TableCell key={day.key} className="text-center text-green-600">
                        {target.committed[key]}
                      </TableCell>
                    )
                  })}
                  <TableCell className="text-center font-semibold text-green-600">
                    {target.committed.total}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>

                {/* Gap Row */}
                <TableRow className="border-b-2">
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">GAP</span>
                      <Badge variant={getGapBadgeVariant(target.gap.total)}>
                        {target.gapPercent}%
                      </Badge>
                    </div>
                  </TableCell>
                  {WEEK_DAYS.map((day, index) => {
                    const key = `day${index + 1}` as keyof typeof target.gap
                    const value = target.gap[key]
                    return (
                      <TableCell
                        key={day.key}
                        className={cn(
                          'text-center font-semibold',
                          value > 0 && 'text-red-600',
                          value < 0 && 'text-amber-600'
                        )}
                      >
                        {value}
                      </TableCell>
                    )
                  })}
                  <TableCell
                    className={cn(
                      'text-center font-bold',
                      target.gap.total > 0 && 'text-red-600',
                      target.gap.total < 0 && 'text-amber-600'
                    )}
                  >
                    {target.gap.total}
                  </TableCell>
                  <TableCell></TableCell>
                </TableRow>

                {/* Client Breakdown Rows (expandable) */}
                {isExpanded && target.clients?.length > 0 && (
                  <>
                    <TableRow className="bg-blue-50/30">
                      <TableCell></TableCell>
                      <TableCell colSpan={10} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Target Breakdown by Client
                      </TableCell>
                    </TableRow>
                    {target.clients.map((clientData, idx) => (
                      <TableRow key={`${target.routeKey}-client-${idx}`} className="bg-blue-50/50">
                        <TableCell></TableCell>
                        <TableCell className="pl-8 text-sm text-blue-700">
                          {clientData.client.name}
                        </TableCell>
                        <TableCell></TableCell>
                        {WEEK_DAYS.map((day, index) => {
                          const dayKey = `day${index + 1}` as keyof typeof clientData
                          const value = clientData[dayKey] as number
                          return (
                            <TableCell key={day.key} className="text-center text-sm text-blue-600">
                              {value}
                            </TableCell>
                          )
                        })}
                        <TableCell className="text-center text-sm font-semibold text-blue-600">
                          {clientData.total}
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    ))}
                  </>
                )}

                {/* Supplier Commitment Rows (expandable) */}
                {isExpanded && target.commitments?.length > 0 && (
                  <>
                    <TableRow className="bg-green-50/30">
                      <TableCell></TableCell>
                      <TableCell colSpan={10} className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Supplier Commitments
                      </TableCell>
                    </TableRow>
                  </>
                )}
                {isExpanded && target.commitments.map((commitment) => (
                  <TableRow key={commitment.id} className="bg-yellow-50/50">
                    <TableCell></TableCell>
                    <TableCell className="pl-8 text-sm text-muted-foreground">
                      {commitment.party.name}
                    </TableCell>
                    <TableCell></TableCell>
                    {WEEK_DAYS.map((day, index) => {
                      const dayKey = `day${index + 1}` as keyof typeof commitment
                      const value = commitment[dayKey] as number
                      const isEditing = editingCell?.id === commitment.id && editingCell?.day === dayKey

                      return (
                        <TableCell key={day.key} className="text-center p-1">
                          {isEditing ? (
                            <Input
                              type="number"
                              min="0"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleCellBlur(commitment.id, dayKey)}
                              onKeyDown={(e) => handleKeyDown(e, commitment.id, dayKey)}
                              className="h-7 w-14 text-center text-sm"
                              autoFocus
                            />
                          ) : (
                            <button
                              onClick={() => handleCellClick(commitment.id, dayKey, value)}
                              className="w-full h-7 hover:bg-muted rounded px-2 transition-colors text-sm"
                            >
                              {value}
                            </button>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center text-sm">{commitment.total}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => handleDeleteCommitment(commitment.id, commitment.party.name)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </React.Fragment>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
