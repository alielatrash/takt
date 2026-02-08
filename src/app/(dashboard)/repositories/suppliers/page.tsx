'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import type { Party } from '@prisma/client'
import { PageHeader } from '@/components/layout'
import { RepositoryTable } from '@/components/repositories/repository-table'
import { EntityFormDialog } from '@/components/repositories/entity-form-dialog'
import { CsvUploadDialog } from '@/components/csv-upload-dialog'
import { CsvUrlImportDialog } from '@/components/csv-url-import-dialog'
import { BulkDeleteConfirmationDialog } from '@/components/repositories/bulk-delete-confirmation-dialog'
import { Button } from '@/components/ui/button'
import { Upload, Link2 } from 'lucide-react'
import {
  useSuppliers,
  useCreateSupplier,
  useUpdateSupplier,
  useDeleteSupplier,
  useTruckTypes,
} from '@/hooks/use-repositories'
import { createSupplierSchema, type CreateSupplierInput } from '@/lib/validations/repositories'
import { useDebounce } from '@/hooks/use-debounce'
import { useAuth } from '@/hooks/use-auth'

const columns = [
  { key: 'uniqueIdentifier', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'pointOfContact', label: 'Point of Contact' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone Number' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'capacityType', label: 'Capacity Type' },
]

const defaultValues = { name: '', pointOfContact: '', email: '', phoneNumber: '', capacity: '', capacityType: '' }

export default function SuppliersPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false)
  const [isCsvUrlDialogOpen, setIsCsvUrlDialogOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [confirmDialogData, setConfirmDialogData] = useState<{
    items: Party[]
    itemsWithDependencies: number
    totalDependencies: number
    onProgress?: (current: number, total: number, timeRemaining?: string) => void
  } | null>(null)
  const [editingItem, setEditingItem] = useState<Party | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const { data: authData } = useAuth()
  const isAdmin = authData?.user?.role === 'ADMIN'

  const { data, isLoading } = useSuppliers({
    q: debouncedSearch,
    page: currentPage,
    pageSize: 50
  })
  const { data: truckTypesData, isLoading: isLoadingTruckTypes } = useTruckTypes({ pageSize: 1000 })
  const createMutation = useCreateSupplier()
  const updateMutation = useUpdateSupplier()
  const deleteMutation = useDeleteSupplier()

  // Convert truck types to select options
  const truckTypeOptions = truckTypesData?.data?.map((truckType) => ({
    value: truckType.name,
    label: truckType.name,
  })) || []

  const formFields = [
    { name: 'name', label: 'Name', placeholder: 'Enter supplier name (e.g., WLS, MOMENTUM)', required: true },
    { name: 'pointOfContact', label: 'Point of Contact', placeholder: 'Enter contact person name (optional)' },
    { name: 'email', label: 'Email', placeholder: 'Enter contact email (optional)', type: 'email' as const },
    { name: 'phoneNumber', label: 'Phone Number', placeholder: 'Enter contact phone (optional)', type: 'phone' as const },
    { name: 'capacity', label: 'Capacity', type: 'number' as const, placeholder: 'Enter total capacity (e.g., 100 trucks)' },
    { name: 'capacityType', label: 'Capacity Type', type: 'select' as const, placeholder: 'Select truck type', options: truckTypeOptions, isLoadingOptions: isLoadingTruckTypes },
  ]

  const handleAdd = useCallback(() => {
    setEditingItem(null)
    setIsDialogOpen(true)
  }, [])

  const handleEdit = useCallback((item: Party) => {
    setEditingItem(item)
    setIsDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (item: Party) => {
    if (!confirm(`Are you sure you want to deactivate "${item.name}"?`)) return
    try {
      await deleteMutation.mutateAsync(item.id)
      toast.success('Supplier deactivated successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate supplier')
    }
  }, [deleteMutation])

  const handleBulkDelete = useCallback(async (items: Party[], onProgress?: (current: number, total: number, timeRemaining?: string) => void) => {
    const total = items.length
    console.log('[handleBulkDelete] Starting bulk delete for', total, 'items')

    try {
      // Step 1: Check all dependencies in batch
      const checkRes = await fetch('/api/suppliers/check-dependencies-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierIds: items.map((item) => item.id) }),
      })
      const checkData = await checkRes.json()

      if (!checkData.success) {
        toast.error('Failed to check dependencies')
        return
      }

      console.log('[handleBulkDelete] Dependency check completed:', checkData.data)

      // Build a map of supplierId -> dependency info
      const dependencyMap = new Map<string, { hasActiveDependencies: boolean; activeCommitmentCount: number }>()
      checkData.data.forEach((result: any) => {
        dependencyMap.set(result.supplierId, {
          hasActiveDependencies: result.hasActiveDependencies,
          activeCommitmentCount: result.activeCommitmentCount,
        })
      })

      // Count items with dependencies
      const itemsWithDependencies = items.filter(
        (item) => dependencyMap.get(item.id)?.hasActiveDependencies
      )

      // Step 2: Show confirmation dialog if there are dependencies
      let shouldSkipDependencies = false
      let shouldCancel = false

      if (itemsWithDependencies.length > 0) {
        const totalDependencies = itemsWithDependencies.reduce(
          (sum, item) => sum + (dependencyMap.get(item.id)?.activeCommitmentCount || 0),
          0
        )

        console.log('[handleBulkDelete]', itemsWithDependencies.length, 'items have dependencies (', totalDependencies, 'commitments total)')

        // Show custom confirmation dialog
        const userAction = await new Promise<'delete-all' | 'skip-dependencies' | 'cancel'>((resolve) => {
          setConfirmDialogData({
            items,
            itemsWithDependencies: itemsWithDependencies.length,
            totalDependencies,
            onProgress,
          })
          setIsConfirmDialogOpen(true)

          // Store resolver in window temporarily
          ;(window as any).__bulkDeleteResolver = resolve
        })

        console.log('[handleBulkDelete] User chose:', userAction)

        if (userAction === 'cancel') {
          shouldCancel = true
        } else if (userAction === 'skip-dependencies') {
          shouldSkipDependencies = true
        }
      }

      if (shouldCancel) {
        console.log('[handleBulkDelete] User cancelled operation')
        toast.info('Operation cancelled')
        return
      }

      // Step 3: Filter items to delete
      const itemsToDelete = items.filter((item) => {
        const hasDependencies = dependencyMap.get(item.id)?.hasActiveDependencies
        return !(hasDependencies && shouldSkipDependencies)
      })

      const totalToDelete = itemsToDelete.length
      const skipped = items.length - totalToDelete

      console.log('[handleBulkDelete] Will delete', totalToDelete, 'items, skipping', skipped)
      console.log('[handleBulkDelete] Items to delete:', itemsToDelete.map(i => i.name).join(', '))

      if (totalToDelete === 0) {
        toast.info(`Skipped all ${skipped} supplier(s)`)
        return
      }

      // Step 4: Delete in batches of 100
      const BATCH_SIZE = 100
      let deleted = 0
      const startTime = Date.now()

      for (let i = 0; i < totalToDelete; i += BATCH_SIZE) {
        const batch = itemsToDelete.slice(i, i + BATCH_SIZE)
        const batchIds = batch.map((item) => item.id)

        try {
          // Delete batch
          const deleteRes = await fetch('/api/suppliers/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ supplierIds: batchIds }),
          })
          const deleteData = await deleteRes.json()

          if (!deleteData.success) {
            throw new Error(deleteData.error?.message || 'Batch delete failed')
          }

          deleted += deleteData.data.deleted

          // Calculate time remaining
          const elapsed = (Date.now() - startTime) / 1000 // seconds
          const rate = deleted / elapsed // items per second
          const remaining = totalToDelete - deleted
          const estimatedSeconds = remaining / rate

          let timeRemaining = ''
          if (estimatedSeconds > 60) {
            const minutes = Math.ceil(estimatedSeconds / 60)
            timeRemaining = `${minutes} minute${minutes !== 1 ? 's' : ''} remaining`
          } else {
            const seconds = Math.ceil(estimatedSeconds)
            timeRemaining = `${seconds} second${seconds !== 1 ? 's' : ''} remaining`
          }

          // Report progress
          if (onProgress) {
            onProgress(deleted, totalToDelete, timeRemaining)
          }
        } catch (error) {
          toast.error(`Batch delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Show summary
      if (deleted > 0) {
        toast.success(`Successfully deleted ${deleted} supplier(s)${skipped > 0 ? `, skipped ${skipped}` : ''}`)
      }
    } catch (error) {
      toast.error('Failed to delete suppliers: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }, [])

  const handleSelectAll = useCallback(async (): Promise<Party[]> => {
    try {
      // Fetch all suppliers without pagination
      const res = await fetch(`/api/suppliers?pageSize=10000${debouncedSearch ? `&q=${debouncedSearch}` : ''}`)
      const json = await res.json()
      if (json.success) {
        return json.data
      }
      throw new Error('Failed to fetch all suppliers')
    } catch (error) {
      toast.error('Failed to fetch all suppliers')
      return []
    }
  }, [debouncedSearch])

  const handleSearch = useCallback((query: string) => {
    setSearch(query)
    setCurrentPage(1) // Reset to first page when searching
  }, [])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  const handleSubmit = async (formData: CreateSupplierInput) => {
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

  const handleConfirmAction = (action: 'delete-all' | 'skip-dependencies' | 'cancel') => {
    console.log('[handleConfirmAction] Called with action:', action)
    const resolver = (window as any).__bulkDeleteResolver
    if (resolver) {
      console.log('[handleConfirmAction] Resolving promise with action:', action)
      resolver(action)
      delete (window as any).__bulkDeleteResolver
    } else {
      console.error('[handleConfirmAction] No resolver found! This should not happen.')
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
        onBulkDelete={handleBulkDelete}
        onSelectAll={handleSelectAll}
        addButtonLabel="Add Supplier"
        pagination={data?.meta}
        onPageChange={handlePageChange}
        headerActions={
          <>
            <Button variant="outline" onClick={() => setIsCsvDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            {isAdmin && (

              <Button variant="outline" onClick={() => setIsCsvUrlDialogOpen(true)}>
              <Link2 className="mr-2 h-4 w-4" />
              Import from URL
            </Button>

            )}
          </>
        }
      />

      <EntityFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        title={editingItem ? 'Edit Supplier' : 'Add Supplier'}
        description={editingItem ? 'Update supplier details. Note: ID is auto-generated and cannot be changed.' : 'Add a new fleet partner supplier. A unique ID will be generated automatically.'}
        schema={createSupplierSchema}
        fields={formFields}
        defaultValues={(editingItem ? {
          name: editingItem.name,
          pointOfContact: editingItem.pointOfContact || '',
          email: editingItem.email || '',
          phoneNumber: editingItem.phoneNumber || '',
          capacity: editingItem.capacity?.toString() || '',
          capacityType: editingItem.capacityType || ''
        } : defaultValues) as any}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        isEdit={!!editingItem}
      />

      <CsvUploadDialog
        open={isCsvDialogOpen}
        onOpenChange={setIsCsvDialogOpen}
        title="Import Suppliers from CSV"
        description="Upload a CSV file with supplier data. Download the template to see the required format."
        templateFields={['name', 'pointOfContact', 'email', 'phoneNumber']}
        apiEndpoint="/api/suppliers/import"
        dataKey="suppliers"
        queryKey={['suppliers']}
        onSuccess={() => {
          toast.success('Suppliers imported successfully')
        }}
      />

      <CsvUrlImportDialog
        open={isCsvUrlDialogOpen}
        onOpenChange={setIsCsvUrlDialogOpen}
        entityType="suppliers"
        onSuccess={() => {
          toast.success('Suppliers imported from URL successfully')
          setIsCsvUrlDialogOpen(false)
        }}
      />

      {confirmDialogData && (
        <BulkDeleteConfirmationDialog
          open={isConfirmDialogOpen}
          onOpenChange={setIsConfirmDialogOpen}
          itemsWithDependencies={confirmDialogData.itemsWithDependencies}
          totalItems={confirmDialogData.items.length}
          totalDependencies={confirmDialogData.totalDependencies}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  )
}
