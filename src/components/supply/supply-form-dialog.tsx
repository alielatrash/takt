'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { format, addWeeks } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Combobox } from '@/components/ui/combobox'
import { useSuppliers } from '@/hooks/use-repositories'
import { useCreateSupplyCommitment } from '@/hooks/use-supply'
import { usePlanningWeeks } from '@/hooks/use-demand'
import { createSupplyCommitmentSchema, type CreateSupplyCommitmentInput } from '@/lib/validations/supply'
import { WEEK_DAYS } from '@/types'
import { formatCitym } from '@/lib/citym'
import { SupplierQuickCreateDialog } from '@/components/repositories/supplier-quick-create-dialog'

const MONTH_WEEKS = [
  { key: 'week1', label: 'Week 1' },
  { key: 'week2', label: 'Week 2' },
  { key: 'week3', label: 'Week 3' },
  { key: 'week4', label: 'Week 4' },
]

interface SupplyTarget {
  routeKey: string
  target: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; week1: number; week2: number; week3: number; week4: number; total: number }
  committed: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; week1: number; week2: number; week3: number; week4: number; total: number }
  gap: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; week1: number; week2: number; week3: number; week4: number; total: number }
}

interface SupplyFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planningWeekId: string
  routeKey: string
  targetData?: SupplyTarget
}

