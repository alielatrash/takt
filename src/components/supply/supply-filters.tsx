'use client'

import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MultiSelectCombobox, type MultiSelectOption } from '@/components/ui/multi-select-combobox'
import { useClients, useCities, useTruckTypes, useDemandCategories } from '@/hooks/use-repositories'
import { useOrganizationSettings } from '@/hooks/use-organization'
import { Card, CardContent } from '@/components/ui/card'
import { useQuery } from '@tanstack/react-query'

export interface SupplyFilters {
  plannerIds: string[]
  clientIds: string[]
  categoryIds: string[]
  truckTypeIds: string[]
  cityIds: string[]
}

interface SupplyFiltersProps {
  planningWeekId?: string
  filters: SupplyFilters
  onFiltersChange: (filters: SupplyFilters) => void
}

export function SupplyFiltersComponent({ planningWeekId, filters, onFiltersChange }: SupplyFiltersProps) {
  const { data: clients } = useClients()
  const { data: cities } = useCities()
  const { data: truckTypes } = useTruckTypes()
  const { data: categories } = useDemandCategories()
  const { data: orgSettings } = useOrganizationSettings()

  // Fetch unique demand planners from the demand forecasts for this planning week
  const { data: plannersData } = useQuery({
    queryKey: ['demand-planners', planningWeekId],
    queryFn: async () => {
      if (!planningWeekId) return []
      const res = await fetch(`/api/demand/planners?planningWeekId=${planningWeekId}`)
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || 'Failed to load planners')
      return json.data as Array<{ id: string; firstName: string; lastName: string }>
    },
    enabled: !!planningWeekId,
  })

  const isCategoryEnabled = orgSettings?.demandCategoryEnabled || false
  const categoryLabel = orgSettings?.demandCategoryLabel || 'Category'

  const plannerOptions: MultiSelectOption[] = plannersData?.map(p => ({
    value: p.id,
    label: `${p.firstName} ${p.lastName}`,
  })) || []

  const clientOptions: MultiSelectOption[] = clients?.data?.map(c => ({
    value: c.id,
    label: c.name,
  })) || []

  const cityOptions: MultiSelectOption[] = cities?.data?.map(c => ({
    value: c.id,
    label: c.name,
  })) || []

  const categoryOptions: MultiSelectOption[] = categories?.data?.map(c => ({
    value: c.id,
    label: c.name,
  })) || []

  const truckTypeOptions: MultiSelectOption[] = truckTypes?.data?.map(t => ({
    value: t.id,
    label: t.name,
  })) || []

  const hasActiveFilters =
    filters.plannerIds.length > 0 ||
    filters.clientIds.length > 0 ||
    filters.categoryIds.length > 0 ||
    filters.truckTypeIds.length > 0 ||
    filters.cityIds.length > 0

  const clearFilters = () => {
    onFiltersChange({
      plannerIds: [],
      clientIds: [],
      categoryIds: [],
      truckTypeIds: [],
      cityIds: [],
    })
  }

  return (
    <Card>
      <CardContent className="py-[5px]">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          <div className="flex-1 flex gap-3 flex-wrap">
            <div className="min-w-[200px]">
              <MultiSelectCombobox
                options={plannerOptions}
                value={filters.plannerIds}
                onValueChange={(value) => onFiltersChange({ ...filters, plannerIds: value })}
                placeholder="Demand Planner"
                searchPlaceholder="Search planners..."
                emptyText="No planners found"
              />
            </div>

            <div className="min-w-[200px]">
              <MultiSelectCombobox
                options={clientOptions}
                value={filters.clientIds}
                onValueChange={(value) => onFiltersChange({ ...filters, clientIds: value })}
                placeholder="Client"
                searchPlaceholder="Search clients..."
                emptyText="No clients found"
              />
            </div>

            <div className="min-w-[200px]">
              <MultiSelectCombobox
                options={cityOptions}
                value={filters.cityIds}
                onValueChange={(value) => onFiltersChange({ ...filters, cityIds: value })}
                placeholder="City"
                searchPlaceholder="Search cities..."
                emptyText="No cities found"
              />
            </div>

            {isCategoryEnabled && (
              <div className="min-w-[200px]">
                <MultiSelectCombobox
                  options={categoryOptions}
                  value={filters.categoryIds}
                  onValueChange={(value) => onFiltersChange({ ...filters, categoryIds: value })}
                  placeholder={categoryLabel}
                  searchPlaceholder={`Search ${categoryLabel.toLowerCase()}...`}
                  emptyText={`No ${categoryLabel.toLowerCase()} found`}
                />
              </div>
            )}

            <div className="min-w-[200px]">
              <MultiSelectCombobox
                options={truckTypeOptions}
                value={filters.truckTypeIds}
                onValueChange={(value) => onFiltersChange({ ...filters, truckTypeIds: value })}
                placeholder="Truck Type"
                searchPlaceholder="Search truck types..."
                emptyText="No truck types found"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-2">
              <X className="h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
