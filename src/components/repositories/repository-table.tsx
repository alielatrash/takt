'use client'

import { useState } from 'react'
import { Search, Plus, MoreHorizontal, Pencil, Trash2, Trash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

interface Column<T> {
  key: keyof T | string
  label: string
  render?: (item: T) => React.ReactNode
}

interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface RepositoryTableProps<T extends { id: string; isActive?: boolean }> {
  data: T[] | undefined
  columns: Column<T>[]
  isLoading: boolean
  searchPlaceholder?: string
  onSearch: (query: string) => void
  onAdd: () => void
  onEdit: (item: T) => void
  onDelete: (item: T) => void
  onBulkDelete?: (items: T[], onProgress?: (current: number, total: number, timeRemaining?: string) => void) => Promise<void>
  onSelectAll?: () => Promise<T[]>
  addButtonLabel?: string
  pagination?: PaginationMeta
  onPageChange?: (page: number) => void
  headerActions?: React.ReactNode
}

export function RepositoryTable<T extends { id: string; isActive?: boolean }>({
  data,
  columns,
  isLoading,
  searchPlaceholder = 'Search...',
  onSearch,
  onAdd,
  onEdit,
  onDelete,
  onBulkDelete,
  onSelectAll,
  addButtonLabel = 'Add New',
  pagination,
  onPageChange,
  headerActions,
}: RepositoryTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [selectAllAcrossPages, setSelectAllAcrossPages] = useState(false)
  const [allItems, setAllItems] = useState<T[]>([])
  const [deleteProgress, setDeleteProgress] = useState<{ current: number; total: number; timeRemaining?: string } | null>(null)

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    onSearch(value)
    setSelectedIds(new Set()) // Clear selection when searching
    setSelectAllAcrossPages(false) // Clear "select all" state
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && data) {
      setSelectedIds(new Set(data.map((item) => item.id)))
      setSelectAllAcrossPages(false) // Reset when toggling page selection
    } else {
      setSelectedIds(new Set())
      setSelectAllAcrossPages(false)
    }
  }

  const handleSelectAllAcrossPages = async () => {
    if (!onSelectAll) return
    try {
      const allItems = await onSelectAll()
      setAllItems(allItems)
      setSelectedIds(new Set(allItems.map((item) => item.id)))
      setSelectAllAcrossPages(true)
    } catch (error) {
      console.error('Failed to select all items:', error)
    }
  }

  const handleClearAllSelection = () => {
    setSelectedIds(new Set())
    setSelectAllAcrossPages(false)
    setAllItems([])
  }

  const handleSelectItem = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedIds.size === 0) return

    setIsBulkDeleting(true)
    setDeleteProgress(null)
    try {
      // Use allItems if "select all across pages" is active, otherwise use current page data
      const sourceItems = selectAllAcrossPages ? allItems : (data || [])
      const itemsToDelete = sourceItems.filter((item) => selectedIds.has(item.id))

      // Pass progress callback
      await onBulkDelete(itemsToDelete, (current, total, timeRemaining) => {
        setDeleteProgress({ current, total, timeRemaining })
      })

      setSelectedIds(new Set())
      setSelectAllAcrossPages(false)
      setAllItems([])
    } finally {
      setIsBulkDeleting(false)
      setDeleteProgress(null)
    }
  }

  const allSelected = data && data.length > 0 && selectedIds.size === data.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < (data?.length || 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && onBulkDelete && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
            >
              <Trash className="mr-2 h-4 w-4" />
              Delete Selected ({selectedIds.size})
            </Button>
          )}
          {headerActions}
          <Button onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" />
            {addButtonLabel}
          </Button>
        </div>
      </div>

      {/* Select All Banner */}
      {allSelected && !selectAllAcrossPages && onSelectAll && pagination && pagination.total > (data?.length || 0) && (
        <div className="rounded-md bg-muted px-4 py-3 text-sm">
          <span className="text-muted-foreground">
            All {data?.length} items on this page are selected.{' '}
          </span>
          <button
            onClick={handleSelectAllAcrossPages}
            className="font-medium text-primary hover:underline"
          >
            Select all {pagination.total} items
          </button>
        </div>
      )}

      {/* All Items Selected Banner */}
      {selectAllAcrossPages && pagination && (
        <div className="rounded-md bg-primary/10 px-4 py-3 text-sm">
          <span className="font-medium text-primary">
            All {pagination.total} items are selected.{' '}
          </span>
          <button
            onClick={handleClearAllSelection}
            className="text-primary hover:underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Deletion Progress */}
      {isBulkDeleting && deleteProgress && (
        <Alert>
          <Loader2 className="h-4 w-4 animate-spin" />
          <AlertDescription>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium">
                  Deleting {deleteProgress.current} of {deleteProgress.total} items
                  <span className="text-muted-foreground ml-2">
                    ({Math.round((deleteProgress.current / deleteProgress.total) * 100)}%)
                  </span>
                </p>
                {deleteProgress.timeRemaining && (
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {deleteProgress.timeRemaining}
                  </p>
                )}
              </div>
              <Progress value={(deleteProgress.current / deleteProgress.total) * 100} />
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {onBulkDelete && (
                <TableHead className="w-[50px]">
                  <Checkbox
                    checked={allSelected || someSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                    className={someSelected ? 'data-[state=checked]:bg-muted' : ''}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead key={String(column.key)}>{column.label}</TableHead>
              ))}
              <TableHead className="w-[100px]">Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {onBulkDelete && (
                    <TableCell>
                      <Skeleton className="h-4 w-4" />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                  <TableCell>
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + (onBulkDelete ? 3 : 2)} className="h-24 text-center">
                  No results found.
                </TableCell>
              </TableRow>
            ) : (
              data?.map((item) => (
                <TableRow key={item.id} className={selectedIds.has(item.id) ? 'bg-muted/50' : ''}>
                  {onBulkDelete && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                        aria-label={`Select row`}
                      />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      {column.render
                        ? column.render(item)
                        : String((item as Record<string, unknown>)[column.key as string] ?? '-')}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Badge variant={item.isActive ? 'default' : 'secondary'}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(item)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Deactivate
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {pagination && onPageChange && (
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={onPageChange}
            totalItems={pagination.total}
            pageSize={pagination.pageSize}
          />
        )}
      </div>
    </div>
  )
}
