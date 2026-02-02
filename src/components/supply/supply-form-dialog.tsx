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

interface SupplyFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planningWeekId: string
  routeKey: string
}

export function SupplyFormDialog({ open, onOpenChange, planningWeekId, routeKey }: SupplyFormDialogProps) {
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
