import { useQuery } from '@tanstack/react-query'

interface ForecastAccuracyRow {
  routeKey: string
  forecasted: number
  actual: number
  fulfilled: number
  accuracy: number
  variance: number
  variancePercent: number
}

interface ForecastAccuracyData {
  dateRange: {
    start: string
    end: string
  }
  weeks: {
    id: string
    weekNumber: number
    year: number
    start: string
  }[]
  report: ForecastAccuracyRow[]
  totals: {
    forecasted: number
    actual: number
    fulfilled: number
    accuracy: number
    variance: number
  }
}

interface VendorPerformanceRow {
  supplierId: string
  supplierName: string
  weekStart: string
  committed: number
  completed: number
  variance: number
  fulfillmentRate: number
  routes: string[]
}

interface VendorPerformanceSummary {
  totalCommitted: number
  totalCompleted: number
  overallVariance: number
  overallFulfillmentRate: number
  supplierCount: number
  weekCount: number
  topPerformers: {
    name: string
    fulfillmentRate: number
    committed: number
    completed: number
  }[]
}

interface VendorPerformanceData {
  data: VendorPerformanceRow[]
  summary: VendorPerformanceSummary
}

export function useForecastAccuracy(weeks: number = 4) {
  return useQuery({
    queryKey: ['reports', 'forecast-accuracy', weeks],
    queryFn: async () => {
      const res = await fetch(`/api/reports/forecast-accuracy?weeks=${weeks}`, {
        credentials: 'include',
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch report')
      return json.data as ForecastAccuracyData
    },
  })
}

export function useVendorPerformance(params?: {
  startDate?: string
  endDate?: string
  supplierId?: string
  routeKey?: string
}) {
  const searchParams = new URLSearchParams()
  if (params?.startDate) searchParams.set('startDate', params.startDate)
  if (params?.endDate) searchParams.set('endDate', params.endDate)
  if (params?.supplierId) searchParams.set('supplierId', params.supplierId)
  if (params?.routeKey) searchParams.set('routeKey', params.routeKey)

  return useQuery({
    queryKey: ['reports', 'vendor-performance', params],
    queryFn: async () => {
      const res = await fetch(`/api/reports/vendor-performance?${searchParams.toString()}`, {
        credentials: 'include',
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch report')
      return json as { data: VendorPerformanceRow[]; summary: VendorPerformanceSummary }
    },
  })
}
