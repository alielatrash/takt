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
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from '@/hooks/use-repositories'
import { createClientSchema } from '@/lib/validations/repositories'
import { useDebounce } from '@/hooks/use-debounce'
import { useAuth } from '@/hooks/use-auth'

const columns = [
  { key: 'uniqueIdentifier', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'pointOfContact', label: 'Point of Contact' },
  { key: 'email', label: 'Email' },
  { key: 'phoneNumber', label: 'Phone Number' },
]

const formFields = [
  { name: 'name', label: 'Name', placeholder: 'Enter client name', required: true },
  { name: 'pointOfContact', label: 'Point of Contact', placeholder: 'Enter contact person name (optional)' },
  { name: 'email', label: 'Email', placeholder: 'Enter contact email (optional)', type: 'email' as const },
  { name: 'phoneNumber', label: 'Phone Number', placeholder: 'Enter contact phone (optional)', type: 'phone' as const },
]

const defaultValues = { name: '', pointOfContact: '', email: '', phoneNumber: '' }

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false)
  const [isCsvUrlDialogOpen, setIsCsvUrlDialogOpen] = useState(false)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [confirmDialogData, setConfirmDialogData] = useState<{
    items: Party[]
    itemsWithDependencies: number
    totalForecasts: number
    onProgress?: (current: number, total: number, timeRemaining?: string) => void
  } | null>(null)
  const [editingItem, setEditingItem] = useState<Party | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const { data: authData } = useAuth()
  const isAdmin = authData?.user?.role === 'ADMIN'

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

  const handleEdit = useCallback((item: Party) => {
    setEditingItem(item)
    setIsDialogOpen(true)
  }, [])

  const handleDelete = useCallback(async (item: Party) => {
    if (!confirm(`Are you sure you want to deactivate "${item.name}"?`)) return
    try {
      await deleteMutation.mutateAsync(item.id)
      toast.success('Client deactivated successfully')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to deactivate client')
    }
  }, [deleteMutation])

  const handleBulkDelete = useCallback(async (items: Party[], onProgress?: (current: number, total: number, timeRemaining?: string) => void) => {
    const total = items.length
    console.log('[handleBulkDelete] Starting bulk delete for', total, 'items')

    try {
      // Step 1: Check all dependencies in batch
      const checkRes = await fetch('/api/clients/check-dependencies-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientIds: items.map((item) => item.id) }),
      })
      const checkData = await checkRes.json()

      if (!checkData.success) {
        toast.error('Failed to check dependencies')
        return
      }

      console.log('[handleBulkDelete] Dependency check completed:', checkData.data)

      // Build a map of clientId -> dependency info
      const dependencyMap = new Map<string, { hasActiveDependencies: boolean; activeForecastCount: number }>()
      checkData.data.forEach((result: any) => {
        dependencyMap.set(result.clientId, {
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
        const totalForecasts = itemsWithDependencies.reduce(
          (sum, item) => sum + (dependencyMap.get(item.id)?.activeForecastCount || 0),
          0
        )

        console.log('[handleBulkDelete]', itemsWithDependencies.length, 'items have dependencies (', totalForecasts, 'forecasts total)')

        // Show custom confirmation dialog
        const userAction = await new Promise<'delete-all' | 'skip-dependencies' | 'cancel'>((resolve) => {
          setConfirmDialogData({
            items,
            itemsWithDependencies: itemsWithDependencies.length,
            totalForecasts,
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
        toast.info(`Skipped all ${skipped} client(s)`)
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
          const deleteRes = await fetch('/api/clients/bulk-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientIds: batchIds }),
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
        toast.success(`Successfully deleted ${deleted} client(s)${skipped > 0 ? `, skipped ${skipped}` : ''}`)
      }
    } catch (error) {
      toast.error('Failed to delete clients: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }, [])

  const handleSelectAll = useCallback(async (): Promise<Party[]> => {
    try {
      // Fetch all clients without pagination
      const res = await fetch(`/api/clients?pageSize=10000${debouncedSearch ? `&q=${debouncedSearch}` : ''}`)
      const json = await res.json()
      if (json.success) {
        return json.data
      }
      throw new Error('Failed to fetch all clients')
    } catch (error) {
      toast.error('Failed to fetch all clients')
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

  const handleSubmit = async (formData: { name: string; pointOfContact?: string; email?: string; phoneNumber?: string }) => {
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
        onBulkDelete={handleBulkDelete}
        onSelectAll={handleSelectAll}
        addButtonLabel="Add Client"
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
        title={editingItem ? 'Edit Client' : 'Add Client'}
        description={editingItem ? 'Update client details. Note: ID is auto-generated and cannot be changed.' : 'Add a new client to the system. A unique ID will be generated automatically.'}
        schema={createClientSchema}
        fields={formFields}
        defaultValues={editingItem ? {
          name: editingItem.name,
          pointOfContact: editingItem.pointOfContact || '',
          email: editingItem.email || '',
          phoneNumber: editingItem.phoneNumber || ''
        } : defaultValues}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        isEdit={!!editingItem}
      />

      <CsvUploadDialog
        open={isCsvDialogOpen}
        onOpenChange={setIsCsvDialogOpen}
        title="Import Clients from CSV"
        description="Upload a CSV file with client data. Download the template to see the required format."
        templateFields={['name', 'pointOfContact', 'email', 'phoneNumber']}
        apiEndpoint="/api/clients/import"
        dataKey="clients"
        queryKey={['clients']}
        onSuccess={() => {
          toast.success('Clients imported successfully')
        }}
      />

      <CsvUrlImportDialog
        open={isCsvUrlDialogOpen}
        onOpenChange={setIsCsvUrlDialogOpen}
        entityType="clients"
        onSuccess={(data) => {
          console.log('[ClientsPage] Import completed:', data)
          if (data && (data.created > 0 || data.skipped > 0)) {
            if (data.created === 0 && data.skipped > 0) {
              toast.warning(`All ${data.skipped} clients were skipped (already exist)`)
            } else {
              toast.success(`Successfully imported ${data.created} client(s)${data.skipped > 0 ? `, ${data.skipped} skipped` : ''}`)
            }
          } else {
            toast.success('Import completed')
          }
          // Small delay to ensure cache invalidation completes
          setTimeout(() => setIsCsvUrlDialogOpen(false), 500)
        }}
      />

      {confirmDialogData && (
        <BulkDeleteConfirmationDialog
          open={isConfirmDialogOpen}
          onOpenChange={setIsConfirmDialogOpen}
          itemsWithDependencies={confirmDialogData.itemsWithDependencies}
          totalItems={confirmDialogData.items.length}
          totalDependencies={confirmDialogData.totalForecasts}
          onConfirm={handleConfirmAction}
        />
      )}
    </div>
  )
}
