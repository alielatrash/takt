'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BulkDeleteConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemsWithDependencies: number
  totalItems: number
  totalDependencies: number
  onConfirm: (action: 'delete-all' | 'skip-dependencies' | 'cancel') => void
}

export function BulkDeleteConfirmationDialog({
  open,
  onOpenChange,
  itemsWithDependencies,
  totalItems,
  totalDependencies,
  onConfirm,
}: BulkDeleteConfirmationDialogProps) {
  const handleDeleteAll = () => {
    onConfirm('delete-all')
    onOpenChange(false)
  }

  const handleSkip = () => {
    onConfirm('skip-dependencies')
    onOpenChange(false)
  }

  const handleCancel = () => {
    onConfirm('cancel')
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
            </div>
            <AlertDialogTitle className="text-left">
              Dependencies Detected
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left pt-4 space-y-4">
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/20 p-3 border border-yellow-200 dark:border-yellow-900">
              <p className="text-base font-medium text-foreground">
                <span className="font-bold text-yellow-700 dark:text-yellow-400">{itemsWithDependencies}</span> of{' '}
                <span className="font-bold text-foreground">{totalItems}</span> clients have{' '}
                <span className="font-bold text-yellow-700 dark:text-yellow-400">{totalDependencies} active forecast{totalDependencies !== 1 ? 's' : ''}</span>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-destructive">Warning:</span> Deleting clients with forecasts will permanently remove their planning data and may affect your operations.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-col gap-2 sm:gap-2">
          <Button
            variant="secondary"
            onClick={handleSkip}
            className="w-full"
          >
            Skip Items with Forecasts (Delete only {totalItems - itemsWithDependencies}, skip {itemsWithDependencies})
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteAll}
            className="w-full"
          >
            Delete All Including Forecasts ({totalItems} clients, {totalDependencies} forecasts)
          </Button>
          <AlertDialogCancel asChild>
            <Button variant="outline" onClick={handleCancel} className="w-full mt-0">
              Cancel Operation
            </Button>
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
