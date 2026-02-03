'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface AccuracyRow {
  routeKey: string
  forecasted: number
  actual: number
  fulfilled: number
  accuracy: number
  variance: number
  variancePercent: number
}

interface AccuracyTableProps {
  data?: AccuracyRow[]
  isLoading?: boolean
}

function getAccuracyBadge(accuracy: number) {
  if (accuracy >= 90 && accuracy <= 110) {
    return <Badge className="bg-green-100 text-green-800">Excellent</Badge>
  } else if (accuracy >= 80 && accuracy <= 120) {
    return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>
  } else {
    return <Badge className="bg-red-100 text-red-800">Poor</Badge>
  }
}

function getVarianceColor(variance: number) {
  if (variance === 0) return 'text-gray-600'
  if (variance > 0) return 'text-green-600'
  return 'text-red-600'
}

export function AccuracyTable({ data, isLoading }: AccuracyTableProps) {
  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Route</TableHead>
              <TableHead className="text-right">Forecasted</TableHead>
              <TableHead className="text-right">Actual</TableHead>
              <TableHead className="text-right">Fulfilled</TableHead>
              <TableHead className="text-right">Variance</TableHead>
              <TableHead className="text-right">Accuracy</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">No forecast data available for the selected period</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Route</TableHead>
            <TableHead className="text-right">Forecasted</TableHead>
            <TableHead className="text-right">Actual</TableHead>
            <TableHead className="text-right">Fulfilled</TableHead>
            <TableHead className="text-right">Variance</TableHead>
            <TableHead className="text-right">Accuracy</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.routeKey}>
              <TableCell className="font-medium">{row.routeKey}</TableCell>
              <TableCell className="text-right">{row.forecasted}</TableCell>
              <TableCell className="text-right">{row.actual}</TableCell>
              <TableCell className="text-right">{row.fulfilled}</TableCell>
              <TableCell className={`text-right ${getVarianceColor(row.variance)}`}>
                {row.variance > 0 ? '+' : ''}{row.variance} ({row.variancePercent > 0 ? '+' : ''}{row.variancePercent}%)
              </TableCell>
              <TableCell className="text-right">{row.accuracy}%</TableCell>
              <TableCell>{getAccuracyBadge(row.accuracy)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
