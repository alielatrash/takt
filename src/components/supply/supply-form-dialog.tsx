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

            {targetData && (
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
                        : dynamicRemainingGap < 0
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}>
                      {dynamicRemainingGap}
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
                                  {remaining !== 0 && newCommit > 0 && (
                                    <span className={`text-[10px] font-semibold ${
                                      remaining > 0
                                        ? 'text-red-600'
                                        : 'text-amber-600'
                                    }`}>
                                      {remaining > 0 ? `${remaining} left` : `${Math.abs(remaining)} over`}
                                    </span>
                                  )}
                                  {remaining === 0 && newCommit > 0 && (
                                    <span className="text-[10px] font-semibold text-emerald-600">
                                      ✓
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
                                        : remaining < 0
                                        ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500'
                                        : newCommit > 0
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
                                <div className="flex flex-col items-center justify-end gap-0.5 min-h-[32px]">
                                  <FormLabel className="text-[11px] text-muted-foreground">
                                    {day.label}
                                  </FormLabel>
                                  {remaining !== 0 && newCommit > 0 && (
                                    <span className={`text-[10px] font-bold leading-none ${
                                      remaining > 0
                                        ? 'text-red-600'
                                        : 'text-amber-600'
                                    }`}>
                                      {remaining > 0 ? remaining : Math.abs(remaining)}
                                    </span>
                                  )}
                                  {remaining === 0 && newCommit > 0 && (
                                    <span className="text-[10px] font-bold leading-none text-emerald-600">
                                      ✓
                                    </span>
                                  )}
                                </div>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min="0"
                                    placeholder="0"
                                    className={`text-center h-10 transition-colors ${
                                      remaining > 0
                                        ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                                        : remaining < 0
                                        ? 'border-amber-300 focus:border-amber-500 focus:ring-amber-500'
                                        : newCommit > 0
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

            {!targetData && (
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
