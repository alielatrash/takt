'use client'

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface DemandVsCommittedChartProps {
  data?: {
    days: string[]
    demand: number[]
    committed: number[]
    gap: number[]
  }
  isLoading?: boolean
  height?: number
}

export function DemandVsCommittedChart({
  data,
  isLoading,
  height = 350,
}: DemandVsCommittedChartProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!data || data.days.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  // Transform data for Recharts
  const chartData = data.days.map((day, index) => ({
    day,
    demand: data.demand[index],
    committed: data.committed[index],
    gap: data.gap[index],
    coverage: data.demand[index] > 0 ? ((data.committed[index] / data.demand[index]) * 100).toFixed(1) : '0.0',
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="day"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
          label={{ value: 'Trucks', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
          }}
          labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
          formatter={(value: number | undefined, name: string | undefined) => {
            const labels: Record<string, string> = {
              demand: 'Demand',
              committed: 'Committed',
              gap: 'Gap',
            }
            return [value ?? 0, name ? (labels[name] || name) : '']
          }}
          content={({ active, payload }) => {
            if (!active || !payload || payload.length === 0) return null
            const data = payload[0].payload
            return (
              <div className="rounded-lg border bg-popover p-3 shadow-md">
                <p className="font-semibold mb-2">{data.day}</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Demand:</span>
                    <span className="font-medium">{data.demand}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Committed:</span>
                    <span className="font-medium">{data.committed}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Gap:</span>
                    <span className="font-medium">{data.gap}</span>
                  </div>
                  <div className="flex justify-between gap-4 pt-1 border-t">
                    <span className="text-muted-foreground">Coverage:</span>
                    <span className="font-medium">{data.coverage}%</span>
                  </div>
                </div>
              </div>
            )
          }}
        />
        <Legend
          wrapperStyle={{ paddingTop: '10px' }}
          iconType="rect"
          formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>}
        />
        <Bar dataKey="committed" fill="hsl(142, 76%, 36%)" name="Committed" radius={[4, 4, 0, 0]} />
        <Bar dataKey="gap" stackId="stack" fill="hsl(0, 84%, 60%)" name="Gap" radius={[4, 4, 0, 0]} />
        <Line
          dataKey="demand"
          stroke="hsl(221, 83%, 53%)"
          strokeWidth={2}
          dot={{ fill: 'hsl(221, 83%, 53%)', r: 4 }}
          name="Target Demand"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
