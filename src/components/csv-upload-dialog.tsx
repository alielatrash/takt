'use client'

import { useState, useRef } from 'react'
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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download } from 'lucide-react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

interface CsvUploadDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  templateFields: string[]
  apiEndpoint: string
  dataKey: string
  queryKey: string[]
  onSuccess?: () => void
}

export function CsvUploadDialog({
  open,
  onOpenChange,
  title,
  description,
  templateFields,
  apiEndpoint,
  dataKey,
  queryKey,
  onSuccess,
}: CsvUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [parseResult, setParseResult] = useState<{
    data: unknown[]
    preview: unknown[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()

  const uploadMutation = useMutation({
    mutationFn: async (data: unknown[]) => {
      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [dataKey]: data }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || 'Upload failed')
      return json.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey })
      onSuccess?.()
      handleClose()
    },
  })

  const parseFile = (selectedFile: File) => {
    const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase()

    if (fileExtension === 'csv') {
      // Parse CSV
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = results.data as unknown[]
          setParseResult({
            data,
            preview: data.slice(0, 5),
          })
        },
        error: (error) => {
          console.error('CSV parse error:', error)
        },
      })
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Parse Excel
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as unknown[]

          setParseResult({
            data: jsonData,
            preview: jsonData.slice(0, 5),
          })
        } catch (error) {
          console.error('Excel parse error:', error)
        }
      }
      reader.readAsArrayBuffer(selectedFile)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    setFile(selectedFile)
    parseFile(selectedFile)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFile = e.dataTransfer.files[0]
    if (!droppedFile) return

    const fileExtension = droppedFile.name.split('.').pop()?.toLowerCase()
    if (!['csv', 'xlsx', 'xls'].includes(fileExtension || '')) {
      alert('Please upload a CSV or Excel file')
      return
    }

    setFile(droppedFile)
    parseFile(droppedFile)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleUpload = () => {
    if (!parseResult?.data) return
    uploadMutation.mutate(parseResult.data)
  }

  const handleClose = () => {
    setFile(null)
    setParseResult(null)
    uploadMutation.reset()
    onOpenChange(false)
  }

  const downloadTemplate = () => {
    const csv = Papa.unparse([templateFields])
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${dataKey}-template.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">CSV Template</p>
                <p className="text-xs text-muted-foreground">
                  Download a template to see the required format
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </div>

          {/* File Upload with Drag & Drop */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              isDragging
                ? 'border-primary bg-primary/10'
                : 'border-border bg-muted/50 hover:bg-muted'
            }`}
          >
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
              <p className="mb-2 text-sm text-muted-foreground">
                <span className="font-semibold">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">CSV or Excel files (.csv, .xlsx, .xls)</p>
            </div>
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* File Selected */}
          {file && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>{file.name}</strong> selected ({parseResult?.data.length || 0} rows)
              </AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {parseResult && parseResult.preview.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Preview (first 5 rows)</p>
              <div className="border rounded-lg overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      {Object.keys(parseResult.preview[0] as object).map((key) => (
                        <th key={key} className="px-4 py-2 text-left font-medium">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parseResult.preview.map((row, i) => (
                      <tr key={i} className="border-t">
                        {Object.values(row as object).map((value, j) => (
                          <td key={j} className="px-4 py-2">
                            {String(value)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploadMutation.isPending && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Uploading...</p>
              <Progress value={undefined} />
            </div>
          )}

          {/* Error */}
          {uploadMutation.isError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {uploadMutation.error instanceof Error
                  ? uploadMutation.error.message
                  : 'Upload failed'}
              </AlertDescription>
            </Alert>
          )}

          {/* Success */}
          {uploadMutation.isSuccess && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Upload successful!</strong>
                <br />
                Created: {uploadMutation.data.created} | Skipped: {uploadMutation.data.skipped}
                {uploadMutation.data.errors.length > 0 && (
                  <>
                    <br />
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm">
                        View {uploadMutation.data.errors.length} errors
                      </summary>
                      <ul className="mt-2 space-y-1 text-xs">
                        {uploadMutation.data.errors.map((error: string, i: number) => (
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
            onClick={handleUpload}
            disabled={!parseResult || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? 'Uploading...' : `Upload ${parseResult?.data.length || 0} rows`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
