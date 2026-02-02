'use client'

import { useState } from 'react'
import type { Party } from '@prisma/client'
import { toast } from 'sonner'
import { EntityFormDialog } from './entity-form-dialog'
import { createSupplierSchema } from '@/lib/validations/repositories'
import { useCreateSupplier } from '@/hooks/use-repositories'

interface SupplierQuickCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (supplier: Party) => void
}

const supplierFields = [
  { name: 'name', label: 'Supplier Name', placeholder: 'Enter supplier name', required: true },
  { name: 'pointOfContact', label: 'Point of Contact', placeholder: 'Contact person name' },
  { name: 'phoneNumber', label: 'Phone Number', placeholder: 'Contact phone number' },
]

const defaultValues = {
  name: '',
  pointOfContact: '',
  phoneNumber: '',
}

export function SupplierQuickCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: SupplierQuickCreateDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const createSupplier = useCreateSupplier()

  const handleSubmit = async (data: typeof defaultValues) => {
    setIsLoading(true)
    try {
      const supplier = await createSupplier.mutateAsync(data)
      toast.success('Supplier created successfully')
      onSuccess?.(supplier)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create supplier')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add New Supplier"
      description="Create a new supplier to use in your supply commitments"
      schema={createSupplierSchema}
      fields={supplierFields}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    />
  )
}
