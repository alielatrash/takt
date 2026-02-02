'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Party, Location, ResourceType } from '@prisma/client'

interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

interface SearchParams {
  q?: string
  page?: number
  pageSize?: number
  isActive?: boolean
}

// Generic fetch function
async function fetchData<T>(
  endpoint: string,
  params: SearchParams = {}
): Promise<PaginatedResponse<T>> {
  const searchParams = new URLSearchParams()
  if (params.q) searchParams.set('q', params.q)
  if (params.page) searchParams.set('page', params.page.toString())
  if (params.pageSize) searchParams.set('pageSize', params.pageSize.toString())
  if (params.isActive !== undefined) searchParams.set('isActive', params.isActive.toString())

  const response = await fetch(`${endpoint}?${searchParams.toString()}`, {
    credentials: 'include',
  })
  if (!response.ok) throw new Error('Failed to fetch data')
  return response.json()
}

// Clients
export function useClients(params: SearchParams = {}, enabled: boolean = true) {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: () => fetchData<Party>('/api/clients', params),
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour - master data rarely changes
    gcTime: 2 * 60 * 60 * 1000, // 2 hours in cache
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; code?: string; pointOfContact?: string; phoneNumber?: string }) => {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; code?: string; pointOfContact?: string; phoneNumber?: string }) => {
      const response = await fetch(`/api/clients/${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/clients/${id}`, { method: 'DELETE', credentials: 'include' })
      const result = await response.json()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
    },
  })
}

// Suppliers
export function useSuppliers(params: SearchParams = {}, enabled: boolean = true) {
  return useQuery({
    queryKey: ['suppliers', params],
    queryFn: () => fetchData<Party>('/api/suppliers', params),
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour - master data rarely changes
    gcTime: 2 * 60 * 60 * 1000, // 2 hours in cache
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; code?: string; pointOfContact?: string; phoneNumber?: string }) => {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; code?: string; pointOfContact?: string; phoneNumber?: string }) => {
      const response = await fetch(`/api/suppliers/${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/suppliers/${id}`, { method: 'DELETE', credentials: 'include' })
      const result = await response.json()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })
}

// Cities
export function useCities(params: SearchParams = {}, enabled: boolean = true) {
  return useQuery({
    queryKey: ['cities', params],
    queryFn: () => fetchData<Location>('/api/cities', params),
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour - master data rarely changes
    gcTime: 2 * 60 * 60 * 1000, // 2 hours in cache
  })
}

export function useCreateCity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string; nameAr?: string; code?: string; region?: string }) => {
      const response = await fetch('/api/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] })
    },
  })
}

export function useUpdateCity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string; nameAr?: string; code?: string; region?: string }) => {
      const response = await fetch(`/api/cities/${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ['cities'] })
    },
  })
}

export function useDeleteCity() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/cities/${id}`, { method: 'DELETE', credentials: 'include' })
      const result = await response.json()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cities'] })
    },
  })
}

// Truck Types
export function useTruckTypes(params: SearchParams = {}, enabled: boolean = true) {
  return useQuery({
    queryKey: ['truckTypes', params],
    queryFn: () => fetchData<ResourceType>('/api/truck-types', params),
    enabled,
    staleTime: 60 * 60 * 1000, // 1 hour - master data rarely changes
    gcTime: 2 * 60 * 60 * 1000, // 2 hours in cache
  })
}

export function useCreateTruckType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { name: string }) => {
      const response = await fetch('/api/truck-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      })
      const result = await response.json()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['truckTypes'] })
    },
  })
}

export function useUpdateTruckType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name?: string }) => {
      const response = await fetch(`/api/truck-types/${id}`, {
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
      queryClient.invalidateQueries({ queryKey: ['truckTypes'] })
    },
  })
}

export function useDeleteTruckType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/truck-types/${id}`, { method: 'DELETE', credentials: 'include' })
      const result = await response.json()
      if (!result.success) throw new Error(result.error.message)
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['truckTypes'] })
    },
  })
}
