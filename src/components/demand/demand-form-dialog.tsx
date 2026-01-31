'use client'

import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
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
import { useClients, useCities, useTruckTypes } from '@/hooks/use-repositories'
import { useCreateDemandForecast, useUpdateDemandForecast } from '@/hooks/use-demand'
import { createDemandForecastSchema, type CreateDemandForecastInput } from '@/lib/validations/demand'
import { WEEK_DAYS } from '@/types'
import type { DemandForecast, Client, City, TruckType } from '@prisma/client'

interface DemandForecastWithRelations extends DemandForecast {
  client: Pick<Client, 'id' | 'name' | 'code'>
  pickupCity: Pick<City, 'id' | 'name' | 'code' | 'region'>
  dropoffCity: Pick<City, 'id' | 'name' | 'code' | 'region'>
  truckType: Pick<TruckType, 'id' | 'name'>
}

interface DemandFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  planningWeekId: string
  forecast?: DemandForecastWithRelations | null
}

export function DemandFormDialog({ open, onOpenChange, planningWeekId, forecast }: DemandFormDialogProps) {
  // Only fetch data when dialog is open (prevents loading too many records on page load)
  const { data: clients } = useClients({ isActive: true, pageSize: 10000 }, open)
  const { data: cities } = useCities({ isActive: true, pageSize: 10000 }, open)
  const { data: truckTypes } = useTruckTypes({ isActive: true, pageSize: 1000 }, open)
  const createMutation = useCreateDemandForecast()
  const updateMutation = useUpdateDemandForecast()

  const isEditMode = !!forecast

  const form = useForm<CreateDemandForecastInput>({
    resolver: zodResolver(createDemandForecastSchema),
    defaultValues: {
      planningWeekId: '',
      clientId: '',
      pickupCityId: '',
      dropoffCityId: '',
      vertical: 'DOMESTIC',
      truckTypeId: '',
      day1Loads: 0,
      day2Loads: 0,
      day3Loads: 0,
      day4Loads: 0,
      day5Loads: 0,
      day6Loads: 0,
      day7Loads: 0,
    },
  })

  // Transform data for comboboxes
  const clientOptions = useMemo(() =>
    clients?.data?.map((client) => ({
      value: client.id,
      label: client.name,
      description: client.code || undefined,
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

  useEffect(() => {
    if (open && planningWeekId) {
      if (forecast) {
        form.reset({
          planningWeekId,
          clientId: forecast.clientId,
          pickupCityId: forecast.pickupCityId,
          dropoffCityId: forecast.dropoffCityId,
          vertical: forecast.vertical as 'DOMESTIC' | 'PORTS',
          truckTypeId: forecast.truckTypeId,
          day1Loads: forecast.day1Loads,
          day2Loads: forecast.day2Loads,
          day3Loads: forecast.day3Loads,
          day4Loads: forecast.day4Loads,
          day5Loads: forecast.day5Loads,
          day6Loads: forecast.day6Loads,
          day7Loads: forecast.day7Loads,
        })
      } else {
        form.reset({
          planningWeekId,
          clientId: '',
          pickupCityId: '',
          dropoffCityId: '',
          vertical: 'DOMESTIC',
          truckTypeId: '',
          day1Loads: 0,
          day2Loads: 0,
          day3Loads: 0,
          day4Loads: 0,
          day5Loads: 0,
          day6Loads: 0,
          day7Loads: 0,
        })
      }
    }
  }, [open, planningWeekId, forecast, form])

  const onSubmit = async (data: CreateDemandForecastInput) => {
    try {
      if (isEditMode && forecast) {
        await updateMutation.mutateAsync({
          id: forecast.id,
          clientId: data.clientId,
          pickupCityId: data.pickupCityId,
          dropoffCityId: data.dropoffCityId,
          vertical: data.vertical,
          truckTypeId: data.truckTypeId,
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vertical"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vertical *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vertical" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="DOMESTIC">Domestic</SelectItem>
                        <SelectItem value="PORTS">Ports</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="truckTypeId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Truck Type *</FormLabel>
                  <FormControl>
                    <Combobox
                      options={truckTypeOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Search truck type..."
                      searchPlaceholder="Type to search..."
                      emptyText="No truck types found."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div>
              <FormLabel>Daily Loads (Sun-Sat)</FormLabel>
              <div className="grid grid-cols-7 gap-2 mt-2">
                {WEEK_DAYS.map((day, index) => (
                  <FormField
                    key={day.key}
                    control={form.control}
                    name={`day${index + 1}Loads` as keyof CreateDemandForecastInput}
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
    </Dialog>
  )
}
