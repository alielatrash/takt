'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PageHeader } from '@/components/layout'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { BarChart3, ClipboardList, Package, Truck, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DashboardData {
  currentWeek: {
    id: string
    weekNumber: number
    year: number
    weekStart: string
    weekEnd: string
  } | null
  metrics: {
    totalDemand: number
    totalCommitted: number
    supplyGap: number
    activeRoutes: number
    gapPercent: number
  }
  topGapRoutes: {
    routeKey: string
    target: number
    committed: number
    gap: number
  }[]
  recentForecasts: {
    id: string
    routeKey: string
    partyName: string | null
    totalQty: number
    createdAt: string
  }[]
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard')
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || 'Failed to load dashboard')
      return json.data as DashboardData
    },
  })

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={data?.currentWeek
          ? `Week ${data.currentWeek.weekNumber}, ${data.currentWeek.year} (${new Date(data.currentWeek.weekStart).toLocaleDateString()} - ${new Date(data.currentWeek.weekEnd).toLocaleDateString()})`
          : 'Overview of demand and supply planning'}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Demand</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-blue-600">
                  {data?.metrics.totalDemand ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Loads forecasted this week
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supply Committed</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {data?.metrics.totalCommitted ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Trucks committed this week
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supply Gap</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${
                  (data?.metrics.supplyGap ?? 0) > 0
                    ? 'text-red-600'
                    : (data?.metrics.supplyGap ?? 0) < 0
                      ? 'text-amber-600'
                      : 'text-gray-600'
                }`}>
                  {data?.metrics.supplyGap ?? 0}
                  <span className="text-sm font-normal ml-1">
                    ({data?.metrics.gapPercent ?? 0}%)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {(data?.metrics.supplyGap ?? 0) > 0 ? 'Unfilled demand' : 'Fully covered'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Routes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {data?.metrics.activeRoutes ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  active routes
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Demand Forecasts</CardTitle>
              <CardDescription>Latest entries from demand planners</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/demand">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data?.recentForecasts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No forecasts yet</p>
            ) : (
              <div className="space-y-3">
                {data?.recentForecasts.map((forecast) => (
                  <div
                    key={forecast.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{forecast.routeKey}</p>
                      <p className="text-sm text-muted-foreground">
                        {forecast.partyName || 'Unknown party'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">{forecast.totalQty} loads</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(forecast.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Supply Gap by Route</CardTitle>
              <CardDescription>Routes with highest unfilled demand</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/supply">
                View all <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data?.topGapRoutes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No gaps - all routes covered</p>
            ) : (
              <div className="space-y-3">
                {data?.topGapRoutes.map((route) => (
                  <div
                    key={route.routeKey}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{route.routeKey}</p>
                      <p className="text-sm text-muted-foreground">
                        Target: {route.target} | Committed: {route.committed}
                      </p>
                    </div>
                    <Badge className={route.gap > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
                      {route.gap > 0 ? `Gap: ${route.gap}` : 'Covered'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