export function SupplyFormDialog({ open, onOpenChange, planningWeekId, routeKey, targetData }: SupplyFormDialogProps) {
  const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false)
  const [supplierSearch, setSupplierSearch] = useState('')
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0)
  const [weekCommitmentsData, setWeekCommitmentsData] = useState<Record<string, any>>({})
  const [existingCommitments, setExistingCommitments] = useState<Set<string>>(new Set())

  // Fetch suppliers with server-side search
  const { data: suppliers } = useSuppliers({
    isActive: true,
    pageSize: 50,
    q: supplierSearch || undefined
  }, open)
  const { data: planningWeeksData } = usePlanningWeeks()
  const createMutation = useCreateSupplyCommitment()

  const planningCycle = planningWeeksData?.meta?.planningCycle || 'WEEKLY'
  const isMonthlyPlanning = planningCycle === 'MONTHLY'

  // Calculate available weeks for multi-week commitments (up to 4 weeks)
  const availableWeeks = useMemo(() => {
    if (!planningWeeksData?.data) return []
    const currentWeekIdx = planningWeeksData.data.findIndex(w => w.id === planningWeekId)
    if (currentWeekIdx === -1) return []
    return planningWeeksData.data.slice(currentWeekIdx, currentWeekIdx + 4)
  }, [planningWeeksData, planningWeekId])

  const currentWeek = availableWeeks[currentWeekIndex]

  // Transform data for combobox (don't show UUID)
  const supplierOptions = useMemo(() =>
    suppliers?.data?.map((supplier) => ({
      value: supplier.id,
      label: supplier.name,
      description: undefined, // Don't show UUID
    })) ?? [],
    [suppliers]
  )

  // Save current week data before switching
  const saveCurrentWeekData = () => {
    if (!currentWeek) return
    const formData = form.getValues()
    setWeekCommitmentsData(prev => ({
      ...prev,
      [currentWeek.id]: {
        supplierId: formData.supplierId,
        day1Committed: formData.day1Committed,
        day2Committed: formData.day2Committed,
        day3Committed: formData.day3Committed,
        day4Committed: formData.day4Committed,
        day5Committed: formData.day5Committed,
        day6Committed: formData.day6Committed,
        day7Committed: formData.day7Committed,
      }
    }))
  }

  // Load week data when switching
  const loadWeekData = (weekId: string) => {
    const weekData = weekCommitmentsData[weekId]
    if (weekData) {
      form.reset({
        planningWeekId: weekId,
        supplierId: weekData.supplierId || '',
        routeKey,
        day1Committed: weekData.day1Committed || 0,
        day2Committed: weekData.day2Committed || 0,
        day3Committed: weekData.day3Committed || 0,
        day4Committed: weekData.day4Committed || 0,
        day5Committed: weekData.day5Committed || 0,
        day6Committed: weekData.day6Committed || 0,
        day7Committed: weekData.day7Committed || 0,
        week1Committed: 0,
        week2Committed: 0,
        week3Committed: 0,
        week4Committed: 0,
      })
    } else {
      form.reset({
        planningWeekId: weekId,
        supplierId: '',
        routeKey,
        day1Committed: 0,
        day2Committed: 0,
        day3Committed: 0,
        day4Committed: 0,
        day5Committed: 0,
        day6Committed: 0,
        day7Committed: 0,
        week1Committed: 0,
        week2Committed: 0,
        week3Committed: 0,
        week4Committed: 0,
      })
    }
  }

  // Handle week change
  const handleWeekChange = (newIndex: number) => {
    saveCurrentWeekData()
    setCurrentWeekIndex(newIndex)
    if (availableWeeks[newIndex]) {
      loadWeekData(availableWeeks[newIndex].id)
    }
  }

  const form = useForm<CreateSupplyCommitmentInput>({
    resolver: zodResolver(createSupplyCommitmentSchema),
    defaultValues: {
      planningWeekId: '',
      supplierId: '',
      routeKey: '',
      day1Committed: 0,
      day2Committed: 0,
      day3Committed: 0,
      day4Committed: 0,
      day5Committed: 0,
      day6Committed: 0,
      day7Committed: 0,
      week1Committed: 0,
      week2Committed: 0,
      week3Committed: 0,
      week4Committed: 0,
    },
  })

  useEffect(() => {
    if (open && planningWeekId && routeKey) {
      // Reset to first week
      setCurrentWeekIndex(0)
      setWeekCommitmentsData({})
      setExistingCommitments(new Set())

      form.reset({
        planningWeekId,
        supplierId: '',
        routeKey,
        day1Committed: 0,
        day2Committed: 0,
        day3Committed: 0,
        day4Committed: 0,
        day5Committed: 0,
        day6Committed: 0,
        day7Committed: 0,
        week1Committed: 0,
        week2Committed: 0,
        week3Committed: 0,
        week4Committed: 0,
      })
    }
  }, [open, planningWeekId, routeKey, form])

  // Watch form values for real-time feedback
  const formValues = form.watch()

  // Calculate dynamic remaining gap
  const dynamicRemainingGap = useMemo(() => {
    if (!targetData) return 0

    if (isMonthlyPlanning) {
      const total = [1, 2, 3, 4].reduce((sum, i) => {
        const gap = targetData.gap[`week${i}` as keyof typeof targetData.gap] || 0
        const commit = formValues[`week${i}Committed` as keyof typeof formValues] as number || 0
        return sum + (gap - commit)
      }, 0)
      return total
    } else {
      const total = [1, 2, 3, 4, 5, 6, 7].reduce((sum, i) => {
        const gap = targetData.gap[`day${i}` as keyof typeof targetData.gap] || 0
        const commit = formValues[`day${i}Committed` as keyof typeof formValues] as number || 0
        return sum + (gap - commit)
      }, 0)
      return total
    }
  }, [targetData, formValues, isMonthlyPlanning])

  const onSubmit = async (data: CreateSupplyCommitmentInput) => {
    try {
      // Save current week data first
      saveCurrentWeekData()

      // Combine all week data
      const allWeekData = {
        ...weekCommitmentsData,
        [currentWeek.id]: {
          supplierId: data.supplierId,
          day1Committed: data.day1Committed,
          day2Committed: data.day2Committed,
          day3Committed: data.day3Committed,
          day4Committed: data.day4Committed,
          day5Committed: data.day5Committed,
          day6Committed: data.day6Committed,
          day7Committed: data.day7Committed,
        }
      }

      // Filter weeks that have data (only check daily commitment fields)
      const weeksToCreate = availableWeeks.filter(week => {
        const weekData = allWeekData[week.id]
        if (!weekData || !weekData.supplierId) return false

        const hasData = Object.entries(weekData).some(([key, val]) => {
          if (key === 'supplierId') return false
          if (!key.startsWith('day')) return false
          const numVal = typeof val === 'number' ? val : 0
          return val !== undefined && val !== null && numVal > 0
        })
        return hasData
      })

      if (weeksToCreate.length === 0) {
        toast.error('Please add commitment values for at least one week')
        return
      }

      // Create commitments for all weeks with data
      await Promise.all(
        weeksToCreate.map(week => {
          const weekData = allWeekData[week.id]
          return createMutation.mutateAsync({
            planningWeekId: week.id,
            supplierId: weekData.supplierId,
            routeKey,
            day1Committed: weekData.day1Committed || 0,
            day2Committed: weekData.day2Committed || 0,
            day3Committed: weekData.day3Committed || 0,
            day4Committed: weekData.day4Committed || 0,
            day5Committed: weekData.day5Committed || 0,
            day6Committed: weekData.day6Committed || 0,
            day7Committed: weekData.day7Committed || 0,
          })
        })
      )

      toast.success(
        weeksToCreate.length === 1
          ? 'Supply commitment added successfully'
          : `Supply commitments added for ${weeksToCreate.length} weeks`
      )
      form.reset()
      setWeekCommitmentsData({})
      setCurrentWeekIndex(0)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add commitment')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Supply Commitment</DialogTitle>
          <DialogDescription>
            Add supplier commitments for multiple weeks using the same route and supplier
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Week Tabs */}
            {availableWeeks.length > 1 && (
              <Tabs value={currentWeekIndex.toString()} onValueChange={(val) => handleWeekChange(parseInt(val))}>
                <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${availableWeeks.length}, 1fr)` }}>
                  {availableWeeks.map((week, index) => {
                    const hasCommitment = weekCommitmentsData[week.id]?.supplierId &&
                      Object.entries(weekCommitmentsData[week.id] || {}).some(([key, val]) => {
                        if (key === 'supplierId') return false
                        if (!key.startsWith('day')) return false
                        const numVal = typeof val === 'number' ? val : 0
                        return val !== undefined && val !== null && numVal > 0
                      })

                    return (
                      <TabsTrigger key={week.id} value={index.toString()} className="relative">
                        <div className="flex items-center gap-1.5">
                          <span>Week {week.weekNumber}</span>
                          {hasCommitment && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {format(new Date(week.weekStart), 'MMM d')}
                        </div>
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </Tabs>
            )}

            {/* Current Week Info */}
            {currentWeek && (
              <div className="px-3 py-2 rounded-md bg-muted/50 text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">Route:</span>
                  <span className="text-muted-foreground">{formatCitym(routeKey)}</span>
                </div>
                {availableWeeks.length > 1 && (
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="font-medium">Week:</span>
                    <span className="text-muted-foreground">
                      {format(new Date(currentWeek.weekStart), 'MMM d')} - {format(addWeeks(new Date(currentWeek.weekStart), 1), 'MMM d, yyyy')}
                    </span>
                  </div>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Supplier *</FormLabel>
                  <FormControl>
                    <Combobox
                      options={supplierOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      onSearchChange={setSupplierSearch}
                      serverSideSearch={true}
                      placeholder="Search supplier..."
                      searchPlaceholder="Type to search..."
                      emptyText="No suppliers found."
                      footerAction={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => setIsSupplierDialogOpen(true)}
                        >
                          <Plus className="mr-2 h-3 w-3" />
                          Add new supplier
                        </Button>
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {targetData && currentWeekIndex === 0 && (
              <div className="space-y-3">
                {/* Summary Bar */}
                <div className="flex items-center gap-6 px-3 py-2 rounded-lg bg-muted/30 text-sm">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-muted-foreground text-xs">Target</span>
                    <span className="font-semibold">{targetData.target.total}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-muted-foreground text-xs">Current</span>
                    <span className="font-semibold text-emerald-600">{targetData.committed.total}</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-muted-foreground text-xs">Gap</span>
                    <span className={`font-bold ${
                      dynamicRemainingGap > 0
                        ? 'text-red-600'
                        : 'text-emerald-600'
                    }`}>
                      {dynamicRemainingGap > 0 ? dynamicRemainingGap : dynamicRemainingGap < 0 ? `+${Math.abs(dynamicRemainingGap)}` : dynamicRemainingGap}
                    </span>
                  </div>
                </div>

                {/* Commitment Inputs */}
                <div>
                  <FormLabel className="text-sm mb-2 block">
                    {isMonthlyPlanning ? 'Weekly Commitment' : 'Daily Commitment'}
                  </FormLabel>
                  {isMonthlyPlanning ? (
                    <div className="grid grid-cols-4 gap-3">
                      {MONTH_WEEKS.map((week, index) => {
                        const gap = targetData.gap[`week${index + 1}` as keyof typeof targetData.gap] || 0
                        const newCommit = formValues[`week${index + 1}Committed` as keyof typeof formValues] as number || 0
                        const remaining = gap - newCommit

                        return (
                          <FormField
                            key={week.key}
                            control={form.control}
                            name={`week${index + 1}Committed` as any}
                            render={({ field }) => (
                              <FormItem className="space-y-1.5">
                                <div className="flex items-baseline justify-between min-h-[18px]">
                                  <FormLabel className="text-xs text-muted-foreground">
                                    {week.label}
                                  </FormLabel>
                                  {remaining > 0 && newCommit > 0 && (
                                    <span className="text-[10px] font-semibold text-red-600">
                                      {remaining} left
                                    </span>
                                  )}
                                  {remaining === 0 && newCommit > 0 && (
                                    <span className="text-[10px] font-semibold text-emerald-600">
                                      ✓
                                    </span>
                                  )}
                                  {remaining < 0 && (
                                    <span className="text-[10px] font-semibold text-emerald-600">
                                      +{Math.abs(remaining)} over
                                    </span>
                                  )}
                                </div>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className={`text-center h-11 text-base transition-colors ${
                                      remaining > 0
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                        : (remaining <= 0 && newCommit > 0)
                                        ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500'
                                        : ''
                                    }`}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                                {gap > 0 && (
                                  <div className="text-center text-[10px] text-muted-foreground">
                                    need {gap}
                                  </div>
                                )}
                              </FormItem>
                            )}
                          />
                        )
                      })}
                    </div>
                  ) : (
                    <div className="grid grid-cols-7 gap-2">
                      {WEEK_DAYS.map((day, index) => {
                        const gap = targetData.gap[`day${index + 1}` as keyof typeof targetData.gap] || 0
                        const newCommit = formValues[`day${index + 1}Committed` as keyof typeof formValues] as number || 0
                        const remaining = gap - newCommit

                        return (
                          <FormField
                            key={day.key}
                            control={form.control}
                            name={`day${index + 1}Committed` as keyof CreateSupplyCommitmentInput}
                            render={({ field }) => (
                              <FormItem className="space-y-1">
                                <div className="flex flex-col items-center">
                                  <FormLabel className="text-[11px] text-muted-foreground">
                                    {day.label}
                                  </FormLabel>
                                  <div className="h-[14px] flex items-center justify-center">
                                    {remaining > 0 && (
                                      <span className="text-[10px] font-bold leading-none text-red-600">
                                        {remaining}
                                      </span>
                                    )}
                                    {remaining === 0 && gap > 0 && (
                                      <span className="text-[10px] font-bold leading-none text-emerald-600">
                                        ✓
                                      </span>
                                    )}
                                    {remaining < 0 && (
                                      <span className="text-[10px] font-bold leading-none text-emerald-600">
                                        +{Math.abs(remaining)}
                                      </span>
                                    )}
                                    {remaining === 0 && gap === 0 && (
                                      <span className="text-[10px] font-bold leading-none invisible">0</span>
                                    )}
                                  </div>
                                </div>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className={`text-center h-10 transition-colors ${
                                      remaining > 0
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                        : (remaining <= 0 && newCommit > 0)
                                        ? 'border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500'
                                        : ''
                                    }`}
                                    {...field}
                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(!targetData || currentWeekIndex > 0) && (
              <div>
                <FormLabel className="text-sm mb-2 block">
                  {isMonthlyPlanning ? 'Weekly Commitment' : 'Daily Commitment'}
                </FormLabel>
                {isMonthlyPlanning ? (
                  <div className="grid grid-cols-4 gap-3">
                    {MONTH_WEEKS.map((week, index) => (
                      <FormField
                        key={week.key}
                        control={form.control}
                        name={`week${index + 1}Committed` as any}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs text-muted-foreground">
                              {week.label}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                className="text-center h-11"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-2">
                    {WEEK_DAYS.map((day, index) => (
                      <FormField
                        key={day.key}
                        control={form.control}
                        name={`day${index + 1}Committed` as keyof CreateSupplyCommitmentInput}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-[11px] text-muted-foreground text-center block">
                              {day.label}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                className="text-center h-10"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Commitment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      <SupplierQuickCreateDialog
        open={isSupplierDialogOpen}
        onOpenChange={setIsSupplierDialogOpen}
        onSuccess={(supplier) => {
          form.setValue('supplierId', supplier.id)
          toast.success(`Supplier "${supplier.name}" selected`)
        }}
      />
    </Dialog>
  )
}
