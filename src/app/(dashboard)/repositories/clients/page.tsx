'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import type { Client } from '@prisma/client'
import { PageHeader } from '@/components/layout'
import { RepositoryTable } from '@/components/repositories/repository-table'
import { EntityFormDialog } from '@/components/repositories/entity-form-dialog'
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from '@/hooks/use-repositories'
import { createClientSchema } from '@/lib/validations/repositories'
import { useDebounce } from '@/hooks/use-debounce'

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'code', label: 'Code' },
]

const formFields = [
  { name: 'name', label: 'Name', placeholder: 'Enter client name', required: true },
  { name: 'code', label: 'Code', placeholder: 'Enter short code (optional)' },
]

const defaultValues = { name: '', code: '' }

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Client | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const { data, isLoading } = useClients({
    q: debouncedSearch,
    page: currentPage,
    pageSize: 50
  })
  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()
  const deleteMutation = useDeleteClient()

  const handleAdd = useCallback(() => {
    setEditingItem(null)
    setIsDialogOpen(true)
  }, [])

  const handleEdit = useCallback((item: Client) => {
    setEditingItem(item)
    setIsDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (item: Client) => {
    if (!confirm(`Are you sure you want to deactivate "${item.name}"?`)) return
    try {
      await deleteMutation.mutateAsync(item.id)
      toast.success('Client deactivated successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate client')
    }
  }, [deleteMutation])

  const handleSearch = useCallback((query: string) => {
    setSearch(query)
    setCurrentPage(1) // Reset to first page when searching
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleSubmit = async (formData: { name: string; code?: string }) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, ...formData })
        toast.success('Client updated successfully')
      } else {
        await createMutation.mutateAsync(formData)
        toast.success('Client created successfully')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
      throw error
    }
  }

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Manage your client accounts"
      />

      <RepositoryTable
        data={data?.data}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search clients..."
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        addButtonLabel="Add Client"
        pagination={data?.meta}
        onPageChange={handlePageChange}
      />

      <EntityFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingItem ? 'Edit Client' : 'Add Client'}
        description={editingItem ? 'Update client details' : 'Add a new client to the system'}
        schema={createClientSchema}
        fields={formFields}
        defaultValues={editingItem ? { name: editingItem.name, code: editingItem.code || '' } : defaultValues}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        isEdit={!!editingItem}
      />
    </div>
  )
}
