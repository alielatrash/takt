'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
  ReferenceLine,
} from 'recharts'

interface CapacityUtilizationChartProps {
  data?: {
    days: string[]
    utilization: number[]
    threshold: number
  }
  isLoading?: boolean
  height?: number
}

export function CapacityUtilizationChart({
  data,
  isLoading,
  height = 300,
}: CapacityUtilizationChartProps) {
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
    utilization: data.utilization[index],
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="day"
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
        />
        <YAxis
          domain={[0, 120]}
          tick={{ fill: 'hsl(var(--muted-foreground))' }}
          tickLine={{ stroke: 'hsl(var(--border))' }}
          label={{ value: 'Coverage %', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
        />

        {/* Color zones: green >95%, yellow 80-95%, red <80% */}
        <ReferenceArea y1={95} y2={120} fill="hsl(142, 76%, 36%)" fillOpacity={0.1} />
        <ReferenceArea y1={80} y2={95} fill="hsl(48, 96%, 53%)" fillOpacity={0.1} />
        <ReferenceArea y1={0} y2={80} fill="hsl(0, 84%, 60%)" fillOpacity={0.1} />

        {/* Threshold lines */}
        <ReferenceLine y={95} stroke="hsl(142, 76%, 36%)" strokeDasharray="3 3" label="Target 95%" />
        <ReferenceLine y={data.threshold} stroke="hsl(48, 96%, 53%)" strokeDasharray="3 3" label={`Threshold ${data.threshold}%`} />

        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '0.5rem',
          }}
          labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
          formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, 'Coverage']}
        />
        <Legend
          wrapperStyle={{ paddingTop: '10px' }}
          iconType="line"
          formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>}
        />
        <Line
          dataKey="utilization"
          stroke="hsl(221, 83%, 53%)"
          strokeWidth={3}
          dot={{ fill: 'hsl(221, 83%, 53%)', r: 5 }}
          name="Coverage %"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
