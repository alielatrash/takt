'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { DemandForecast, PlanningWeek, Client, City, TruckType } from '@prisma/client'

interface DemandForecastWithRelations extends DemandForecast {
  client: Pick<Client, 'id' | 'name' | 'code'>
  pickupCity: Pick<City, 'id' | 'name' | 'code' | 'region'>
  dropoffCity: Pick<City, 'id' | 'name' | 'code' | 'region'>
  truckType: Pick<TruckType, 'id' | 'name'>
  planningWeek: Pick<PlanningWeek, 'id' | 'weekStart' | 'weekEnd'>
  createdBy: { id: string; firstName: string; lastName: string }
}

interface PlanningWeekWithDisplay extends PlanningWeek {
  display: string
}

interface PaginationInfo {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

interface DemandForecastsResponse {
  success: boolean
  data: DemandForecastWithRelations[]
  pagination: PaginationInfo
}

// Planning Weeks
export function usePlanningWeeks(count: number = 8) {
  return useQuery({
    queryKey: ['planningWeeks', count],
    queryFn: async (): Promise<{ success: boolean; data: PlanningWeekWithDisplay[] }> => {
      const response = await fetch(`/api/planning-weeks?count=${count}`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch planning weeks')
      return response.json()
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - planning weeks rarely change
    gcTime: 60 * 60 * 1000, // 1 hour in cache
  })
}

// Demand Forecasts
export function useDemandForecasts(planningWeekId?: string, page: number = 1, pageSize: number = 50) {
  return useQuery({
    queryKey: ['demandForecasts', planningWeekId, page, pageSize],
    queryFn: async (): Promise<DemandForecastsResponse> => {
      const params = new URLSearchParams()
      if (planningWeekId) params.append('planningWeekId', planningWeekId)
      params.append('page', page.toString())
      params.append('pageSize', pageSize.toString())

      const response = await fetch(`/api/demand?${params.toString()}`, {
        credentials: 'include',
      })
      if (!response.ok) throw new Error('Failed to fetch demand forecasts')
      return response.json()
    },
    enabled: !!planningWeekId,
  })
}

interface CreateDemandForecastInput {
  planningWeekId: string
  clientId: string
  pickupCityId: string
  dropoffCityId: string
  vertical: 'DOMESTIC' | 'PORTS'
  truckTypeId: string
  day1Loads?: number
  day2Loads?: number
  day3Loads?: number
  day4Loads?: number
  day5Loads?: number
  day6Loads?: number
  day7Loads?: number
}

export function useCreateDemandForecast() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateDemandForecastInput) => {
      const response = await fetch('/api/demand', {
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
      queryClient.invalidateQueries({ queryKey: ['demandForecasts', variables.planningWeekId] })
    },
  })
}

interface UpdateDemandForecastInput {
  id: string
  clientId?: string
  pickupCityId?: string
  dropoffCityId?: string
  day1Loads?: number
  day2Loads?: number
  day3Loads?: number
  day4Loads?: number
  day5Loads?: number
  day6Loads?: number
  day7Loads?: number
  vertical?: 'DOMESTIC' | 'PORTS'
  truckTypeId?: string
  [key: string]: string | number | undefined
}

export function useUpdateDemandForecast() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateDemandForecastInput) => {
      const response = await fetch(`/api/demand/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error?.message || 'Update failed')
      return result.data
    },
    // Optimistic update - update cache immediately without refetch
    onMutate: async ({ id, ...data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['demandForecasts'] })

      // Get all demand forecast queries in cache
      const queries = queryClient.getQueriesData<DemandForecastsResponse>({ queryKey: ['demandForecasts'] })

      // Update each query's cache
      queries.forEach(([queryKey, oldData]) => {
        if (oldData?.data) {
          const updatedData = oldData.data.map((forecast) => {
            if (forecast.id === id) {
              // Calculate new total
              const day1 = data.day1Loads ?? forecast.day1Loads
              const day2 = data.day2Loads ?? forecast.day2Loads
              const day3 = data.day3Loads ?? forecast.day3Loads
              const day4 = data.day4Loads ?? forecast.day4Loads
              const day5 = data.day5Loads ?? forecast.day5Loads
              const day6 = data.day6Loads ?? forecast.day6Loads
              const day7 = data.day7Loads ?? forecast.day7Loads
              const totalLoads = day1 + day2 + day3 + day4 + day5 + day6 + day7

              return { ...forecast, ...data, totalLoads, updatedAt: new Date() }
            }
            return forecast
          })

          queryClient.setQueryData(queryKey, {
            ...oldData,
            data: updatedData,
          })
        }
      })

      return { queries }
    },
    // If mutation fails, rollback
    onError: (err, variables, context) => {
      if (context?.queries) {
        context.queries.forEach(([queryKey, oldData]) => {
          queryClient.setQueryData(queryKey, oldData)
        })
      }
    },
  })
}

export function useDeleteDemandForecast() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/demand/${id}`, { method: 'DELETE', credentials: 'include' })
      const result = await response.json()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandForecasts'] })
    },
  })
}
