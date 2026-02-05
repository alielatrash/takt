'use client'

import { useState, useEffect } from 'react'
import { Plus, ClipboardList, TruckIcon, MapPin, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/layout'
import { WeekSelector } from '@/components/demand/week-selector'
import { DemandTable } from '@/components/demand/demand-table'
import { DemandFormDialog } from '@/components/demand/demand-form-dialog'
import { DemandFiltersComponent, type DemandFilters } from '@/components/demand/demand-filters'
import { usePlanningWeeks, useDemandForecasts, useDeleteDemandForecast } from '@/hooks/use-demand'
import { useOrganizationSettings } from '@/hooks/use-organization'
import { toast } from 'sonner'
import type { DemandForecast, Party, Location, ResourceType, DemandCategory } from '@prisma/client'

interface DemandForecastWithRelations extends Omit<DemandForecast, 'party' | 'pickupLocation' | 'dropoffLocation' | 'demandCategory' | 'resourceType' | 'organization' | 'planningWeek'> {
  party: Pick<Party, 'id' | 'name'>
  pickupLocation: Pick<Location, 'id' | 'name' | 'code' | 'region'>
  dropoffLocation: Pick<Location, 'id' | 'name' | 'code' | 'region'>
  demandCategory?: Pick<DemandCategory, 'id' | 'name' | 'code'> | null
  resourceTypes: Pick<ResourceType, 'id' | 'name'>[]
  resourceType?: Pick<ResourceType, 'id' | 'name'> | null // Backward compatibility
  createdBy: { id: string; firstName: string; lastName: string }
}

export default function DemandPlanningPage() {
  const [selectedWeekId, setSelectedWeekId] = useState<string>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingForecast, setEditingForecast] = useState<DemandForecastWithRelations | null>(null)
  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState<{ open: boolean; count: number } | null>(null)
  const [filters, setFilters] = useState<DemandFilters>({
    plannerIds: [],
    clientIds: [],
    categoryIds: [],
    truckTypeIds: [],
  })
  const pageSize = 50

  const { data: weeksData } = usePlanningWeeks()
  const { data: forecastsData, isLoading } = useDemandForecasts(selectedWeekId, page, pageSize, filters)
  const { data: orgSettings } = useOrganizationSettings()
  const deleteMutation = useDeleteDemandForecast()

  // Reset page when week changes (keep filters)
  const handleWeekChange = (weekId: string | undefined) => {
    setSelectedWeekId(weekId)
    setPage(1)
    setSelectedIds(new Set())
  }

  // Reset page when filters change
  const handleFiltersChange = (newFilters: DemandFilters) => {
    setFilters(newFilters)
    setPage(1)
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    setBulkDeleteDialog({ open: true, count: selectedIds.size })
  }

  const handleConfirmBulkDelete = async (deleteAll: boolean) => {
    if (!bulkDeleteDialog) return

    try {
      const deletePromises = Array.from(selectedIds).map(id => deleteMutation.mutateAsync({ id, deleteAll }))
      await Promise.all(deletePromises)
      if (deleteAll) {
        toast.success(`${bulkDeleteDialog.count} forecast(s) deleted for all weeks`)
      } else {
        toast.success(`${bulkDeleteDialog.count} forecast(s) deleted`)
      }
      setSelectedIds(new Set())
    } catch (error) {
      toast.error('Failed to delete some forecasts')
    } finally {
      setBulkDeleteDialog(null)
    }
  }

  const handleDownload = () => {
    if (!forecastsData?.data?.length) return

    const isCategoryEnabled = orgSettings?.demandCategoryEnabled || false
    const categoryLabel = orgSettings?.demandCategoryLabel || 'Category'

    const headers = [
      'Client',
      'Demand Planner',
      'Route',
      'Pickup City',
      'Dropoff City',
      'Region',
      ...(isCategoryEnabled ? [categoryLabel] : []),
      'Truck Type',
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Total'
    ]

    const rows = forecastsData.data.map(f => [
      f.party.name,
      `${f.createdBy.firstName} ${f.createdBy.lastName}`,
      f.routeKey,
      f.pickupLocation.name,
      f.dropoffLocation.name,
      `${f.pickupLocation.region} → ${f.dropoffLocation.region}`,
      ...(isCategoryEnabled ? [f.demandCategory?.name || ''] : []),
      f.resourceTypes?.map(rt => rt.name).join(', ') || f.resourceType?.name || '',
      f.day1Qty,
      f.day2Qty,
      f.day3Qty,
      f.day4Qty,
      f.day5Qty,
      f.day6Qty,
      f.day7Qty,
      f.totalQty
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `demand-forecasts-week-${selectedWeek?.weekNumber || 'unknown'}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Auto-select first (current) week
  useEffect(() => {
    if (weeksData?.data?.length && !selectedWeekId) {
      setSelectedWeekId(weeksData.data[0].id)
    }
  }, [weeksData, selectedWeekId])

  const totalLoads = forecastsData?.data?.reduce((sum, f) => sum + f.totalQty, 0) ?? 0
  const routeCount = new Set(forecastsData?.data?.map(f => f.routeKey)).size
  const selectedWeek = weeksData?.data?.find(w => w.id === selectedWeekId)
  const planningCycle = weeksData?.meta?.planningCycle || 'WEEKLY'
  const periodLabel = planningCycle === 'MONTHLY' ? 'monthly' : 'weekly'

  const handleAddForecast = () => {
    setEditingForecast(null)
    setIsDialogOpen(true)
  }

  const handleEditForecast = (forecast: DemandForecastWithRelations) => {
    setEditingForecast(forecast)
    setIsDialogOpen(true)
  }

  const handleDialogClose = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setEditingForecast(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Demand Planning"
        description={`Forecast ${periodLabel} demand by client and route`}
      >
        <WeekSelector value={selectedWeekId} onValueChange={handleWeekChange} />
        {selectedIds.size > 0 && (
          <Button variant="destructive" onClick={handleBulkDelete}>
            <Trash2 className="h-4 w-4" />
            Delete {selectedIds.size}
          </Button>
        )}
        <Button variant="outline" onClick={handleDownload} disabled={!forecastsData?.data?.length}>
          <Download className="h-4 w-4" />
          Download
        </Button>
        <Button onClick={handleAddForecast} disabled={!selectedWeekId}>
          <Plus className="h-4 w-4" />
          Add Forecast
        </Button>
      </PageHeader>

      {/* Filters */}
      {selectedWeekId && (
        <div className="pt-0 pb-6">
          <DemandFiltersComponent
            planningWeekId={selectedWeekId}
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-6">
        <Card className="py-4">
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <ClipboardList className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Forecasts</p>
              <p className="text-3xl font-bold">{forecastsData?.data?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
              <TruckIcon className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Loads</p>
              <p className="text-3xl font-bold">{totalLoads.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <MapPin className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Routes</p>
              <p className="text-3xl font-bold">{routeCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="py-0">
        <CardContent className="p-0">
          {selectedWeekId ? (
            <DemandTable
              data={forecastsData?.data}
              isLoading={isLoading}
              onEditForecast={handleEditForecast}
              weekStart={selectedWeek?.weekStart}
              planningWeekId={selectedWeekId}
              pagination={forecastsData?.pagination}
              onPageChange={setPage}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Select a planning week to view forecasts</p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedWeekId && (
        <DemandFormDialog
          open={isDialogOpen}
          onOpenChange={handleDialogClose}
          planningWeekId={selectedWeekId}
          forecast={editingForecast}
        />
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialog?.open || false} onOpenChange={(open) => !open && setBulkDeleteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Demand Forecasts</DialogTitle>
            <DialogDescription>
              Delete <strong>{bulkDeleteDialog?.count}</strong> selected forecast(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Would you like to delete these forecasts for the current week only, or for all weeks in this planning cycle?
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setBulkDeleteDialog(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => handleConfirmBulkDelete(false)}>
              Delete Current Week Only
            </Button>
            <Button variant="destructive" onClick={() => handleConfirmBulkDelete(true)}>
              Delete All Weeks
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
