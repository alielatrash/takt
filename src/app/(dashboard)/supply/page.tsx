'use client'

import { useState, useEffect } from 'react'
import { Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout'
import { WeekSelector } from '@/components/demand/week-selector'
import { SupplyTable } from '@/components/supply/supply-table'
import { SupplyFormDialog } from '@/components/supply/supply-form-dialog'
import { usePlanningWeeks } from '@/hooks/use-demand'
import { useSupplyTargets } from '@/hooks/use-supply'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'

export default function SupplyPlanningPage() {
  const [selectedWeekId, setSelectedWeekId] = useState<string>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCitym, setSelectedCitym] = useState<string>('')
  const [isCleaningUp, setIsCleaningUp] = useState(false)

  const queryClient = useQueryClient()
  const { data: authData } = useAuth()
  const { data: weeksData } = usePlanningWeeks()
  const { data: targetsData, isLoading } = useSupplyTargets(selectedWeekId)

  const isAdmin = authData?.user?.role === 'ADMIN'

  // Auto-select first (current) week
  useEffect(() => {
    if (weeksData?.data?.length && !selectedWeekId) {
      setSelectedWeekId(weeksData.data[0].id)
    }
  }, [weeksData, selectedWeekId])

  const handleAddCommitment = (routeKey: string) => {
    setSelectedCitym(routeKey)
    setIsDialogOpen(true)
  }

  const handleDownload = () => {
    if (!targetsData?.data?.length) return

    const headers = [
      'Route (CITYm)',
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

  const handleCleanupOrphaned = async () => {
    if (!selectedWeekId) return
    if (!confirm('This will remove supply commitments that have no corresponding demand forecasts. Continue?')) return

    setIsCleaningUp(true)
    try {
      const response = await fetch('/api/admin/cleanup-supply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planningWeekId: selectedWeekId }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success(result.data.message)
        queryClient.invalidateQueries({ queryKey: ['supplyTargets'] })
        queryClient.invalidateQueries({ queryKey: ['dispatchSheet'] })
      } else {
        toast.error(result.error?.message || 'Failed to cleanup')
      }
    } catch (error) {
      toast.error('Failed to cleanup orphaned supply commitments')
    } finally {
      setIsCleaningUp(false)
    }
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
        description="Manage supplier commitments by route (CITYm)"
      >
        <WeekSelector value={selectedWeekId} onValueChange={setSelectedWeekId} />
        {isAdmin && (
          <Button
            variant="outline"
            onClick={handleCleanupOrphaned}
            disabled={!selectedWeekId || isCleaningUp}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            {isCleaningUp ? 'Cleaning...' : 'Cleanup Orphaned'}
          </Button>
        )}
        <Button variant="outline" onClick={handleDownload} disabled={!targetsData?.data?.length}>
          <Download className="h-4 w-4" />
          Download
        </Button>
      </PageHeader>

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
        <SupplyTable
          data={targetsData?.data}
          isLoading={isLoading}
          onAddCommitment={handleAddCommitment}
        />
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
        />
      )}
    </div>
  )
}
