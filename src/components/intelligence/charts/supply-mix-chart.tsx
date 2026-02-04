'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import type { SupplierContribution } from '@/lib/intelligence-metrics'

interface SupplyMixChartProps {
  data?: {
    suppliers: SupplierContribution[]
    trend: {
      days: string[]
      topSupplierShare: number[]
    }
  }
  isLoading?: boolean
  height?: number
}

const COLORS = [
  'hsl(221, 83%, 53%)', // Blue
  'hsl(142, 76%, 36%)', // Green
  'hsl(48, 96%, 53%)', // Yellow
  'hsl(25, 95%, 53%)', // Orange
  'hsl(262, 83%, 58%)', // Purple
  'hsl(0, 84%, 60%)', // Red
  'hsl(173, 80%, 40%)', // Teal
  'hsl(340, 82%, 52%)', // Pink
]

export function SupplyMixChart({ data, isLoading, height = 400 }: SupplyMixChartProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!data || data.suppliers.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  // Prepare data for donut chart (top 5 + others)
  const top5 = data.suppliers.slice(0, 5)
  const othersTotal = data.suppliers
    .slice(5)
    .reduce((sum, s) => sum + s.contribution, 0)
  const othersPercent = data.suppliers
    .slice(5)
    .reduce((sum, s) => sum + s.percentage, 0)

  const donutData = [
    ...top5.map((s) => ({
      name: s.supplierName,
      value: s.contribution,
      percentage: s.percentage,
    })),
    ...(data.suppliers.length > 5
      ? [
          {
            name: 'Others',
            value: othersTotal,
            percentage: othersPercent,
          },
        ]
      : []),
  ]

  // Prepare data for trend line
  const trendData = data.trend.days.map((day, index) => ({
    day,
    share: data.trend.topSupplierShare[index],
  }))

  // Calculate concentration metrics
  const top1Share = data.suppliers[0]?.percentage || 0
  const top3Share = data.suppliers.slice(0, 3).reduce((sum, s) => sum + s.percentage, 0)

  return (
    <div className="flex flex-col" style={{ height }}>
      {/* Concentration metrics */}
      <div className="flex gap-4 mb-4 justify-center">
        <div className="px-3 py-2 rounded-lg bg-muted text-sm">
          <span className="text-muted-foreground">Top Supplier:</span>{' '}
          <span className="font-semibold">{top1Share.toFixed(1)}%</span>
        </div>
        <div className="px-3 py-2 rounded-lg bg-muted text-sm">
          <span className="text-muted-foreground">Top 3 Suppliers:</span>{' '}
          <span className="font-semibold">{top3Share.toFixed(1)}%</span>
        </div>
      </div>

      {/* Donut chart */}
      <div className="flex-1">
        <ResponsiveContainer width="100%" height="60%">
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              paddingAngle={2}
              dataKey="value"
              label={({ percent }: any) => `${(percent * 100).toFixed(1)}%`}
              labelLine={false}
            >
              {donutData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--popover))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
              formatter={(value: number | undefined, name: string | undefined, props: any) => [
                `${value ?? 0} trucks (${props?.payload?.percentage?.toFixed(1) ?? 0}%)`,
                name ?? '',
              ]}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Trend line */}
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2 text-center">Top Supplier Share Trend</h4>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="day"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                tickLine={{ stroke: 'hsl(var(--border))' }}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '0.5rem',
                }}
                formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}%`, 'Share']}
              />
              <Line
                dataKey="share"
                stroke="hsl(221, 83%, 53%)"
                strokeWidth={2}
                dot={{ fill: 'hsl(221, 83%, 53%)', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
