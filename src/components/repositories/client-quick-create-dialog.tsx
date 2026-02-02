'use client'

import { useState } from 'react'
import type { Party } from '@prisma/client'
import { toast } from 'sonner'
import { EntityFormDialog } from './entity-form-dialog'
import { createClientSchema } from '@/lib/validations/repositories'
import { useCreateClient } from '@/hooks/use-repositories'

interface ClientQuickCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (client: Party) => void
}

const clientFields = [
  { name: 'name', label: 'Client Name', placeholder: 'Enter client name', required: true },
  { name: 'pointOfContact', label: 'Point of Contact', placeholder: 'Contact person name' },
  { name: 'phoneNumber', label: 'Phone Number', placeholder: 'Contact phone number' },
]

const defaultValues = {
  name: '',
  pointOfContact: '',
  phoneNumber: '',
}

export function ClientQuickCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: ClientQuickCreateDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const createClient = useCreateClient()

  const handleSubmit = async (data: typeof defaultValues) => {
    setIsLoading(true)
    try {
      const client = await createClient.mutateAsync(data)
      toast.success('Client created successfully')
      onSuccess?.(client)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create client')
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <EntityFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add New Client"
      description="Create a new client to use in your demand forecasts"
      schema={createClientSchema}
      fields={clientFields}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isLoading={isLoading}
    />
  )
}
