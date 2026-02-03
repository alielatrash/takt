'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { format, addWeeks } from 'date-fns'
import { Button } from '@/components/ui/button'
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

  // Only fetch suppliers when dialog is open
  const { data: suppliers } = useSuppliers({ isActive: true, pageSize: 100 }, open)
  const { data: planningWeeksData } = usePlanningWeeks()
  const createMutation = useCreateSupplyCommitment()

  const planningCycle = planningWeeksData?.meta?.planningCycle || 'WEEKLY'
  const isMonthlyPlanning = planningCycle === 'MONTHLY'

  // Transform data for combobox
  const supplierOptions = useMemo(() =>
    suppliers?.data?.map((supplier) => ({
      value: supplier.id,
      label: supplier.name,
      description: supplier.uniqueIdentifier || undefined,
    })) ?? [],
    [suppliers]
  )

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

  // Watch form values to calculate resulting gap in real-time
  const formValues = form.watch()

  // Calculate resulting gap after adding this commitment
  const resultingGap = useMemo(() => {
    if (!targetData) return null

    if (isMonthlyPlanning) {
      return {
        week1: targetData.gap.week1 - (formValues.week1Committed || 0),
        week2: targetData.gap.week2 - (formValues.week2Committed || 0),
        week3: targetData.gap.week3 - (formValues.week3Committed || 0),
        week4: targetData.gap.week4 - (formValues.week4Committed || 0),
      }
    } else {
      return {
        day1: targetData.gap.day1 - (formValues.day1Committed || 0),
        day2: targetData.gap.day2 - (formValues.day2Committed || 0),
        day3: targetData.gap.day3 - (formValues.day3Committed || 0),
        day4: targetData.gap.day4 - (formValues.day4Committed || 0),
        day5: targetData.gap.day5 - (formValues.day5Committed || 0),
        day6: targetData.gap.day6 - (formValues.day6Committed || 0),
        day7: targetData.gap.day7 - (formValues.day7Committed || 0),
      }
    }
  }, [targetData, formValues, isMonthlyPlanning])

  const onSubmit = async (data: CreateSupplyCommitmentInput) => {
    try {
      await createMutation.mutateAsync(data)
      toast.success('Supply commitment added successfully')
      form.reset()
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
            Add supplier commitment for route: <strong>{formatCitym(routeKey)}</strong>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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

            {/* Gap Summary */}
            {targetData && (
              <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                <h4 className="text-sm font-semibold mb-2">Target vs Current Supply</h4>
                <div className={`grid gap-1 text-xs ${isMonthlyPlanning ? 'grid-cols-5' : 'grid-cols-8'}`}>
                  <div className="font-medium"></div>
                  {isMonthlyPlanning ? (
                    <>
                      {MONTH_WEEKS.map((week, index) => (
                        <div key={week.key} className="font-medium text-center">{week.label}</div>
                      ))}
                    </>
                  ) : (
                    <>
                      {WEEK_DAYS.map((day) => (
                        <div key={day.key} className="font-medium text-center">{day.label}</div>
                      ))}
                    </>
                  )}
                </div>
                <div className={`grid gap-1 text-xs ${isMonthlyPlanning ? 'grid-cols-5' : 'grid-cols-8'}`}>
                  <div className="text-muted-foreground">Target:</div>
                  {isMonthlyPlanning ? (
                    <>
                      {MONTH_WEEKS.map((week, index) => (
                        <div key={week.key} className="text-center font-medium text-blue-600">
                          {targetData.target[`week${index + 1}` as keyof typeof targetData.target] || 0}
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {WEEK_DAYS.map((day, index) => (
                        <div key={day.key} className="text-center font-medium text-blue-600">
                          {targetData.target[`day${index + 1}` as keyof typeof targetData.target] || 0}
                        </div>
                      ))}
                    </>
                  )}
                </div>
                <div className={`grid gap-1 text-xs ${isMonthlyPlanning ? 'grid-cols-5' : 'grid-cols-8'}`}>
                  <div className="text-muted-foreground">Committed:</div>
                  {isMonthlyPlanning ? (
                    <>
                      {MONTH_WEEKS.map((week, index) => (
                        <div key={week.key} className="text-center text-green-600">
                          {targetData.committed[`week${index + 1}` as keyof typeof targetData.committed] || 0}
                        </div>
                      ))}
                    </>
                  ) : (
                    <>
                      {WEEK_DAYS.map((day, index) => (
                        <div key={day.key} className="text-center text-green-600">
                          {targetData.committed[`day${index + 1}` as keyof typeof targetData.committed] || 0}
                        </div>
                      ))}
                    </>
                  )}
                </div>
                <div className={`grid gap-1 text-xs ${isMonthlyPlanning ? 'grid-cols-5' : 'grid-cols-8'}`}>
                  <div className="text-muted-foreground">Current Gap:</div>
                  {isMonthlyPlanning ? (
                    <>
                      {MONTH_WEEKS.map((week, index) => {
                        const gap = targetData.gap[`week${index + 1}` as keyof typeof targetData.gap] || 0
                        return (
                          <div key={week.key} className={`text-center font-medium ${gap > 0 ? 'text-red-600' : gap < 0 ? 'text-amber-600' : 'text-gray-600'}`}>
                            {gap}
                          </div>
                        )
                      })}
                    </>
                  ) : (
                    <>
                      {WEEK_DAYS.map((day, index) => {
                        const gap = targetData.gap[`day${index + 1}` as keyof typeof targetData.gap] || 0
                        return (
                          <div key={day.key} className={`text-center font-medium ${gap > 0 ? 'text-red-600' : gap < 0 ? 'text-amber-600' : 'text-gray-600'}`}>
                            {gap}
                          </div>
                        )
                      })}
                    </>
                  )}
                </div>
                {resultingGap && (
                  <>
                    <div className="border-t pt-2"></div>
                    <div className={`grid gap-1 text-xs ${isMonthlyPlanning ? 'grid-cols-5' : 'grid-cols-8'}`}>
                      <div className="text-muted-foreground">New Commit:</div>
                      {isMonthlyPlanning ? (
                        <>
                          {MONTH_WEEKS.map((week, index) => {
                            const value = formValues[`week${index + 1}Committed` as keyof typeof formValues] as number || 0
                            return (
                              <div key={week.key} className={`text-center font-medium ${value > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                                {value > 0 ? `+${value}` : '—'}
                              </div>
                            )
                          })}
                        </>
                      ) : (
                        <>
                          {WEEK_DAYS.map((day, index) => {
                            const value = formValues[`day${index + 1}Committed` as keyof typeof formValues] as number || 0
                            return (
                              <div key={day.key} className={`text-center font-medium ${value > 0 ? 'text-green-700' : 'text-gray-400'}`}>
                                {value > 0 ? `+${value}` : '—'}
                              </div>
                            )
                          })}
                        </>
                      )}
                    </div>
                    <div className={`grid gap-1 text-xs ${isMonthlyPlanning ? 'grid-cols-5' : 'grid-cols-8'}`}>
                      <div className="text-muted-foreground font-semibold">Result Gap:</div>
                      {isMonthlyPlanning ? (
                        <>
                          {MONTH_WEEKS.map((week, index) => {
                            const gap = resultingGap[`week${index + 1}` as keyof typeof resultingGap] || 0
                            return (
                              <div key={week.key} className={`text-center font-bold ${gap > 0 ? 'text-red-600' : gap < 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                {gap}
                              </div>
                            )
                          })}
                        </>
                      ) : (
                        <>
                          {WEEK_DAYS.map((day, index) => {
                            const gap = resultingGap[`day${index + 1}` as keyof typeof resultingGap] || 0
                            return (
                              <div key={day.key} className={`text-center font-bold ${gap > 0 ? 'text-red-600' : gap < 0 ? 'text-amber-600' : 'text-green-600'}`}>
                                {gap}
                              </div>
                            )
                          })}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <div>
              <FormLabel>{isMonthlyPlanning ? 'Weekly Committed Supply (Week 1-4)' : 'Daily Committed Supply (Sun-Sat)'}</FormLabel>
              {isMonthlyPlanning ? (
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {MONTH_WEEKS.map((week, index) => (
                    <FormField
                      key={week.key}
                      control={form.control}
                      name={`week${index + 1}Committed` as any}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">
                            {week.label}
                            {weekDateRanges[index] && (
                              <div className="text-[10px]">
                                days {weekDateRanges[index].start}-{weekDateRanges[index].end}
                              </div>
                            )}
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              className="text-center"
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
                <div className="grid grid-cols-7 gap-2 mt-2">
                  {WEEK_DAYS.map((day, index) => (
                    <FormField
                      key={day.key}
                      control={form.control}
                      name={`day${index + 1}Committed` as keyof CreateSupplyCommitmentInput}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs text-muted-foreground">{day.label}</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              className="text-center"
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
