'use client'

import { useState, useEffect } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout'
import { WeekSelector } from '@/components/demand/week-selector'
import { DispatchTable } from '@/components/supply/dispatch-table'
import { usePlanningWeeks } from '@/hooks/use-demand'
import { useDispatchSheet } from '@/hooks/use-supply'

export default function DispatchSheetPage() {
  const [selectedWeekId, setSelectedWeekId] = useState<string>()

  const { data: weeksData } = usePlanningWeeks()
  const { data: dispatchData, isLoading } = useDispatchSheet(selectedWeekId)

  // Get selected week for date display
  const selectedWeek = weeksData?.data?.find(w => w.id === selectedWeekId)
  const weekStart = selectedWeek ? new Date(selectedWeek.weekStart) : undefined

  // Auto-select first (current) week
  useEffect(() => {
    if (weeksData?.data?.length && !selectedWeekId) {
      setSelectedWeekId(weeksData.data[0].id)
    }
  }, [weeksData, selectedWeekId])

  // Calculate summary metrics
  const grandTotals = dispatchData?.data?.grandTotals
  const supplierCount = dispatchData?.data?.suppliers?.length ?? 0
  const totalRoutes = dispatchData?.data?.suppliers?.reduce((sum, s) => sum + s.routes.length, 0) ?? 0

  const handleDownload = () => {
    if (!dispatchData?.data?.suppliers?.length) return

    const headers = [
      'Fleet Partner',
      'Route (CITYm)',
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Total'
    ]

    const rows: string[][] = []
    dispatchData.data.suppliers.forEach(supplier => {
      supplier.routes.forEach(route => {
        rows.push([
          supplier.supplierName,
          route.routeKey,
          route.plan.day1.toString(),
          route.plan.day2.toString(),
          route.plan.day3.toString(),
          route.plan.day4.toString(),
          route.plan.day5.toString(),
          route.plan.day6.toString(),
          route.plan.day7.toString(),
          route.plan.total.toString()
        ])
      })
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `dispatch-sheet-week-${selectedWeek?.weekNumber || 'unknown'}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div>
      <PageHeader
        title="Daily Dispatch Sheet"
        description="Fleet partner commitments by route and day"
      >
        <WeekSelector value={selectedWeekId} onValueChange={setSelectedWeekId} />
        <Button variant="outline" onClick={handleDownload} disabled={!dispatchData?.data?.suppliers?.length}>
          <Download className="h-4 w-4" />
          Download
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Planned Loads</p>
          <p className="text-2xl font-bold text-green-700">{grandTotals?.total ?? 0}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Fleet Partners</p>
          <p className="text-2xl font-bold">{supplierCount}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active Routes</p>
          <p className="text-2xl font-bold">{totalRoutes}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Week</p>
          <p className="text-lg font-bold">
            {selectedWeek ? `Week ${selectedWeek.weekNumber}` : '-'}
          </p>
          {weekStart && (
            <p className="text-xs text-muted-foreground">
              {weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })} - {
                new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en', { month: 'short', day: 'numeric' })
              }
            </p>
          )}
        </div>
      </div>

      {selectedWeekId ? (
        <DispatchTable
          data={dispatchData?.data}
          isLoading={isLoading}
          weekStart={weekStart}
        />
      ) : (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">Select a planning week to view dispatch sheet</p>
        </div>
      )}
    </div>
  )
}
