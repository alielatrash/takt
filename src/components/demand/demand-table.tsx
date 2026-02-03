'use client'

import { useState, useMemo } from 'react'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { format, addWeeks } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useUpdateDemandForecast, useDeleteDemandForecast, usePlanningWeeks } from '@/hooks/use-demand'
import { useOrganizationSettings } from '@/hooks/use-organization'
import { WEEK_DAYS } from '@/types'
import { formatCitym } from '@/lib/citym'
import type { DemandForecast, Party, Location, ResourceType, DemandCategory } from '@prisma/client'

const MONTH_WEEKS = [
  { key: 'week1', label: 'Week 1' },
  { key: 'week2', label: 'Week 2' },
  { key: 'week3', label: 'Week 3' },
  { key: 'week4', label: 'Week 4' },
]

interface DemandForecastWithRelations extends DemandForecast {
  party: Pick<Party, 'id' | 'name'>
  pickupLocation: Pick<Location, 'id' | 'name' | 'code' | 'region'>
  dropoffLocation: Pick<Location, 'id' | 'name' | 'code' | 'region'>
  demandCategory?: Pick<DemandCategory, 'id' | 'name' | 'code'> | null
  resourceType: Pick<ResourceType, 'id' | 'name'>
  createdBy: { id: string; firstName: string; lastName: string }
}

