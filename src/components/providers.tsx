'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { DataPrefetcher } from '@/components/data-prefetcher'
import { DatabaseKeepAlive } from '@/components/database-keep-alive'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes (planning data doesn't change frequently)
            gcTime: 10 * 60 * 1000, // 10 minutes (keep in cache)
            refetchOnWindowFocus: false,
            retry: 1, // Only retry once on failure
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <DataPrefetcher />
      <DatabaseKeepAlive />
      {children}
      <Toaster richColors position="top-right" closeButton duration={3000} />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
