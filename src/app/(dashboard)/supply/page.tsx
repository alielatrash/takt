'use client'

import { useState, useEffect } from 'react'
import { Download, Table2, LayoutGrid, Flame } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout'
import { WeekSelector } from '@/components/demand/week-selector'
import { SupplyTable } from '@/components/supply/supply-table'
import { SupplyTableEnhanced } from '@/components/supply/supply-table-enhanced'
import { SupplyHeatmapView } from '@/components/supply/supply-heatmap-view'
import { SupplyFormDialog } from '@/components/supply/supply-form-dialog'
import { SupplyFiltersComponent, type SupplyFilters } from '@/components/supply/supply-filters'
import { usePlanningWeeks } from '@/hooks/use-demand'
import { useSupplyTargets } from '@/hooks/use-supply'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type ViewMode = 'detailed' | 'compact' | 'heatmap'

export default function SupplyPlanningPage() {
  const [selectedWeekId, setSelectedWeekId] = useState<string>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCitym, setSelectedCitym] = useState<string>('')
  const [editingSupplierId, setEditingSupplierId] = useState<string>('')
  const [viewMode, setViewMode] = useState<ViewMode>('detailed')
  const [filters, setFilters] = useState<SupplyFilters>({
    plannerIds: [],
    supplyPlannerIds: [],
    clientIds: [],
    categoryIds: [],
    truckTypeIds: [],
    cityIds: [],
  })

  const { data: weeksData } = usePlanningWeeks()
  const { data: targetsData, isLoading } = useSupplyTargets(selectedWeekId, filters)

  // Get current week start date as string
  const currentWeekStart = weeksData?.data?.find(w => w.id === selectedWeekId)?.weekStart
  const weekStartString = currentWeekStart ? new Date(currentWeekStart).toISOString() : undefined

  // Auto-select first (current) week
  useEffect(() => {
    if (weeksData?.data?.length && !selectedWeekId) {
      setSelectedWeekId(weeksData.data[0].id)
    }
  }, [weeksData, selectedWeekId])

  const handleWeekChange = (weekId: string | undefined) => {
    setSelectedWeekId(weekId)
  }

  const handleFiltersChange = (newFilters: SupplyFilters) => {
    setFilters(newFilters)
  }

  const handleAddCommitment = (routeKey: string) => {
    setSelectedCitym(routeKey)
    setEditingSupplierId('')
    setIsDialogOpen(true)
  }

  const handleEditCommitment = (routeKey: string, supplierId: string, supplierName: string) => {
    setSelectedCitym(routeKey)
    setEditingSupplierId(supplierId)
    setIsDialogOpen(true)
  }

  const handleDownload = () => {
    if (!targetsData?.data?.length) return

    const headers = [
      'Route',
      'Target Sun',
      'Target Mon',
      'Target Tue',
      'Target Wed',
      'Target Thu',
      'Target Fri',
      'Target Sat',
      'Target Total',
      'Committed Sun',
      'Committed Mon',
      'Committed Tue',
      'Committed Wed',
      'Committed Thu',
      'Committed Fri',
      'Committed Sat',
      'Committed Total',
      'Gap Sun',
      'Gap Mon',
      'Gap Tue',
      'Gap Wed',
      'Gap Thu',
      'Gap Fri',
      'Gap Sat',
      'Gap Total',
      'Gap %'
    ]

    const rows = targetsData.data.map(t => [
      t.routeKey,
      t.target.day1,
      t.target.day2,
      t.target.day3,
      t.target.day4,
      t.target.day5,
      t.target.day6,
      t.target.day7,
      t.target.total,
      t.committed.day1,
      t.committed.day2,
      t.committed.day3,
      t.committed.day4,
      t.committed.day5,
      t.committed.day6,
      t.committed.day7,
      t.committed.total,
      t.gap.day1,
      t.gap.day2,
      t.gap.day3,
      t.gap.day4,
      t.gap.day5,
      t.gap.day6,
      t.gap.day7,
      t.gap.total,
      `${t.gapPercent}%`
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    const selectedWeek = weeksData?.data?.find(w => w.id === selectedWeekId)
    link.setAttribute('download', `supply-plan-week-${selectedWeek?.weekNumber || 'unknown'}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Calculate summary metrics
  const totalTarget = targetsData?.data?.reduce((sum, t) => sum + t.target.total, 0) ?? 0
  const totalCommitted = targetsData?.data?.reduce((sum, t) => sum + t.committed.total, 0) ?? 0
  const totalGap = totalTarget - totalCommitted
  const gapPercent = totalTarget > 0 ? Math.round((totalGap / totalTarget) * 100) : 0
  const routeCount = targetsData?.data?.length ?? 0
  const planningCycle = weeksData?.meta?.planningCycle || 'WEEKLY'

  return (
    <div>
      <PageHeader
        title="Supply Planning"
        description="Manage supplier commitments by route"
      >
        <WeekSelector value={selectedWeekId} onValueChange={handleWeekChange} />
        <Button variant="outline" onClick={handleDownload} disabled={!targetsData?.data?.length}>
          <Download className="h-4 w-4" />
          Download
        </Button>
      </PageHeader>

      {/* Filters */}
      {selectedWeekId && (
        <div className="pt-0 pb-6 space-y-4">
          <SupplyFiltersComponent
            planningWeekId={selectedWeekId}
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />

          {/* View Mode Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">View:</span>
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)}>
              <TabsList>
                <TabsTrigger value="detailed" className="gap-2">
                  <Table2 className="h-4 w-4" />
                  Detailed
                </TabsTrigger>
                <TabsTrigger value="compact" className="gap-2">
                  <LayoutGrid className="h-4 w-4" />
                  Compact
                </TabsTrigger>
                <TabsTrigger value="heatmap" className="gap-2">
                  <Flame className="h-4 w-4" />
                  Heatmap
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Target</p>
          <p className="text-2xl font-bold text-blue-600">{totalTarget}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Total Committed</p>
          <p className="text-2xl font-bold text-green-600">{totalCommitted}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Supply Gap</p>
          <p className={`text-2xl font-bold ${totalGap > 0 ? 'text-red-600' : totalGap < 0 ? 'text-amber-600' : 'text-gray-600'}`}>
            {totalGap} ({gapPercent}%)
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Active Routes</p>
          <p className="text-2xl font-bold">{routeCount}</p>
        </div>
      </div>

      {selectedWeekId ? (
        <>
          {viewMode === 'detailed' && (
            <SupplyTable
              data={targetsData?.data}
              isLoading={isLoading}
              onAddCommitment={handleAddCommitment}
              onEditCommitment={handleEditCommitment}
              planningWeekId={selectedWeekId}
              weekStart={weekStartString}
            />
          )}
          {viewMode === 'compact' && (
            <SupplyTableEnhanced
              data={targetsData?.data}
              isLoading={isLoading}
              onAddCommitment={handleAddCommitment}
              onEditCommitment={handleEditCommitment}
              planningWeekId={selectedWeekId}
              weekStart={weekStartString}
            />
          )}
          {viewMode === 'heatmap' && (
            <SupplyHeatmapView
              data={targetsData?.data}
              isLoading={isLoading}
              onAddCommitment={handleAddCommitment}
              onEditCommitment={handleEditCommitment}
              planningWeekId={selectedWeekId}
              weekStart={weekStartString}
            />
          )}
        </>
      ) : (
        <div className="rounded-md border p-8 text-center">
          <p className="text-muted-foreground">Select a planning week to view supply targets</p>
        </div>
      )}

      {selectedWeekId && selectedCitym && (
        <SupplyFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          planningWeekId={selectedWeekId}
          routeKey={selectedCitym}
          targetData={targetsData?.data?.find(t => t.routeKey === selectedCitym)}
          editingSupplierId={editingSupplierId}
        />
      )}
    </div>
  )
}
