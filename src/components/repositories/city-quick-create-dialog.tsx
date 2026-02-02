'use client'

import { useState } from 'react'
import type { Location } from '@prisma/client'
import { toast } from 'sonner'
import { EntityFormDialog } from './entity-form-dialog'
import { createCitySchema } from '@/lib/validations/repositories'
import { useCreateCity } from '@/hooks/use-repositories'

interface CityQuickCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (city: Location) => void
}

const cityFields = [
  { name: 'name', label: 'City Name', placeholder: 'Enter city name', required: true },
  { name: 'nameAr', label: 'Arabic Name', placeholder: 'Enter Arabic name (optional)' },
  { name: 'code', label: 'City Code', placeholder: 'Enter city code (optional)' },
  { name: 'region', label: 'Region', placeholder: 'Enter region (optional)' },
]

const defaultValues = {
  name: '',
  nameAr: '',
  code: '',
  region: '',
}

export function CityQuickCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: CityQuickCreateDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const createCity = useCreateCity()

  const handleSubmit = async (data: typeof defaultValues) => {
    setIsLoading(true)
    try {
      const city = await createCity.mutateAsync(data)
      toast.success('City created successfully')
      onSuccess?.(city)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create city')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add New City"
      description="Create a new city to use in your forecasts"
      schema={createCitySchema}
      fields={cityFields}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    />
  )
}
