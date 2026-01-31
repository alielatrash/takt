'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import type { Supplier } from '@prisma/client'
import { PageHeader } from '@/components/layout'
import { RepositoryTable } from '@/components/repositories/repository-table'
import { EntityFormDialog } from '@/components/repositories/entity-form-dialog'
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
} from '@/hooks/use-repositories'
import { createSupplierSchema } from '@/lib/validations/repositories'
import { useDebounce } from '@/hooks/use-debounce'

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'code', label: 'Code' },
]

const formFields = [
  { name: 'name', label: 'Name', placeholder: 'Enter supplier name (e.g., WLS, MOMENTUM)', required: true },
  { name: 'code', label: 'Code', placeholder: 'Enter short code (optional)' },
]

const defaultValues = { name: '', code: '' }

export default function SuppliersPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Supplier | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const { data, isLoading } = useSuppliers({
    q: debouncedSearch,
    page: currentPage,
    pageSize: 50
  })
  const createMutation = useCreateSupplier()
  const updateMutation = useUpdateSupplier()
  const deleteMutation = useDeleteSupplier()

  const handleAdd = useCallback(() => {
    setEditingItem(null)
    setIsDialogOpen(true)
  }, [])

  const handleEdit = useCallback((item: Supplier) => {
    setEditingItem(item)
    setIsDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (item: Supplier) => {
    if (!confirm(`Are you sure you want to deactivate "${item.name}"?`)) return
    try {
      await deleteMutation.mutateAsync(item.id)
      toast.success('Supplier deactivated successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate supplier')
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
        toast.success('Supplier updated successfully')
      } else {
        await createMutation.mutateAsync(formData)
        toast.success('Supplier created successfully')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred')
      throw error
    }
  }

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Manage fleet partner suppliers"
      />

      <RepositoryTable
        data={data?.data}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search suppliers..."
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        addButtonLabel="Add Supplier"
        pagination={data?.meta}
        onPageChange={handlePageChange}
      />

      <EntityFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingItem ? 'Edit Supplier' : 'Add Supplier'}
        description={editingItem ? 'Update supplier details' : 'Add a new fleet partner supplier'}
        schema={createSupplierSchema}
        fields={formFields}
        defaultValues={editingItem ? { name: editingItem.name, code: editingItem.code || '' } : defaultValues}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        isEdit={!!editingItem}
      />
    </div>
  )
}
