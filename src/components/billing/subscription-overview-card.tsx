'use client'

import { useState } from 'react'
import { CreditCard, TrendingUp, Calendar, AlertCircle, ExternalLink } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useCurrentOrganization } from '@/hooks/use-organization'
import { formatDistanceToNow } from 'date-fns'
import { PlanSelectorDialog } from './plan-selector-dialog'

export function SubscriptionOverviewCard() {
  const { data: organization, isLoading } = useCurrentOrganization()
  const [planSelectorOpen, setPlanSelectorOpen] = useState(false)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription & Billing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">Loading subscription details...</div>
        </CardContent>
      </Card>
    )
  }

  const tierName = organization?.subscriptionTier === 'STARTER' ? 'Starter' :
                   organization?.subscriptionTier === 'PROFESSIONAL' ? 'Professional' :
                   organization?.subscriptionTier === 'ENTERPRISE' ? 'Enterprise' : 'Free'

  const statusVariant =
    organization?.subscriptionStatus === 'ACTIVE' ? 'default' :
    organization?.subscriptionStatus === 'FREE_TRIAL' ? 'secondary' :
    organization?.subscriptionStatus === 'PAST_DUE' ? 'destructive' :
    'outline'

  const statusLabel =
    organization?.subscriptionStatus === 'ACTIVE' ? 'Active' :
    organization?.subscriptionStatus === 'FREE_TRIAL' ? 'Free Trial' :
    organization?.subscriptionStatus === 'PAST_DUE' ? 'Past Due' :
    organization?.subscriptionStatus === 'CANCELLED' ? 'Cancelled' : 'Unknown'

  const billingCycle = organization?.currentBillingCycle === 'MONTHLY' ? 'Monthly' :
                       organization?.currentBillingCycle === 'ANNUAL' ? 'Annual' : null

  const isTrialEnding = organization?.subscriptionStatus === 'FREE_TRIAL' && organization?.trialEndsAt
  const trialDaysLeft = isTrialEnding ? Math.max(0, Math.ceil((new Date(organization.trialEndsAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : 0

  const isCancelled = organization?.subscriptionCancelAtPeriodEnd
  const periodEnd = organization?.subscriptionCurrentPeriodEnd ? new Date(organization.subscriptionCurrentPeriodEnd) : null

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription & Billing
              </CardTitle>
              <CardDescription>
                Manage your subscription plan and billing
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trial Warning */}
          {isTrialEnding && trialDaysLeft <= 7 && (
            <div className="rounded-lg border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                    {trialDaysLeft === 0 ? 'Trial ends today' : `Trial ends in ${trialDaysLeft} ${trialDaysLeft === 1 ? 'day' : 'days'}`}
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    Upgrade to a paid plan to continue using Takt without interruption.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setPlanSelectorOpen(true)}
                  className="bg-orange-600 hover:bg-orange-700 flex-shrink-0"
                >
                  Upgrade Now
                </Button>
              </div>
            </div>
          )}

          {/* Past Due Warning */}
          {organization?.subscriptionStatus === 'PAST_DUE' && (
            <div className="rounded-lg border-2 border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900 dark:text-red-100 mb-1">
                    Payment Failed
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Your payment method was declined. Please update your payment information to avoid service interruption.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="flex-shrink-0"
                >
                  Update Payment
                </Button>
              </div>
            </div>
          )}

          {/* Cancellation Notice */}
          {isCancelled && periodEnd && (
            <div className="rounded-lg border border-muted bg-muted/50 p-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium mb-1">
                    Subscription Ending
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your subscription will end on {periodEnd.toLocaleDateString()}. You'll still have access until then.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-shrink-0"
                >
                  Reactivate
                </Button>
              </div>
            </div>
          )}

          {/* Current Plan */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Current Plan</p>
              <div className="flex items-center gap-2">
                <p className="text-2xl font-bold">{tierName}</p>
                <Badge variant={statusVariant}>{statusLabel}</Badge>
              </div>
              {billingCycle && (
                <p className="text-sm text-muted-foreground">
                  Billed {billingCycle}
                </p>
              )}
            </div>

            {periodEnd && !isCancelled && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Next Billing Date</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{periodEnd.toLocaleDateString()}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {formatDistanceToNow(periodEnd, { addSuffix: true })}
                </p>
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Team Members</p>
                <p className="text-lg font-semibold">{organization?._count?.members || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Active Locations</p>
                <p className="text-lg font-semibold">{organization?._count?.locations || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Planning Weeks</p>
                <p className="text-lg font-semibold">{organization?._count?.planningWeeks || 0}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setPlanSelectorOpen(true)}
              className="gap-2"
            >
              <TrendingUp className="h-4 w-4" />
              {organization?.subscriptionStatus === 'FREE_TRIAL' ? 'Upgrade Plan' : 'Change Plan'}
            </Button>

            {organization?.subscriptionStatus !== 'FREE_TRIAL' && (
              <Button
                variant="outline"
                className="gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Billing Portal
              </Button>
            )}
          </div>

          {/* Helpful Info */}
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Upgrades take effect immediately with prorated billing</p>
            <p>• Downgrades take effect at the end of your current billing period</p>
            <p>• Contact support for custom Enterprise plans</p>
          </div>
        </CardContent>
      </Card>

      <PlanSelectorDialog
        open={planSelectorOpen}
        onOpenChange={setPlanSelectorOpen}
        currentTier={organization?.subscriptionTier || 'STARTER'}
        currentCycle={organization?.currentBillingCycle || 'MONTHLY'}
      />
    </>
  )
}
