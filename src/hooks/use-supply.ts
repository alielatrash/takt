'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface SupplyTarget {
  routeKey: string
  forecastCount: number
  target: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; week1: number; week2: number; week3: number; week4: number; total: number }
  committed: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; week1: number; week2: number; week3: number; week4: number; total: number }
  gap: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; week1: number; week2: number; week3: number; week4: number; total: number }
  gapPercent: number
  clients: Array<{
    client: { id: string; name: string; code: string | null }
    day1: number
    day2: number
    day3: number
    day4: number
    day5: number
    day6: number
    day7: number
    total: number
  }>
  commitments: Array<{
    id: string
    party: { id: string; name: string; code: string | null }
    day1: number
    day2: number
    day3: number
    day4: number
    day5: number
    day6: number
    day7: number
    total: number
  }>
}

// Supply Targets (aggregated demand by CITYm)
export function useSupplyTargets(planningWeekId?: string) {
  return useQuery({
    queryKey: ['supplyTargets', planningWeekId],
    queryFn: async (): Promise<{ success: boolean; data: SupplyTarget[] }> => {
      const response = await fetch(`/api/supply/targets?planningWeekId=${planningWeekId}`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch supply targets')
      return response.json()
    },
    enabled: !!planningWeekId,
  })
}

interface CreateSupplyCommitmentInput {
  planningWeekId: string
  supplierId: string
  routeKey: string
  truckTypeId?: string
  day1Committed?: number
  day2Committed?: number
  day3Committed?: number
  day4Committed?: number
  day5Committed?: number
  day6Committed?: number
  day7Committed?: number
}

export function useCreateSupplyCommitment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateSupplyCommitmentInput) => {
      const response = await fetch('/api/supply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['supplyTargets', variables.planningWeekId] })
    },
  })
}

interface UpdateSupplyCommitmentInput {
  id: string
  day1Committed?: number
  day2Committed?: number
  day3Committed?: number
  day4Committed?: number
  day5Committed?: number
  day6Committed?: number
  day7Committed?: number
}

export function useUpdateSupplyCommitment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateSupplyCommitmentInput) => {
      const response = await fetch(`/api/supply/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplyTargets'] })
    },
  })
}

export function useDeleteSupplyCommitment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/supply/${id}`, { method: 'DELETE', credentials: 'include' })
      const result = await response.json()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplyTargets'] })
    },
  })
}

// Dispatch Sheet types
interface DispatchRoute {
  routeKey: string
  plan: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; total: number }
}

interface DispatchSupplier {
  supplierId: string
  supplierName: string
  supplierCode: string | null
  routes: DispatchRoute[]
  totals: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; total: number }
}

interface DispatchData {
  suppliers: DispatchSupplier[]
  grandTotals: { day1: number; day2: number; day3: number; day4: number; day5: number; day6: number; day7: number; total: number }
}

export function useDispatchSheet(planningWeekId?: string) {
  return useQuery({
    queryKey: ['dispatchSheet', planningWeekId],
    queryFn: async (): Promise<{ success: boolean; data: DispatchData }> => {
      const response = await fetch(`/api/supply/dispatch?planningWeekId=${planningWeekId}`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch dispatch data')
      return response.json()
    },
    enabled: !!planningWeekId,
  })
}

export type { DispatchSupplier, DispatchRoute, DispatchData }