interface PaginationInfo {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface DemandTableProps {
  data: DemandForecastWithRelations[] | undefined
  isLoading: boolean
  onEditForecast?: (forecast: DemandForecastWithRelations) => void
  weekStart?: Date | string
  planningWeekId?: string
  pagination?: PaginationInfo
  onPageChange?: (page: number) => void
  selectedIds?: Set<string>
  onSelectionChange?: (selectedIds: Set<string>) => void
}

// Helper to format date as "DD-MMM"
function formatDayDate(weekStart: Date | string, dayIndex: number): string {
  const start = new Date(weekStart)
  const date = new Date(start)
  date.setDate(start.getDate() + dayIndex)
  const day = date.getDate().toString().padStart(2, '0')
  const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
  return `${day}-${month}`
}

export function DemandTable({ data, isLoading, onEditForecast, weekStart, planningWeekId, pagination, onPageChange, selectedIds = new Set(), onSelectionChange }: DemandTableProps) {
  const { data: planningWeeksData } = usePlanningWeeks()
  const { data: orgSettings } = useOrganizationSettings()
  const updateMutation = useUpdateDemandForecast()
  const deleteMutation = useDeleteDemandForecast()
  const [editingCell, setEditingCell] = useState<{ id: string; day: string } | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  const planningCycle = planningWeeksData?.meta?.planningCycle || 'WEEKLY'
  const isMonthlyPlanning = planningCycle === 'MONTHLY'
  const isCategoryEnabled = orgSettings?.demandCategoryEnabled || false
  const categoryLabel = orgSettings?.demandCategoryLabel || 'Category'

  // Calculate week date ranges for monthly planning
  const weekDateRanges = useMemo(() => {
    if (!isMonthlyPlanning || !planningWeeksData?.data || !planningWeekId) return []

    const selectedWeek = planningWeeksData.data.find(w => w.id === planningWeekId)
    if (!selectedWeek) return []

    const monthStart = new Date(selectedWeek.weekStart)

    return MONTH_WEEKS.map((_, index) => {
      const weekStartDate = addWeeks(monthStart, index)
      const weekEndDate = addWeeks(weekStartDate, 1)
      weekEndDate.setDate(weekEndDate.getDate() - 1) // End on the last day of the week

      return {
        start: format(weekStartDate, 'd'),  // Just day number
        end: format(weekEndDate, 'd')       // Just day number
      }
    })
  }, [isMonthlyPlanning, planningWeeksData, planningWeekId])

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    onSelectionChange?.(newSelection)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === data?.length) {
      onSelectionChange?.(new Set())
    } else {
      onSelectionChange?.(new Set(data?.map(f => f.id) || []))
    }
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
        [`${day}Loads`]: newValue,
      })
      toast.success('Forecast updated')
    } catch (error) {
      toast.error('Failed to update forecast')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string, day: string) => {
    if (e.key === 'Enter') {
      handleCellBlur(id, day)
    } else if (e.key === 'Escape') {
      setEditingCell(null)
    }
  }

  const handleDelete = async (id: string, routeKey: string) => {
    if (!confirm(`Are you sure you want to delete the forecast for ${formatCitym(routeKey)}?`)) return
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Forecast deleted successfully')
    } catch (error) {
      toast.error('Failed to delete forecast')
    }
  }

  if (isLoading) {
    const columnCount = isMonthlyPlanning ? 4 : 7
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-10"></TableHead>
              <TableHead className="font-semibold">Client</TableHead>
              <TableHead className="font-semibold">Route</TableHead>
              <TableHead className="font-semibold">Region</TableHead>
              {isCategoryEnabled && (
                <TableHead className="font-semibold">{categoryLabel}</TableHead>
              )}
              <TableHead className="font-semibold">Truck Type</TableHead>
              {isMonthlyPlanning ? (
                MONTH_WEEKS.map((week) => (
                  <TableHead key={week.key} className="text-center w-20 font-semibold">{week.label}</TableHead>
                ))
              ) : (
                WEEK_DAYS.map((day) => (
                  <TableHead key={day.key} className="text-center w-16 font-semibold">{day.label}</TableHead>
                ))
              )}
              <TableHead className="text-center font-semibold">Total</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 8 + columnCount }).map((_, j) => (
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
      <div className="p-12 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium">No forecasts yet</h3>
        <p className="text-sm text-muted-foreground mt-1">Click "Add Forecast" to create your first demand forecast.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b">
            <TableHead className="w-10">
              {data && data.length > 0 && (
                <Checkbox
                  checked={selectedIds.size === data.length && data.length > 0}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              )}
            </TableHead>
            <TableHead className="sticky left-0 bg-card font-semibold">Client</TableHead>
            <TableHead className="font-semibold">Route</TableHead>
            <TableHead className="font-semibold">Region</TableHead>
            {isCategoryEnabled && (
              <TableHead className="font-semibold">{categoryLabel}</TableHead>
            )}
            <TableHead className="font-semibold">Truck Type</TableHead>
            {isMonthlyPlanning ? (
              MONTH_WEEKS.map((week, index) => (
                <TableHead key={week.key} className="text-center w-20 font-semibold p-2">
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
                <TableHead key={day.key} className="text-center w-16 font-semibold p-2">
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{day.label}</span>
                    {weekStart && (
                      <span className="text-[10px] font-normal text-muted-foreground">
                        {formatDayDate(weekStart, index)}
                      </span>
                    )}
                  </div>
                </TableHead>
              ))
            )}
            <TableHead className="text-center font-semibold bg-muted/30">Total</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((forecast, rowIndex) => (
            <TableRow key={forecast.id} className={rowIndex % 2 === 0 ? 'bg-transparent' : 'bg-muted/20'}>
              <TableCell>
                <Checkbox
                  checked={selectedIds.has(forecast.id)}
                  onCheckedChange={() => toggleSelection(forecast.id)}
                  aria-label={`Select ${forecast.party.name}`}
                />
              </TableCell>
              <TableCell className="sticky left-0 bg-inherit font-medium max-w-[200px] truncate">
                {forecast.party.name}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm">
                {formatCitym(forecast.routeKey)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                {forecast.pickupLocation.region} → {forecast.dropoffLocation.region}
              </TableCell>
              {isCategoryEnabled && (
                <TableCell>
                  {forecast.demandCategory ? (
                    <Badge variant="default" className="text-xs">
                      {forecast.demandCategory.name}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
              )}
              <TableCell className="text-sm">{forecast.resourceType.name}</TableCell>
              {isMonthlyPlanning ? (
                MONTH_WEEKS.map((week, weekIndex) => {
                  const weekNum = `week${weekIndex + 1}` as string
                  const weekKey = `${weekNum}Qty` as keyof DemandForecast
                  const value = (forecast[weekKey] as number) ?? 0
                  const isEditing = editingCell?.id === forecast.id && editingCell?.day === weekNum

                  return (
                    <TableCell key={week.key} className="text-center p-1">
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleCellBlur(forecast.id, weekNum)}
                          onKeyDown={(e) => handleKeyDown(e, forecast.id, weekNum)}
                          className="h-8 w-16 text-center text-sm"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => handleCellClick(forecast.id, weekNum, value)}
                          className="w-full h-8 hover:bg-primary/10 hover:text-primary rounded px-2 transition-colors font-medium"
                        >
                          {value}
                        </button>
                      )}
                    </TableCell>
                  )
                })
              ) : (
                WEEK_DAYS.map((day, dayIndex) => {
                  const dayNum = `day${dayIndex + 1}` as string
                  const dayKey = `${dayNum}Qty` as keyof DemandForecast
                  const value = (forecast[dayKey] as number) ?? 0
                  const isEditing = editingCell?.id === forecast.id && editingCell?.day === dayNum

                  return (
                    <TableCell key={day.key} className="text-center p-1">
                      {isEditing ? (
                        <Input
                          type="number"
                          min="0"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => handleCellBlur(forecast.id, dayNum)}
                          onKeyDown={(e) => handleKeyDown(e, forecast.id, dayNum)}
                          className="h-8 w-14 text-center text-sm"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => handleCellClick(forecast.id, dayNum, value)}
                          className="w-full h-8 hover:bg-primary/10 hover:text-primary rounded px-2 transition-colors font-medium"
                        >
                          {value}
                        </button>
                      )}
                    </TableCell>
                  )
                })
              )}
              <TableCell className="text-center font-bold bg-muted/30">
                {forecast.totalQty}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditForecast?.(forecast)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleDelete(forecast.id, forecast.routeKey)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <div className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
            {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} of{' '}
            {pagination.totalCount} results
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={!pagination.hasPreviousPage}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                // Show first, last, current, and adjacent pages
                let pageNum: number
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1
                } else if (pagination.page <= 3) {
                  pageNum = i + 1
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i
                } else {
                  pageNum = pagination.page - 2 + i
                }

                return (
                  <Button
                    key={pageNum}
                    variant={pagination.page === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onPageChange?.(pageNum)}
                    className="w-9"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={!pagination.hasNextPage}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
