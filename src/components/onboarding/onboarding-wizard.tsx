'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { ArrowLeft, ArrowRight, Building2, Tag, Calendar, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { pluralize } from '@/lib/pluralize'

interface OnboardingWizardProps {
  initialData: {
    email: string
    password: string
    firstName: string
    lastName: string
    mobileNumber?: string
  }
}

interface OnboardingData {
  // Step 1: Organization
  organizationName: string

  // Step 2: Labels/Terminology (only singular, plurals are auto-generated)
  locationLabel: string
  partyLabel: string
  resourceTypeLabel: string
  demandLabel: string
  supplyLabel: string

  // Step 3: Planning Configuration
  planningCycle: 'daily' | 'weekly' | 'monthly'
  weekStartDay: string
}

const STEPS = [
  { id: 1, title: 'Organization', icon: Building2 },
  { id: 2, title: 'Terminology', icon: Tag },
  { id: 3, title: 'Planning Setup', icon: Calendar },
]

const INDUSTRY_PRESETS = {
  trucking: {
    name: 'Trucking & Logistics',
    labels: {
      locationLabel: 'City',
      partyLabel: 'Partner',
      resourceTypeLabel: 'Truck Type',
      demandLabel: 'Demand',
      supplyLabel: 'Supply',
    },
  },
  manufacturing: {
    name: 'Manufacturing',
    labels: {
      locationLabel: 'Factory',
      partyLabel: 'Customer',
      resourceTypeLabel: 'Product',
      demandLabel: 'Order',
      supplyLabel: 'Production',
    },
  },
  retail: {
    name: 'Retail & Distribution',
    labels: {
      locationLabel: 'Store',
      partyLabel: 'Vendor',
      resourceTypeLabel: 'Product',
      demandLabel: 'Demand',
      supplyLabel: 'Inventory',
    },
  },
  warehouse: {
    name: 'Warehousing',
    labels: {
      locationLabel: 'Warehouse',
      partyLabel: 'Client',
      resourceTypeLabel: 'Material',
      demandLabel: 'Requirement',
      supplyLabel: 'Capacity',
    },
  },
  custom: {
    name: 'Custom',
    labels: {
      locationLabel: 'Location',
      partyLabel: 'Partner',
      resourceTypeLabel: 'Resource Type',
      demandLabel: 'Demand',
      supplyLabel: 'Supply',
    },
  },
}

