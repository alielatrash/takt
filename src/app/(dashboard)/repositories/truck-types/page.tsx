'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import type { ResourceType } from '@prisma/client'
import { PageHeader } from '@/components/layout'
import { RepositoryTable } from '@/components/repositories/repository-table'
import { EntityFormDialog } from '@/components/repositories/entity-form-dialog'
import { CsvUploadDialog } from '@/components/csv-upload-dialog'
import { CsvUrlImportDialog } from '@/components/csv-url-import-dialog'
import { BulkDeleteConfirmationDialog } from '@/components/repositories/bulk-delete-confirmation-dialog'
import { Button } from '@/components/ui/button'
import { Upload, Link2 } from 'lucide-react'
import {
  useTruckTypes,
  useCreateTruckType,
  useUpdateTruckType,
  useDeleteTruckType,
} from '@/hooks/use-repositories'
import { createTruckTypeSchema } from '@/lib/validations/repositories'
import { useDebounce } from '@/hooks/use-debounce'
import { useAuth } from '@/hooks/use-auth'

const columns = [
  { key: 'name', label: 'Name' },
]

const formFields = [
  { name: 'name', label: 'Name', placeholder: 'Enter truck type (e.g., Curtainside, Flatbed, Reefer)', required: true },
]

const defaultValues = { name: '' }

export default function TruckTypesPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false)
  const [isCsvUrlDialogOpen, setIsCsvUrlDialogOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [confirmDialogData, setConfirmDialogData] = useState<{
    items: ResourceType[]
    itemsWithDependencies: number
    totalDependencies: number
    onProgress?: (current: number, total: number, timeRemaining?: string) => void
  } | null>(null)
  const [editingItem, setEditingItem] = useState<ResourceType | null>(null)

  const { data: authData } = useAuth()
  const isAdmin = authData?.user?.role === 'ADMIN'

  const { data, isLoading } = useTruckTypes({ q: debouncedSearch, isActive: true })
  const createMutation = useCreateTruckType()
  const updateMutation = useUpdateTruckType()
  const deleteMutation = useDeleteTruckType()

  const handleAdd = useCallback(() => {
    setEditingItem(null)
    setIsDialogOpen(true)
  }, [])

  const handleEdit = useCallback((item: ResourceType) => {
    setEditingItem(item)
    setIsDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (item: ResourceType) => {
    if (!confirm(`Are you sure you want to deactivate "${item.name}"?`)) return
    try {
      await deleteMutation.mutateAsync(item.id)
      toast.success('Truck type deactivated successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate truck type')
    }
  }, [deleteMutation])

  const handleBulkDelete = useCallback(async (items: ResourceType[], onProgress?: (current: number, total: number, timeRemaining?: string) => void) => {
    const total = items.length
    console.log('[handleBulkDelete] Starting bulk delete for', total, 'items')

    try {
      // Step 1: Check all dependencies in batch
      const checkRes = await fetch('/api/truck-types/check-dependencies-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ truckTypeIds: items.map((item) => item.id) }),
      })
      const checkData = await checkRes.json()

      if (!checkData.success) {
        toast.error('Failed to check dependencies')
        return
      }

      console.log('[handleBulkDelete] Dependency check completed:', checkData.data)

      // Build a map of truckTypeId -> dependency info
      const dependencyMap = new Map<string, { hasActiveDependencies: boolean; activeDependencyCount: number }>()
      checkData.data.forEach((result: any) => {
        dependencyMap.set(result.truckTypeId, {
          hasActiveDependencies: result.hasActiveDependencies,
          activeDependencyCount: result.activeDependencyCount,
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
          (sum, item) => sum + (dependencyMap.get(item.id)?.activeDependencyCount || 0),
          0
        )

        console.log('[handleBulkDelete]', itemsWithDependencies.length, 'items have dependencies (', totalDependencies, 'forecasts/commitments total)')

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
        toast.info(`Skipped all ${skipped} truck type(s)`)
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
          const deleteRes = await fetch('/api/truck-types/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ truckTypeIds: batchIds }),
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
        toast.success(`Successfully deleted ${deleted} truck type(s)${skipped > 0 ? `, skipped ${skipped}` : ''}`)
      }
    } catch (error) {
      toast.error('Failed to delete truck types: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }, [])

  const handleSelectAll = useCallback(async (): Promise<ResourceType[]> => {
    try {
      // Fetch all truck types without pagination
      const res = await fetch(`/api/truck-types?pageSize=10000${debouncedSearch ? `&q=${debouncedSearch}` : ''}`)
      const json = await res.json()
      if (json.success) {
        return json.data
      }
      throw new Error('Failed to fetch all truck types')
    } catch (error) {
      toast.error('Failed to fetch all truck types')
      return []
    }
  }, [debouncedSearch])

  const handleSubmit = async (formData: { name: string }) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, ...formData })
        toast.success('Truck type updated successfully')
      } else {
        await createMutation.mutateAsync(formData)
        toast.success('Truck type created successfully')
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
        title="Truck Types"
        description="Manage truck types for planning"
      />

      <RepositoryTable
        data={data?.data}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search truck types..."
        onSearch={setSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        onSelectAll={handleSelectAll}
        addButtonLabel="Add Truck Type"
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
        title={editingItem ? 'Edit Truck Type' : 'Add Truck Type'}
        description={editingItem ? 'Update truck type details' : 'Add a new truck type'}
        schema={createTruckTypeSchema}
        fields={formFields}
        defaultValues={editingItem ? { name: editingItem.name } : defaultValues}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        isEdit={!!editingItem}
      />

      <CsvUploadDialog
        open={isCsvDialogOpen}
        onOpenChange={setIsCsvDialogOpen}
        title="Import Truck Types from CSV"
        description="Upload a CSV file with truck type data. Download the template to see the required format."
        templateFields={['name']}
        apiEndpoint="/api/truck-types/import"
        dataKey="truckTypes"
        queryKey={['truck-types']}
        onSuccess={() => {
          toast.success('Truck types imported successfully')
        }}
      />

      <CsvUrlImportDialog
        open={isCsvUrlDialogOpen}
        onOpenChange={setIsCsvUrlDialogOpen}
        entityType="truck-types"
        onSuccess={() => {
          toast.success('Truck types imported from URL successfully')
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
