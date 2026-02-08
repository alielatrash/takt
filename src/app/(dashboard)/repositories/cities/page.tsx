'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import type { Location } from '@prisma/client'
import { PageHeader } from '@/components/layout'
import { RepositoryTable } from '@/components/repositories/repository-table'
import { EntityFormDialog } from '@/components/repositories/entity-form-dialog'
import { CsvUploadDialog } from '@/components/csv-upload-dialog'
import { CsvUrlImportDialog } from '@/components/csv-url-import-dialog'
import { BulkDeleteConfirmationDialog } from '@/components/repositories/bulk-delete-confirmation-dialog'
import { Button } from '@/components/ui/button'
import { Upload, Link2 } from 'lucide-react'
import {
  useCities,
  useCreateCity,
  useUpdateCity,
  useDeleteCity,
} from '@/hooks/use-repositories'
import { createCitySchema } from '@/lib/validations/repositories'
import { useDebounce } from '@/hooks/use-debounce'
import { useAuth } from '@/hooks/use-auth'

const columns = [
  { key: 'name', label: 'Name' },
  { key: 'nameAr', label: 'Arabic Name' },
  { key: 'code', label: 'Code' },
  { key: 'region', label: 'Region' },
]

const formFields = [
  { name: 'name', label: 'Name', placeholder: 'Enter city name', required: true },
  { name: 'nameAr', label: 'Arabic Name', placeholder: 'Enter Arabic name (optional)' },
  { name: 'code', label: 'Code', placeholder: 'Enter short code (e.g., RUH, JED)' },
  { name: 'region', label: 'Region', placeholder: 'Enter region (e.g., West, Central, East)' },
]

const defaultValues = { name: '', nameAr: '', code: '', region: '' }

export default function CitiesPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false)
  const [isCsvUrlDialogOpen, setIsCsvUrlDialogOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [confirmDialogData, setConfirmDialogData] = useState<{
    items: Location[]
    itemsWithDependencies: number
    totalDependencies: number
    onProgress?: (current: number, total: number, timeRemaining?: string) => void
  } | null>(null)
  const [editingItem, setEditingItem] = useState<Location | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const { data: authData } = useAuth()
  const isAdmin = authData?.user?.role === 'ADMIN'

  const { data, isLoading } = useCities({
    q: debouncedSearch,
    page: currentPage,
    pageSize: 50,
    isActive: true
  })
  const createMutation = useCreateCity()
  const updateMutation = useUpdateCity()
  const deleteMutation = useDeleteCity()

  const handleAdd = useCallback(() => {
    setEditingItem(null)
    setIsDialogOpen(true)
  }, [])

  const handleEdit = useCallback((item: Location) => {
    setEditingItem(item)
    setIsDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (item: Location) => {
    if (!confirm(`Are you sure you want to deactivate "${item.name}"?`)) return
    try {
      await deleteMutation.mutateAsync(item.id)
      toast.success('City deactivated successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate city')
    }
  }, [deleteMutation])

  const handleBulkDelete = useCallback(async (items: Location[], onProgress?: (current: number, total: number, timeRemaining?: string) => void) => {
    const total = items.length
    console.log('[handleBulkDelete] Starting bulk delete for', total, 'items')

    try {
      // Step 1: Check all dependencies in batch
      const checkRes = await fetch('/api/cities/check-dependencies-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cityIds: items.map((item) => item.id) }),
      })
      const checkData = await checkRes.json()

      if (!checkData.success) {
        toast.error('Failed to check dependencies')
        return
      }

      console.log('[handleBulkDelete] Dependency check completed:', checkData.data)

      // Build a map of cityId -> dependency info
      const dependencyMap = new Map<string, { hasActiveDependencies: boolean; activeForecastCount: number }>()
      checkData.data.forEach((result: any) => {
        dependencyMap.set(result.cityId, {
          hasActiveDependencies: result.hasActiveDependencies,
          activeForecastCount: result.activeForecastCount,
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
          (sum, item) => sum + (dependencyMap.get(item.id)?.activeForecastCount || 0),
          0
        )

        console.log('[handleBulkDelete]', itemsWithDependencies.length, 'items have dependencies (', totalDependencies, 'forecasts total)')

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
        toast.info(`Skipped all ${skipped} city/cities`)
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
          const deleteRes = await fetch('/api/cities/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cityIds: batchIds }),
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
        toast.success(`Successfully deleted ${deleted} city/cities${skipped > 0 ? `, skipped ${skipped}` : ''}`)
      }
    } catch (error) {
      toast.error('Failed to delete cities: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }, [])

  const handleSelectAll = useCallback(async (): Promise<Location[]> => {
    try {
      // Fetch all cities without pagination
      const res = await fetch(`/api/cities?pageSize=10000${debouncedSearch ? `&q=${debouncedSearch}` : ''}`)
      const json = await res.json()
      if (json.success) {
        return json.data
      }
      throw new Error('Failed to fetch all cities')
    } catch (error) {
      toast.error('Failed to fetch all cities')
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

  const handleSubmit = async (formData: { name: string; nameAr?: string; code?: string; region?: string }) => {
    try {
      if (editingItem) {
        await updateMutation.mutateAsync({ id: editingItem.id, ...formData })
        toast.success('City updated successfully')
      } else {
        await createMutation.mutateAsync(formData)
        toast.success('City created successfully')
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
        title="Cities"
        description="Manage pickup and dropoff cities"
      />

      <RepositoryTable
        data={data?.data}
        columns={columns}
        isLoading={isLoading}
        searchPlaceholder="Search cities..."
        onSearch={handleSearch}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onBulkDelete={handleBulkDelete}
        onSelectAll={handleSelectAll}
        addButtonLabel="Add City"
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
        title={editingItem ? 'Edit City' : 'Add City'}
        description={editingItem ? 'Update city details' : 'Add a new city to the system'}
        schema={createCitySchema}
        fields={formFields}
        defaultValues={editingItem ? {
          name: editingItem.name,
          nameAr: editingItem.nameAr || '',
          code: editingItem.code || '',
          region: editingItem.region || '',
        } : defaultValues}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        isEdit={!!editingItem}
      />

      <CsvUploadDialog
        open={isCsvDialogOpen}
        onOpenChange={setIsCsvDialogOpen}
        title="Import Cities from CSV"
        description="Upload a CSV file with city data. Download the template to see the required format."
        templateFields={['name', 'code', 'region']}
        apiEndpoint="/api/cities/import"
        dataKey="cities"
        queryKey={['cities']}
        onSuccess={() => {
          toast.success('Cities imported successfully')
        }}
      />

      <CsvUrlImportDialog
        open={isCsvUrlDialogOpen}
        onOpenChange={setIsCsvUrlDialogOpen}
        entityType="cities"
        onSuccess={(data) => {
          if (data && data.created > 0) {
            toast.success(`Successfully imported ${data.created} cities`)
          } else if (data && data.skipped > 0 && data.errors && data.errors.length > 0) {
            toast.error(`Import failed: ${data.errors[0]}. Check console for details.`)
            console.error('Import errors:', data.errors)
          } else if (data && data.skipped > 0) {
            toast.warning(`All ${data.skipped} cities were skipped (already exist)`)
          } else {
            toast.success('Cities imported from URL successfully')
          }
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
