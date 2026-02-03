'use client'

import { useState } from 'react'
import type { DemandCategory } from '@prisma/client'
import { toast } from 'sonner'
import { EntityFormDialog } from './entity-form-dialog'
import { createDemandCategorySchema } from '@/lib/validations/repositories'
import { useCreateDemandCategory } from '@/hooks/use-repositories'

interface DemandCategoryQuickCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (category: DemandCategory) => void
  initialName?: string
}

const categoryFields = [
  { name: 'name', label: 'Category Name', placeholder: 'Enter category name', required: true },
  { name: 'code', label: 'Code', placeholder: 'Enter code (optional)' },
]

export function DemandCategoryQuickCreateDialog({
  open,
  onOpenChange,
  onSuccess,
  initialName = '',
}: DemandCategoryQuickCreateDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const createCategory = useCreateDemandCategory()

  const defaultValues = {
    name: initialName,
    code: '',
  }

  const handleSubmit = async (data: typeof defaultValues) => {
    setIsLoading(true)
    try {
      const category = await createCategory.mutateAsync(data)
      toast.success('Category created successfully')
      onSuccess?.(category)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create category')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add New Category"
      description="Create a new category to use in your forecasts"
      schema={createDemandCategorySchema}
      fields={categoryFields}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    />
  )
}
