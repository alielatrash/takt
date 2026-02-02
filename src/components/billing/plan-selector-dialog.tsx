'use client'

import { useState } from 'react'
import { Check, Sparkles, Building2, Rocket } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { getPricing, getTierFeatures, getAnnualSavings } from '@/lib/stripe'

interface PlanSelectorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentTier: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  currentCycle: 'MONTHLY' | 'ANNUAL'
}

type BillingCycle = 'MONTHLY' | 'ANNUAL'
type Tier = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'

export function PlanSelectorDialog({
  open,
  onOpenChange,
  currentTier,
  currentCycle,
}: PlanSelectorDialogProps) {
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>(currentCycle)
  const pricing = getPricing()

  const handleSelectPlan = (tier: Tier) => {
    if (tier === currentTier && selectedCycle === currentCycle) {
      return // Already on this plan
    }

    // TODO: Open confirmation dialog or redirect to checkout
    console.log('Selected plan:', { tier, cycle: selectedCycle })
  }

  const tierOrder: Record<Tier, number> = {
    STARTER: 1,
    PROFESSIONAL: 2,
    ENTERPRISE: 3,
  }

  const isCurrentPlan = (tier: Tier) => tier === currentTier && selectedCycle === currentCycle
  const isUpgrade = (tier: Tier) => tierOrder[tier] > tierOrder[currentTier]
  const isDowngrade = (tier: Tier) => tierOrder[tier] < tierOrder[currentTier]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1200px] w-[95vw] max-h-[90vh] overflow-y-auto p-6 sm:max-w-[1200px]">
        <DialogHeader className="space-y-2 pb-4">
          <DialogTitle className="text-2xl font-bold text-center">Choose Your Plan</DialogTitle>
          <DialogDescription className="text-center text-sm">
            Select the plan that best fits your team's needs
          </DialogDescription>
        </DialogHeader>

        {/* Billing Cycle Toggle */}
        <div className="flex items-center justify-center gap-4 py-4 border-y">
          <Label className={cn(
            'cursor-pointer transition-colors',
            selectedCycle === 'MONTHLY' ? 'text-foreground' : 'text-muted-foreground'
          )}>
            Monthly
          </Label>
          <button
            onClick={() => setSelectedCycle(selectedCycle === 'MONTHLY' ? 'ANNUAL' : 'MONTHLY')}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
              selectedCycle === 'ANNUAL' ? 'bg-primary' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                selectedCycle === 'ANNUAL' ? 'translate-x-6' : 'translate-x-1'
              )}
            />
          </button>
          <Label className={cn(
            'cursor-pointer transition-colors flex items-center gap-2',
            selectedCycle === 'ANNUAL' ? 'text-foreground' : 'text-muted-foreground'
          )}>
            Annual
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400">
              Save {getAnnualSavings('PROFESSIONAL')}%
            </Badge>
          </Label>
        </div>

        {/* Plans Grid */}
        <div className="grid gap-4 md:grid-cols-3 py-4">
          {/* Starter Plan */}
          <div className={cn(
            'relative rounded-lg border-2 p-5 transition-all flex flex-col min-w-0',
            isCurrentPlan('STARTER') ? 'border-primary shadow-lg' : 'border-border hover:border-muted-foreground/50'
          )}>
            {isCurrentPlan('STARTER') && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-xs">
                Current Plan
              </Badge>
            )}

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-5 w-5 text-blue-500 flex-shrink-0" />
                <h3 className="text-xl font-bold">Starter</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Perfect for small teams getting started
              </p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold whitespace-nowrap">
                  {pricing.STARTER[selectedCycle === 'MONTHLY' ? 'monthly' : 'annual'].formatted}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                per {selectedCycle === 'MONTHLY' ? 'month' : 'year'}
              </p>
              {selectedCycle === 'ANNUAL' && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  SAR 833/month billed annually
                </p>
              )}
            </div>

            <ul className="space-y-2.5 mb-6 flex-grow">
              {getTierFeatures('STARTER').map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs leading-relaxed">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full"
              variant={isCurrentPlan('STARTER') ? 'outline' : 'default'}
              disabled={isCurrentPlan('STARTER')}
              onClick={() => handleSelectPlan('STARTER')}
            >
              {isCurrentPlan('STARTER') ? 'Current Plan' :
               isDowngrade('STARTER') ? 'Downgrade' : 'Select Plan'}
            </Button>
          </div>

          {/* Professional Plan */}
          <div className={cn(
            'relative rounded-lg border-2 p-5 transition-all flex flex-col min-w-0',
            isCurrentPlan('PROFESSIONAL')
              ? 'border-primary shadow-lg'
              : 'border-purple-500 hover:border-purple-600 shadow-lg bg-gradient-to-b from-purple-50/50 to-transparent dark:from-purple-950/20'
          )}>
            {!isCurrentPlan('PROFESSIONAL') && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-xs">
                Most Popular
              </Badge>
            )}
            {isCurrentPlan('PROFESSIONAL') && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-xs">
                Current Plan
              </Badge>
            )}

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-5 w-5 text-purple-500 flex-shrink-0" />
                <h3 className="text-xl font-bold">Professional</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Advanced features for growing teams
              </p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold whitespace-nowrap">
                  {pricing.PROFESSIONAL[selectedCycle === 'MONTHLY' ? 'monthly' : 'annual'].formatted}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                per {selectedCycle === 'MONTHLY' ? 'month' : 'year'}
              </p>
              {selectedCycle === 'ANNUAL' && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  SAR 1,666/month billed annually
                </p>
              )}
            </div>

            <ul className="space-y-2.5 mb-6 flex-grow">
              {getTierFeatures('PROFESSIONAL').map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs leading-relaxed">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              variant={isCurrentPlan('PROFESSIONAL') ? 'outline' : 'default'}
              disabled={isCurrentPlan('PROFESSIONAL')}
              onClick={() => handleSelectPlan('PROFESSIONAL')}
            >
              {isCurrentPlan('PROFESSIONAL') ? 'Current Plan' :
               isDowngrade('PROFESSIONAL') ? 'Downgrade' :
               isUpgrade('PROFESSIONAL') ? 'Upgrade' : 'Select Plan'}
            </Button>
          </div>

          {/* Enterprise Plan */}
          <div className={cn(
            'relative rounded-lg border-2 p-5 transition-all flex flex-col min-w-0',
            isCurrentPlan('ENTERPRISE') ? 'border-primary shadow-lg' : 'border-border hover:border-muted-foreground/50'
          )}>
            {isCurrentPlan('ENTERPRISE') && (
              <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-xs">
                Current Plan
              </Badge>
            )}

            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Rocket className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <h3 className="text-xl font-bold">Enterprise</h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Full power for large organizations
              </p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold whitespace-nowrap">
                  Contact Sales
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Custom pricing for your needs
              </p>
            </div>

            <ul className="space-y-2.5 mb-6 flex-grow">
              {getTierFeatures('ENTERPRISE').map((feature, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs leading-relaxed">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              className="w-full"
              variant={isCurrentPlan('ENTERPRISE') ? 'outline' : 'default'}
              disabled={isCurrentPlan('ENTERPRISE')}
              onClick={() => handleSelectPlan('ENTERPRISE')}
            >
              {isCurrentPlan('ENTERPRISE') ? 'Current Plan' : 'Contact Sales'}
            </Button>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-xs text-muted-foreground mt-3 pt-3 border-t">
          <p>All plans include a 14-day free trial • No credit card required</p>
          <p className="mt-0.5">Questions? Contact our sales team for custom Enterprise plans</p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
