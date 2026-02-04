'use client'

import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Combobox } from '@/components/ui/combobox'
import { MultiSelectCombobox } from '@/components/ui/multi-select-combobox'
import { useClients, useCities, useTruckTypes, useDemandCategories } from '@/hooks/use-repositories'
import { useCreateDemandForecast, useUpdateDemandForecast, usePlanningWeeks } from '@/hooks/use-demand'
import { useOrganizationSettings } from '@/hooks/use-organization'
import { createDemandForecastSchema, type CreateDemandForecastInput } from '@/lib/validations/demand'
import { WEEK_DAYS } from '@/types'
import type { DemandForecast, Party, Location, ResourceType } from '@prisma/client'
import { format, addWeeks, startOfMonth, addDays, startOfDay, isBefore } from 'date-fns'
import { ClientQuickCreateDialog } from '@/components/repositories/client-quick-create-dialog'
import { CityQuickCreateDialog } from '@/components/repositories/city-quick-create-dialog'
import { TruckTypeQuickCreateDialog } from '@/components/repositories/truck-type-quick-create-dialog'
import { DemandCategoryQuickCreateDialog } from '@/components/repositories/demand-category-quick-create-dialog'

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
  resourceTypes: Pick<ResourceType, 'id' | 'name'>[]
  resourceType?: Pick<ResourceType, 'id' | 'name'> | null // Backward compatibility
}

interface DemandFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planningWeekId: string
  forecast?: DemandForecastWithRelations | null
}

