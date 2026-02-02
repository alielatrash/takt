'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Link2, CheckCircle2, AlertCircle, Info } from 'lucide-react'

interface CsvUrlImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (data?: { created: number; skipped: number; errors?: string[] }) => void
  entityType?: 'clients' | 'suppliers' | 'cities' | 'truck-types' // Auto-detect from page
}

export function CsvUrlImportDialog({
  open,
  onOpenChange,
  onSuccess,
  entityType: entityTypeProp,
}: CsvUrlImportDialogProps) {
  const [csvUrl, setCsvUrl] = useState('')
  const [entityType, setEntityType] = useState<'clients' | 'suppliers' | 'cities' | 'truck-types'>(entityTypeProp || 'clients')
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)
  const queryClient = useQueryClient()

  const importMutation = useMutation({
    mutationFn: async () => {
      setProgress(null)
      const res = await fetch('/api/admin/import-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvUrl, entityType }),
      })

      // Check if response is streaming (for progress updates)
      const contentType = res.headers.get('content-type')
      if (contentType?.includes('text/event-stream') || contentType?.includes('application/x-ndjson')) {
        const reader = res.body?.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let finalResult: any = null

        while (reader) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const data = JSON.parse(line)
              if (data.type === 'progress') {
                setProgress({ current: data.current, total: data.total })
              } else if (data.type === 'complete') {
                finalResult = data.data
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }

        if (!finalResult) throw new Error('Import failed - no final result')
        return finalResult
      }

      // Fallback to non-streaming response
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || 'Import failed')
      return json.data
    },
    onSuccess: (data) => {
      console.log('[CsvUrlImport] Import completed successfully:', data)
      const queryKey = entityType === 'clients' ? ['clients'] :
                       entityType === 'suppliers' ? ['suppliers'] :
                       entityType === 'cities' ? ['cities'] : ['truck-types']
      console.log('[CsvUrlImport] Invalidating query cache for:', queryKey)
      queryClient.invalidateQueries({ queryKey })
      setProgress(null)

      // Show detailed results in toast
      if (data) {
        const message = `Created ${data.created || 0}, Skipped ${data.skipped || 0}`
        console.log('[CsvUrlImport]', message)
      }

      onSuccess?.(data)
    },
    onError: () => {
      setProgress(null)
    },
  })

  const handleImport = () => {
    if (!csvUrl || !entityType) return
    importMutation.mutate()
  }

  const handleClose = () => {
    setCsvUrl('')
    if (!entityTypeProp) {
      setEntityType('clients')
    }
    setProgress(null)
    importMutation.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import from CSV URL</DialogTitle>
          <DialogDescription>
            Fetch and import data directly from a CSV file URL
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Tip:</strong> This works with any public CSV URL, including Redash query exports, Google Sheets (published as CSV), or any other CSV endpoint.
            </AlertDescription>
          </Alert>

          {/* Entity Type Selection - Only show if not provided via prop */}
          {!entityTypeProp && (
            <div className="space-y-2">
              <Label htmlFor="entity-type">Entity Type</Label>
              <Select value={entityType} onValueChange={(value: typeof entityType) => setEntityType(value)}>
                <SelectTrigger id="entity-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clients">Clients</SelectItem>
                  <SelectItem value="suppliers">Suppliers</SelectItem>
                  <SelectItem value="cities">Cities</SelectItem>
                  <SelectItem value="truck-types">Truck Types</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* CSV URL Input */}
          <div className="space-y-2">
            <Label htmlFor="csv-url">CSV File URL</Label>
            <Input
              id="csv-url"
              type="url"
              placeholder="https://example.com/data.csv or https://redash.example.com/api/queries/123/results.csv?api_key=..."
              value={csvUrl}
              onChange={(e) => setCsvUrl(e.target.value)}
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Enter any public URL that returns CSV data
            </p>
          </div>

          {/* Import Progress */}
          {importMutation.isPending && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 animate-pulse" />
                <p className="text-sm font-medium">
                  {progress
                    ? `Processing ${progress.current} of ${progress.total} records (${Math.round((progress.current / progress.total) * 100)}%)`
                    : 'Fetching and importing data...'}
                </p>
              </div>
              <Progress value={progress ? (progress.current / progress.total) * 100 : undefined} />
            </div>
          )}

          {/* Error */}
          {importMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {importMutation.error instanceof Error
                  ? importMutation.error.message
                  : 'Import failed'}
              </AlertDescription>
            </Alert>
          )}

          {/* Success */}
          {importMutation.isSuccess && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Import successful!</strong>
                <br />
                Created: {importMutation.data.created} | Skipped: {importMutation.data.skipped}
                {importMutation.data.errors.length > 0 && (
                  <>
                    <br />
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm">
                        View {importMutation.data.errors.length} errors
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs">
                        {importMutation.data.errors.map((error: string, i: number) => (
                          <li key={i}>• {error}</li>
                        ))}
                      </ul>
                    </details>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!csvUrl || !entityType || importMutation.isPending}
          >
            <Link2 className="mr-2 h-4 w-4" />
            {importMutation.isPending ? 'Importing...' : 'Import from URL'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