export function OnboardingWizard({ initialData }: OnboardingWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndustry, setSelectedIndustry] = useState<keyof typeof INDUSTRY_PRESETS>('trucking')

  const [data, setData] = useState<OnboardingData>({
    organizationName: '',
    ...INDUSTRY_PRESETS.trucking.labels,
    planningCycle: 'daily',
    weekStartDay: 'sunday',
  })

  const handleIndustryChange = (industry: keyof typeof INDUSTRY_PRESETS) => {
    setSelectedIndustry(industry)
    setData({
      ...data,
      ...INDUSTRY_PRESETS[industry].labels,
    })
  }

  const handleNext = () => {
    if (currentStep === 1 && !data.organizationName.trim()) {
      toast.error('Organization name is required')
      return
    }
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsLoading(true)
    try {
      // Auto-generate plural forms
      const organizationSettings = {
        locationLabel: data.locationLabel,
        locationLabelPlural: pluralize(data.locationLabel),
        partyLabel: data.partyLabel,
        partyLabelPlural: pluralize(data.partyLabel),
        resourceTypeLabel: data.resourceTypeLabel,
        resourceTypeLabelPlural: pluralize(data.resourceTypeLabel),
        demandLabel: data.demandLabel,
        demandLabelPlural: pluralize(data.demandLabel),
        supplyLabel: data.supplyLabel,
        supplyLabelPlural: pluralize(data.supplyLabel),
        planningCycle: data.planningCycle,
        weekStartDay: data.weekStartDay,
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...initialData,
          organizationName: data.organizationName,
          planningCycle: data.planningCycle.toUpperCase(), // DAILY, WEEKLY, MONTHLY
          weekStartDay: data.weekStartDay.toUpperCase(), // SUNDAY, MONDAY, SATURDAY
          organizationSettings,
        }),
        credentials: 'include',
      })

      const result = await response.json()

      if (!result.success) {
        toast.error(result.error.message)
        return
      }

      toast.success('Welcome to Takt! Your organization is ready.')
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const progressPercentage = (currentStep / STEPS.length) * 100

  return (
    <div className="w-full max-w-3xl space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Setup Progress</span>
          <span className="text-muted-foreground">Step {currentStep} of {STEPS.length}</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />

        {/* Step indicators */}
        <div className="flex justify-between pt-2">
          {STEPS.map((step) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isCompleted = currentStep > step.id

            return (
              <div key={step.id} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    isCompleted
                      ? 'bg-primary text-primary-foreground'
                      : isActive
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-sm ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                  {step.title}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 1 && 'Create Your Organization'}
            {currentStep === 2 && 'Customize Terminology'}
            {currentStep === 3 && 'Planning Configuration'}
          </CardTitle>
          <CardDescription>
            {currentStep === 1 && 'Choose a name for your organization'}
            {currentStep === 2 && 'Adapt the labels to match your industry'}
            {currentStep === 3 && 'Configure how you plan and forecast'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Step 1: Organization Name */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="org-name">Organization Name</Label>
                <Input
                  id="org-name"
                  value={data.organizationName}
                  onChange={(e) => setData({ ...data, organizationName: e.target.value })}
                  placeholder="Acme Corporation"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This will be visible to all members of your organization
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Labels/Terminology */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="industry">Industry Preset</Label>
                <Select value={selectedIndustry} onValueChange={handleIndustryChange}>
                  <SelectTrigger id="industry" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INDUSTRY_PRESETS).map(([key, preset]) => (
                      <SelectItem key={key} value={key}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Select a preset to auto-fill terminology, or choose Custom to define your own
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="locationLabel">Location</Label>
                  <Input
                    id="locationLabel"
                    value={data.locationLabel}
                    onChange={(e) => setData({ ...data, locationLabel: e.target.value })}
                    placeholder="City, Warehouse, Factory, Store"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Will be pluralized automatically → {pluralize(data.locationLabel || 'Location')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="partyLabel">Partner/Customer</Label>
                  <Input
                    id="partyLabel"
                    value={data.partyLabel}
                    onChange={(e) => setData({ ...data, partyLabel: e.target.value })}
                    placeholder="Client, Customer, Vendor, Partner"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Will be pluralized automatically → {pluralize(data.partyLabel || 'Partner')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="resourceTypeLabel">Resource Type</Label>
                  <Input
                    id="resourceTypeLabel"
                    value={data.resourceTypeLabel}
                    onChange={(e) => setData({ ...data, resourceTypeLabel: e.target.value })}
                    placeholder="Product, Truck Type, Material"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Will be pluralized automatically → {pluralize(data.resourceTypeLabel || 'Resource Type')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="demandLabel">Demand</Label>
                  <Input
                    id="demandLabel"
                    value={data.demandLabel}
                    onChange={(e) => setData({ ...data, demandLabel: e.target.value })}
                    placeholder="Order, Demand, Requirement"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Will be pluralized automatically → {pluralize(data.demandLabel || 'Demand')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="supplyLabel">Supply</Label>
                  <Input
                    id="supplyLabel"
                    value={data.supplyLabel}
                    onChange={(e) => setData({ ...data, supplyLabel: e.target.value })}
                    placeholder="Supply, Capacity, Production, Inventory"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Will be pluralized automatically → {pluralize(data.supplyLabel || 'Supply')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Planning Configuration */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <Label htmlFor="planningCycle">Planning Cycle</Label>
                <Select
                  value={data.planningCycle}
                  onValueChange={(value) => setData({ ...data, planningCycle: value as any })}
                >
                  <SelectTrigger id="planningCycle" className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily - Plan day by day</SelectItem>
                    <SelectItem value="weekly">Weekly - Plan week by week</SelectItem>
                    <SelectItem value="monthly">Monthly - Plan month by month</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose how frequently you plan and forecast
                </p>
              </div>

              {data.planningCycle === 'weekly' && (
                <div>
                  <Label htmlFor="weekStartDay">Week Start Day</Label>
                  <Select
                    value={data.weekStartDay}
                    onValueChange={(value) => setData({ ...data, weekStartDay: value })}
                  >
                    <SelectTrigger id="weekStartDay" className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sunday">Sunday</SelectItem>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="saturday">Saturday</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose which day starts your planning week
                  </p>
                </div>
              )}

              <div className="rounded-lg border bg-muted p-4">
                <p className="text-sm font-semibold text-foreground mb-2">
                  Configuration Summary:
                </p>
                <ul className="space-y-1.5 text-sm text-foreground">
                  <li>• Organization: {data.organizationName}</li>
                  <li>• Planning: {data.planningCycle.charAt(0).toUpperCase() + data.planningCycle.slice(1)}</li>
                  <li>• Locations: {data.locationLabel} / {pluralize(data.locationLabel)}</li>
                  <li>• Resources: {data.resourceTypeLabel} / {pluralize(data.resourceTypeLabel)}</li>
                  <li>• Partners: {data.partyLabel} / {pluralize(data.partyLabel)}</li>
                </ul>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 1 || isLoading}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            {currentStep < STEPS.length ? (
              <Button onClick={handleNext} disabled={isLoading}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleComplete} disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Complete Setup'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
