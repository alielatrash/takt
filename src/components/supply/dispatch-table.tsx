'use client'

import React, { useState, useMemo } from 'react'
import { ChevronDown, ChevronRight, Users, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { WEEK_DAYS } from '@/types'
import { formatCitym } from '@/lib/citym'
import { cn } from '@/lib/utils'
import type { DispatchSupplier } from '@/hooks/use-supply'

interface DispatchTableProps {
  data: {
    suppliers: DispatchSupplier[]
    grandTotals: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; total: number }
  } | undefined
  isLoading: boolean
  weekStart?: Date
}

type DayTotals = { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; total: number }

interface RouteGrouped {
  routeKey: string
  suppliers: Array<{
    supplierId: string
    supplierName: string
    plan: DayTotals
  }>
  totals: DayTotals
}

function formatDayDate(weekStart: Date, dayIndex: number): string {
  const date = new Date(weekStart)
  date.setDate(date.getDate() + dayIndex)
  return `${date.getDate()}-${date.toLocaleString('en', { month: 'short' })}`
}

export function DispatchTable({ data, isLoading, weekStart }: DispatchTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [groupBy, setGroupBy] = useState<'supplier' | 'route'>('supplier')

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  // Transform data for route-grouped view
  const routeGroupedData = useMemo(() => {
    if (!data?.suppliers) return []

    const routeMap = new Map<string, RouteGrouped>()

    for (const supplier of data.suppliers) {
      for (const route of supplier.routes) {
        if (!routeMap.has(route.routeKey)) {
          routeMap.set(route.routeKey, {
            routeKey: route.routeKey,
            suppliers: [],
            totals: { day1: 0, day2: 0, day3: 0, day4: 0, day5: 0, day6: 0, day7: 0, total: 0 },
          })
        }

        const routeGroup = routeMap.get(route.routeKey)!
        routeGroup.suppliers.push({
          supplierId: supplier.supplierId,
          supplierName: supplier.supplierName,
          plan: route.plan,
        })

        // Aggregate totals
        routeGroup.totals.day1 += route.plan.day1
        routeGroup.totals.day2 += route.plan.day2
        routeGroup.totals.day3 += route.plan.day3
        routeGroup.totals.day4 += route.plan.day4
        routeGroup.totals.day5 += route.plan.day5
        routeGroup.totals.day6 += route.plan.day6
        routeGroup.totals.day7 += route.plan.day7
        routeGroup.totals.total += route.plan.total
      }
    }

    return Array.from(routeMap.values()).sort((a, b) => a.routeKey.localeCompare(b.routeKey))
  }, [data])

  // Render Grand Total Row
  const renderGrandTotalRow = () => {
    if (!data) return null
    return (
      <TableRow key="grand-total" className="bg-[#4a7c59] hover:bg-[#4a7c59] font-bold">
        <TableCell className="text-white"></TableCell>
        <TableCell className="text-white font-bold">GRAND TOTAL</TableCell>
        {WEEK_DAYS.map((day, index) => {
          const key = `day${index + 1}` as keyof typeof data.grandTotals
          return (
            <TableCell key={day.key} className="text-center text-white font-bold">
              {data.grandTotals[key]}
            </TableCell>
          )
        })}
        <TableCell className="text-center text-white font-bold">
          {data.grandTotals.total}
        </TableCell>
      </TableRow>
    )
  }

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Fleet Partner</TableHead>
              {WEEK_DAYS.map((day) => (
                <TableHead key={day.key} className="text-center w-20">{day.label}</TableHead>
              ))}
              <TableHead className="text-center font-semibold">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {Array.from({ length: 10 }).map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (!data?.suppliers?.length) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">No supply commitments for this week yet.</p>
        <p className="text-sm text-muted-foreground mt-1">Add supply commitments on the Supply page first.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Group By Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Group by:</span>
        <ToggleGroup type="single" value={groupBy} onValueChange={(v) => v && setGroupBy(v as 'supplier' | 'route')}>
          <ToggleGroupItem value="supplier" aria-label="Group by Supplier" className="gap-2">
            <Users className="h-4 w-4" />
            Supplier
          </ToggleGroupItem>
          <ToggleGroupItem value="route" aria-label="Group by Route" className="gap-2">
            <MapPin className="h-4 w-4" />
            Route
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#4a7c59] hover:bg-[#4a7c59]">
              <TableHead className="w-8 text-white"></TableHead>
              <TableHead className="text-white font-semibold">
                {groupBy === 'supplier' ? 'Fleet Partner' : 'Route (CITYm)'}
              </TableHead>
              {WEEK_DAYS.map((day, index) => (
                <TableHead key={day.key} className="text-center w-20 text-white">
                  <div className="flex flex-col">
                    <span className="font-semibold">{day.label.toUpperCase()}</span>
                    {weekStart && (
                      <span className="text-xs opacity-80">{formatDayDate(weekStart, index)}</span>
                    )}
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-center font-bold text-white">TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <>
              {groupBy === 'supplier'
                ? data.suppliers.map((supplier) => {
                    const isExpanded = expandedRows.has(supplier.supplierId)

                    return (
                      <React.Fragment key={supplier.supplierId}>
                        {/* Supplier Total Row */}
                        <TableRow className="font-medium cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(supplier.supplierId)}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); toggleRow(supplier.supplierId) }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {supplier.supplierName}
                            <span className="text-xs text-muted-foreground ml-2">
                              ({supplier.routes.length} {supplier.routes.length === 1 ? 'route' : 'routes'})
                            </span>
                          </TableCell>
                          {WEEK_DAYS.map((day, index) => {
                            const key = `day${index + 1}` as keyof typeof supplier.totals
                            const value = supplier.totals[key]
                            return (
                              <TableCell key={day.key} className={cn("text-center", value > 0 && "font-medium")}>
                                {value || ''}
                              </TableCell>
                            )
                          })}
                          <TableCell className="text-center font-bold">
                            {supplier.totals.total}
                          </TableCell>
                        </TableRow>

                        {/* Route Breakdown Rows */}
                        {isExpanded && supplier.routes.map((route) => (
                          <TableRow key={`${supplier.supplierId}-${route.routeKey}`} className="bg-muted/30">
                            <TableCell></TableCell>
                            <TableCell className="pl-10 text-sm text-muted-foreground">
                              {formatCitym(route.routeKey)}
                            </TableCell>
                            {WEEK_DAYS.map((day, index) => {
                              const key = `day${index + 1}` as keyof typeof route.plan
                              const value = route.plan[key]
                              return (
                                <TableCell key={day.key} className="text-center text-sm text-muted-foreground">
                                  {value || ''}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-center text-sm font-medium text-muted-foreground">
                              {route.plan.total}
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    )
                  })
                : routeGroupedData.map((route) => {
                    const isExpanded = expandedRows.has(route.routeKey)

                    return (
                      <React.Fragment key={route.routeKey}>
                        {/* Route Total Row */}
                        <TableRow className="font-medium cursor-pointer hover:bg-muted/50" onClick={() => toggleRow(route.routeKey)}>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => { e.stopPropagation(); toggleRow(route.routeKey) }}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="font-semibold">
                            {formatCitym(route.routeKey)}
                            <span className="text-xs text-muted-foreground ml-2">
                              ({route.suppliers.length} {route.suppliers.length === 1 ? 'supplier' : 'suppliers'})
                            </span>
                          </TableCell>
                          {WEEK_DAYS.map((day, index) => {
                            const key = `day${index + 1}` as keyof typeof route.totals
                            const value = route.totals[key]
                            return (
                              <TableCell key={day.key} className={cn("text-center", value > 0 && "font-medium")}>
                                {value || ''}
                              </TableCell>
                            )
                          })}
                          <TableCell className="text-center font-bold">
                            {route.totals.total}
                          </TableCell>
                        </TableRow>

                        {/* Supplier Breakdown Rows */}
                        {isExpanded && route.suppliers.map((supplier) => (
                          <TableRow key={`${route.routeKey}-${supplier.supplierId}`} className="bg-muted/30">
                            <TableCell></TableCell>
                            <TableCell className="pl-10 text-sm text-muted-foreground">
                              {supplier.supplierName}
                            </TableCell>
                            {WEEK_DAYS.map((day, index) => {
                              const key = `day${index + 1}` as keyof typeof supplier.plan
                              const value = supplier.plan[key]
                              return (
                                <TableCell key={day.key} className="text-center text-sm text-muted-foreground">
                                  {value || ''}
                                </TableCell>
                              )
                            })}
                            <TableCell className="text-center text-sm font-medium text-muted-foreground">
                              {supplier.plan.total}
                            </TableCell>
                          </TableRow>
                        ))}
                      </React.Fragment>
                    )
                  })}

              {/* Grand Total Row */}
              {renderGrandTotalRow()}
            </>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