export function DemandFormDialog({ open, onOpenChange, planningWeekId, forecast }: DemandFormDialogProps) {
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false)
  const [isPickupCityDialogOpen, setIsPickupCityDialogOpen] = useState(false)
  const [isDropoffCityDialogOpen, setIsDropoffCityDialogOpen] = useState(false)
  const [isTruckTypeDialogOpen, setIsTruckTypeDialogOpen] = useState(false)
  const [isDemandCategoryDialogOpen, setIsDemandCategoryDialogOpen] = useState(false)

  // Track search queries for auto-populating quick create dialogs
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [pickupCitySearchQuery, setPickupCitySearchQuery] = useState('')
  const [dropoffCitySearchQuery, setDropoffCitySearchQuery] = useState('')
  const [truckTypeSearchQuery, setTruckTypeSearchQuery] = useState('')
  const [demandCategorySearchQuery, setDemandCategorySearchQuery] = useState('')

  // Fetch organization settings to check if category is enabled
  const { data: orgSettings } = useOrganizationSettings()
  const isCategoryEnabled = orgSettings?.demandCategoryEnabled || false
  const isCategoryRequired = orgSettings?.demandCategoryRequired || false
  const categoryLabel = orgSettings?.demandCategoryLabel || 'Category'

  // Only fetch data when dialog is open (prevents loading too many records on page load)
  const { data: clients } = useClients({ isActive: true, pageSize: 10000 }, open)
  const { data: cities } = useCities({ isActive: true, pageSize: 10000 }, open)
  const { data: truckTypes } = useTruckTypes({ isActive: true, pageSize: 1000 }, open)
  const { data: demandCategories } = useDemandCategories({ isActive: true, pageSize: 1000 }, open && isCategoryEnabled)
  const { data: planningWeeksData } = usePlanningWeeks()
  const createMutation = useCreateDemandForecast()
  const updateMutation = useUpdateDemandForecast()

  const planningCycle = planningWeeksData?.meta?.planningCycle || 'WEEKLY'
  const isMonthlyPlanning = planningCycle === 'MONTHLY'
  const isEditMode = !!forecast

  const form = useForm<CreateDemandForecastInput>({
    resolver: zodResolver(createDemandForecastSchema),
    defaultValues: {
      planningWeekId: '',
      clientId: '',
      pickupCityId: '',
      dropoffCityId: '',
      demandCategoryId: '',
      truckTypeIds: [],
      day1Loads: undefined,
      day2Loads: undefined,
      day3Loads: undefined,
      day4Loads: undefined,
      day5Loads: undefined,
      day6Loads: undefined,
      day7Loads: undefined,
      week1Loads: undefined,
      week2Loads: undefined,
      week3Loads: undefined,
      week4Loads: undefined,
    },
  })

  // Transform data for comboboxes
  const clientOptions = useMemo(() =>
    clients?.data?.map((client) => ({
      value: client.id,
      label: client.name,
      // Don't show UUID - it's internal identifier only
    })) ?? [],
    [clients]
  )

  const cityOptions = useMemo(() =>
    cities?.data?.map((city) => ({
      value: city.id,
      label: city.name,
      description: city.region || undefined,
    })) ?? [],
    [cities]
  )

  const truckTypeOptions = useMemo(() =>
    truckTypes?.data?.map((type) => ({
      value: type.id,
      label: type.name,
    })) ?? [],
    [truckTypes]
  )

  const categoryOptions = useMemo(() =>
    demandCategories?.data?.map((category) => ({
      value: category.id,
      label: category.name,
      description: category.code || undefined,
    })) ?? [],
    [demandCategories]
  )

  // Calculate week date ranges for monthly planning
  const weekDateRanges = useMemo(() => {
    if (!isMonthlyPlanning || !planningWeeksData?.data) return []

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

  // Calculate day dates and check if past for weekly planning
  const dayInfo = useMemo(() => {
    if (isMonthlyPlanning || !planningWeeksData?.data) return []

    const selectedWeek = planningWeeksData.data.find(w => w.id === planningWeekId)
    if (!selectedWeek) return []

    const weekStart = startOfDay(new Date(selectedWeek.weekStart))
    const today = startOfDay(new Date())

    return WEEK_DAYS.map((_, index) => {
      const dayDate = addDays(weekStart, index)
      const isPast = isBefore(dayDate, today)

      return {
        date: format(dayDate, 'MMM d'), // e.g., "Feb 1"
        isPast,
      }
    })
  }, [isMonthlyPlanning, planningWeeksData, planningWeekId])

  useEffect(() => {
    if (open && planningWeekId) {
      if (forecast) {
        form.reset({
          planningWeekId,
          clientId: forecast.partyId,
          pickupCityId: forecast.pickupLocationId,
          dropoffCityId: forecast.dropoffLocationId,
          demandCategoryId: forecast.demandCategoryId || '',
          truckTypeIds: forecast.resourceTypes?.map(rt => rt.id) || [],
          day1Loads: forecast.day1Qty,
          day2Loads: forecast.day2Qty,
          day3Loads: forecast.day3Qty,
          day4Loads: forecast.day4Qty,
          day5Loads: forecast.day5Qty,
          day6Loads: forecast.day6Qty,
          day7Loads: forecast.day7Qty,
          week1Loads: forecast.week1Qty,
          week2Loads: forecast.week2Qty,
          week3Loads: forecast.week3Qty,
          week4Loads: forecast.week4Qty,
        })
      } else {
        form.reset({
          planningWeekId,
          clientId: '',
          pickupCityId: '',
          dropoffCityId: '',
          demandCategoryId: '',
          truckTypeIds: [],
          day1Loads: undefined,
          day2Loads: undefined,
          day3Loads: undefined,
          day4Loads: undefined,
          day5Loads: undefined,
          day6Loads: undefined,
          day7Loads: undefined,
          week1Loads: undefined,
          week2Loads: undefined,
          week3Loads: undefined,
          week4Loads: undefined,
        })
      }
    }
  }, [open, planningWeekId, forecast, form])

  const onSubmit = async (data: CreateDemandForecastInput) => {
    try {
      if (isEditMode && forecast) {
        // When editing, update the forecast with all selected truck types
        await updateMutation.mutateAsync({
          id: forecast.id,
          clientId: data.clientId,
          pickupCityId: data.pickupCityId,
          dropoffCityId: data.dropoffCityId,
          demandCategoryId: data.demandCategoryId,
          truckTypeIds: data.truckTypeIds,
          day1Loads: data.day1Loads,
          day2Loads: data.day2Loads,
          day3Loads: data.day3Loads,
          day4Loads: data.day4Loads,
          day5Loads: data.day5Loads,
          day6Loads: data.day6Loads,
          day7Loads: data.day7Loads,
        })
        toast.success('Demand forecast updated successfully')
      } else {
        // Create a single forecast with all selected truck types
        await createMutation.mutateAsync(data)
        toast.success('Demand forecast created successfully')
      }
      form.reset()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${isEditMode ? 'update' : 'create'} forecast`)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Demand Forecast' : 'Add Demand Forecast'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the demand forecast details' : 'Add a new demand forecast for a client and route'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="clientId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Client *</FormLabel>
                    <FormControl>
                      <Combobox
                        options={clientOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Search client..."
                        searchPlaceholder="Type to search..."
                        emptyText="No clients found."
                        onSearchChange={setClientSearchQuery}
                        footerAction={
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs"
                            onClick={() => setIsClientDialogOpen(true)}
                          >
                            <Plus className="mr-2 h-3 w-3" />
                            Add new client
                          </Button>
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isCategoryEnabled && (
                <FormField
                  control={form.control}
                  name="demandCategoryId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>
                        {categoryLabel} {isCategoryRequired && '*'}
                      </FormLabel>
                      <FormControl>
                        <Combobox
                          options={categoryOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder={`Search ${categoryLabel.toLowerCase()}...`}
                          searchPlaceholder="Type to search..."
                          emptyText={`No ${categoryLabel.toLowerCase()}s found.`}
                          onSearchChange={setDemandCategorySearchQuery}
                          footerAction={
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs"
                              onClick={() => setIsDemandCategoryDialogOpen(true)}
                            >
                              <Plus className="mr-2 h-3 w-3" />
                              Add new {categoryLabel.toLowerCase()}
                            </Button>
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pickupCityId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Pickup City *</FormLabel>
                    <FormControl>
                      <Combobox
                        options={cityOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Search city..."
                        searchPlaceholder="Type to search..."
                        emptyText="No cities found."
                        onSearchChange={setPickupCitySearchQuery}
                        footerAction={
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs"
                            onClick={() => setIsPickupCityDialogOpen(true)}
                          >
                            <Plus className="mr-2 h-3 w-3" />
                            Add new city
                          </Button>
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dropoffCityId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Dropoff City *</FormLabel>
                    <FormControl>
                      <Combobox
                        options={cityOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder="Search city..."
                        searchPlaceholder="Type to search..."
                        emptyText="No cities found."
                        onSearchChange={setDropoffCitySearchQuery}
                        footerAction={
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start text-xs"
                            onClick={() => setIsDropoffCityDialogOpen(true)}
                          >
                            <Plus className="mr-2 h-3 w-3" />
                            Add new city
                          </Button>
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="truckTypeIds"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Truck Type(s) *</FormLabel>
                  <FormControl>
                    <MultiSelectCombobox
                      options={truckTypeOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select truck type(s)..."
                      searchPlaceholder="Type to search..."
                      emptyText="No truck types found."
                      onSearchChange={setTruckTypeSearchQuery}
                      footerAction={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start text-xs"
                          onClick={() => setIsTruckTypeDialogOpen(true)}
                        >
                          <Plus className="mr-2 h-3 w-3" />
                          Add new truck type
                        </Button>
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>{isMonthlyPlanning ? 'Weekly Loads (Week 1-4)' : 'Daily Loads (Sun-Sat)'}</FormLabel>
              {isMonthlyPlanning ? (
                // Monthly planning: Show week inputs
                <div className="grid grid-cols-4 gap-2 mt-2">
                  {MONTH_WEEKS.map((week, index) => (
                    <FormField
                      key={week.key}
                      control={form.control}
                      name={`week${index + 1}Loads` as any}
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
                // Weekly planning: Show day inputs
                <div className="grid grid-cols-7 gap-2 mt-2">
                  {WEEK_DAYS.map((day, index) => {
                    const dayData = dayInfo[index]
                    const isPast = dayData?.isPast || false

                    return (
                      <FormField
                        key={day.key}
                        control={form.control}
                        name={`day${index + 1}Loads` as keyof CreateDemandForecastInput}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={`text-xs ${isPast ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                              {day.label}
                              {dayData && (
                                <div className="text-[10px] font-normal">
                                  {dayData.date}
                                </div>
                              )}
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder=""
                                disabled={isPast}
                                className={`text-center ${isPast ? 'bg-muted cursor-not-allowed' : ''}`}
                                {...field}
                                value={field.value ?? ''}
                                onChange={(e) => {
                                  const value = e.target.value
                                  field.onChange(value === '' ? undefined : parseInt(value) || 0)
                                }}
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Update Forecast' : 'Create Forecast'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      <ClientQuickCreateDialog
        open={isClientDialogOpen}
        onOpenChange={setIsClientDialogOpen}
        initialName={clientSearchQuery}
        onSuccess={(client) => {
          form.setValue('clientId', client.id)
          toast.success(`Client "${client.name}" selected`)
        }}
      />

      <CityQuickCreateDialog
        open={isPickupCityDialogOpen}
        onOpenChange={setIsPickupCityDialogOpen}
        initialName={pickupCitySearchQuery}
        onSuccess={(city) => {
          form.setValue('pickupCityId', city.id)
          toast.success(`City "${city.name}" selected for pickup`)
        }}
      />

      <CityQuickCreateDialog
        open={isDropoffCityDialogOpen}
        onOpenChange={setIsDropoffCityDialogOpen}
        initialName={dropoffCitySearchQuery}
        onSuccess={(city) => {
          form.setValue('dropoffCityId', city.id)
          toast.success(`City "${city.name}" selected for dropoff`)
        }}
      />

      <TruckTypeQuickCreateDialog
        open={isTruckTypeDialogOpen}
        onOpenChange={setIsTruckTypeDialogOpen}
        initialName={truckTypeSearchQuery}
        onSuccess={(truckType) => {
          const currentIds = form.getValues('truckTypeIds')
          form.setValue('truckTypeIds', [...currentIds, truckType.id])
          toast.success(`Truck type "${truckType.name}" added`)
        }}
      />

      <DemandCategoryQuickCreateDialog
        open={isDemandCategoryDialogOpen}
        onOpenChange={setIsDemandCategoryDialogOpen}
        initialName={demandCategorySearchQuery}
        onSuccess={(category) => {
          form.setValue('demandCategoryId', category.id)
          toast.success(`${categoryLabel} "${category.name}" selected`)
        }}
      />
    </Dialog>
  )
}
