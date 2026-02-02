'use client'

import { useState } from 'react'
import { Plus, Trash2, Shield, Users, Globe, Building2, Check, X, Copy, CheckCircle2, AlertCircle, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  useCurrentOrganization,
  useOrganizationDomains,
  useOrganizationMembers,
  useOrganizationSettings,
  useUpdateOrganization,
  useUpdateOrganizationSettings,
  useAddDomain,
  useRemoveDomain,
  useUpdateDomain,
  useInviteMember,
  useRemoveMember,
  useUpdateMemberRole,
  useVerifyDomain,
} from '@/hooks/use-organization'
import { useAuth } from '@/hooks/use-auth'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { SubscriptionOverviewCard } from '@/components/billing/subscription-overview-card'

export default function OrganizationSettingsPage() {
  const { data: authData } = useAuth()
  const { data: organization, isLoading: orgLoading } = useCurrentOrganization()
  const { data: domains, isLoading: domainsLoading } = useOrganizationDomains()
  const { data: members, isLoading: membersLoading } = useOrganizationMembers()
  const { data: settings, isLoading: settingsLoading } = useOrganizationSettings()

  const updateOrg = useUpdateOrganization()
  const updateSettings = useUpdateOrganizationSettings()
  const addDomain = useAddDomain()
  const removeDomain = useRemoveDomain()
  const updateDomain = useUpdateDomain()
  const verifyDomain = useVerifyDomain()
  const inviteMember = useInviteMember()
  const removeMember = useRemoveMember()
  const updateMemberRole = useUpdateMemberRole()

  const [orgName, setOrgName] = useState('')
  const [orgCountry, setOrgCountry] = useState('')
  const [newDomain, setNewDomain] = useState('')
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER')
  const [newMemberFunctionalRole, setNewMemberFunctionalRole] = useState<'DEMAND_PLANNER' | 'SUPPLY_PLANNER' | 'ADMIN'>('DEMAND_PLANNER')
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false)
  const [selectedDomain, setSelectedDomain] = useState<any>(null)

  const [editOrgDialogOpen, setEditOrgDialogOpen] = useState(false)
  const [addDomainDialogOpen, setAddDomainDialogOpen] = useState(false)
  const [inviteMemberDialogOpen, setInviteMemberDialogOpen] = useState(false)
  const [editLabelsDialogOpen, setEditLabelsDialogOpen] = useState(false)

  // Label settings state
  const [labels, setLabels] = useState({
    locationLabel: '',
    locationLabelPlural: '',
    partyLabel: '',
    partyLabelPlural: '',
    resourceTypeLabel: '',
    resourceTypeLabelPlural: '',
    demandLabel: '',
    demandLabelPlural: '',
    supplyLabel: '',
    supplyLabelPlural: '',
  })

  const isOwner = authData?.user?.currentOrgRole === 'OWNER'
  const isAdmin = authData?.user?.currentOrgRole === 'ADMIN'

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const handleVerifyDomain = (domainId: string) => {
    verifyDomain.mutate(domainId)
  }

  const handleUpdateOrg = () => {
    if (!orgName.trim()) return
    updateOrg.mutate({ name: orgName, country: orgCountry || undefined }, {
      onSuccess: () => {
        setEditOrgDialogOpen(false)
        setOrgName('')
        setOrgCountry('')
      },
    })
  }

  const handleAddDomain = () => {
    if (!newDomain.trim()) return
    addDomain.mutate(newDomain, {
      onSuccess: () => {
        setAddDomainDialogOpen(false)
        setNewDomain('')
      },
    })
  }

  const handleInviteMember = () => {
    if (!newMemberEmail.trim()) return
    inviteMember.mutate({
      email: newMemberEmail,
      role: newMemberRole,
      functionalRole: newMemberFunctionalRole,
    }, {
      onSuccess: () => {
        setInviteMemberDialogOpen(false)
        setNewMemberEmail('')
        setNewMemberRole('MEMBER')
        setNewMemberFunctionalRole('DEMAND_PLANNER')
      },
    })
  }

  const handleUpdateLabels = () => {
    updateSettings.mutate(labels, {
      onSuccess: () => {
        setEditLabelsDialogOpen(false)
      },
    })
  }

  const handleOpenLabelsDialog = () => {
    if (settings) {
      setLabels({
        locationLabel: settings.locationLabel,
        locationLabelPlural: settings.locationLabelPlural,
        partyLabel: settings.partyLabel,
        partyLabelPlural: settings.partyLabelPlural,
        resourceTypeLabel: settings.resourceTypeLabel,
        resourceTypeLabelPlural: settings.resourceTypeLabelPlural,
        demandLabel: settings.demandLabel,
        demandLabelPlural: settings.demandLabelPlural,
        supplyLabel: settings.supplyLabel,
        supplyLabelPlural: settings.supplyLabelPlural,
      })
    }
    setEditLabelsDialogOpen(true)
  }

  if (orgLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="text-muted-foreground">Loading organization settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organization Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization details, domains, and members
        </p>
      </div>

      {/* Organization Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Details
          </CardTitle>
          <CardDescription>
            Basic information about your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-muted-foreground">Name</Label>
              <p className="text-lg font-medium">{organization?.name}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Slug</Label>
              <p className="text-lg font-medium">{organization?.slug}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Country</Label>
              <p className="text-lg font-medium">
                {organization?.country === 'SA' && 'Saudi Arabia 🇸🇦'}
                {organization?.country === 'EG' && 'Egypt 🇪🇬'}
                {organization?.country === 'AE' && 'United Arab Emirates 🇦🇪'}
                {!organization?.country && 'Not set'}
              </p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Subscription</Label>
              <div className="flex items-center gap-2">
                <p className="text-lg font-medium">
                  {organization?.subscriptionTier === 'STARTER' && 'Starter'}
                  {organization?.subscriptionTier === 'PROFESSIONAL' && 'Professional'}
                  {organization?.subscriptionTier === 'ENTERPRISE' && 'Enterprise'}
                </p>
                <Badge variant={
                  organization?.subscriptionStatus === 'ACTIVE' ? 'default' :
                  organization?.subscriptionStatus === 'FREE_TRIAL' ? 'secondary' :
                  'destructive'
                }>
                  {organization?.subscriptionStatus === 'FREE_TRIAL' && 'Free Trial'}
                  {organization?.subscriptionStatus === 'ACTIVE' && 'Active'}
                  {organization?.subscriptionStatus === 'PAST_DUE' && 'Past Due'}
                  {organization?.subscriptionStatus === 'CANCELLED' && 'Cancelled'}
                </Badge>
              </div>
              {organization?.subscriptionStatus === 'FREE_TRIAL' && organization?.trialEndsAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Trial ends {new Date(organization.trialEndsAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Members</Label>
              <p className="text-lg font-medium">{organization?._count?.members || 0}</p>
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">Status</Label>
              <Badge variant={organization?.isActive ? 'default' : 'secondary'}>
                {organization?.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          {isOwner && (
            <Dialog open={editOrgDialogOpen} onOpenChange={setEditOrgDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Edit Organization
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Organization</DialogTitle>
                  <DialogDescription>
                    Update your organization details
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                      id="org-name"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder={organization?.name}
                    />
                  </div>
                  <div>
                    <Label htmlFor="org-country">Country</Label>
                    <Select
                      value={orgCountry || organization?.country || ''}
                      onValueChange={setOrgCountry}
                    >
                      <SelectTrigger id="org-country">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SA">🇸🇦 Saudi Arabia</SelectItem>
                        <SelectItem value="EG">🇪🇬 Egypt</SelectItem>
                        <SelectItem value="AE">🇦🇪 United Arab Emirates</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Phone numbers will be validated based on the selected country
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditOrgDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateOrg} disabled={updateOrg.isPending}>
                    {updateOrg.isPending ? 'Updating...' : 'Update'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* Subscription & Billing */}
      {isOwner && <SubscriptionOverviewCard />}

      {/* Label Customization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Label Customization
          </CardTitle>
          <CardDescription>
            Customize terminology to match your industry (e.g., change "Cities" to "Warehouses", "Truck Types" to "Products")
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {settingsLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading settings...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Locations</Label>
                  <p className="text-lg font-medium">{settings?.locationLabel} / {settings?.locationLabelPlural}</p>
                  <p className="text-xs text-muted-foreground mt-1">Default: City / Cities</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Partners</Label>
                  <p className="text-lg font-medium">{settings?.partyLabel} / {settings?.partyLabelPlural}</p>
                  <p className="text-xs text-muted-foreground mt-1">Default: Partner / Partners</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Resource Types</Label>
                  <p className="text-lg font-medium">{settings?.resourceTypeLabel} / {settings?.resourceTypeLabelPlural}</p>
                  <p className="text-xs text-muted-foreground mt-1">Default: Truck Type / Truck Types</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Demand</Label>
                  <p className="text-lg font-medium">{settings?.demandLabel} / {settings?.demandLabelPlural}</p>
                  <p className="text-xs text-muted-foreground mt-1">Default: Demand / Demand Forecasts</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Supply</Label>
                  <p className="text-lg font-medium">{settings?.supplyLabel} / {settings?.supplyLabelPlural}</p>
                  <p className="text-xs text-muted-foreground mt-1">Default: Supply / Supply Commitments</p>
                </div>
              </div>

              {isOwner && (
                <Dialog open={editLabelsDialogOpen} onOpenChange={setEditLabelsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" onClick={handleOpenLabelsDialog}>
                      Customize Labels
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Customize Labels</DialogTitle>
                      <DialogDescription>
                        Adapt the terminology to match your industry. These labels will appear throughout the application.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6">
                      {/* Location Labels */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Location Labels</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="locationLabel">Singular</Label>
                            <Input
                              id="locationLabel"
                              value={labels.locationLabel}
                              onChange={(e) => setLabels({ ...labels, locationLabel: e.target.value })}
                              placeholder="City, Warehouse, Factory, Store"
                            />
                          </div>
                          <div>
                            <Label htmlFor="locationLabelPlural">Plural</Label>
                            <Input
                              id="locationLabelPlural"
                              value={labels.locationLabelPlural}
                              onChange={(e) => setLabels({ ...labels, locationLabelPlural: e.target.value })}
                              placeholder="Cities, Warehouses, Factories, Stores"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Party/Partner Labels */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Partner Labels</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="partyLabel">Singular</Label>
                            <Input
                              id="partyLabel"
                              value={labels.partyLabel}
                              onChange={(e) => setLabels({ ...labels, partyLabel: e.target.value })}
                              placeholder="Partner, Client, Customer, Vendor"
                            />
                          </div>
                          <div>
                            <Label htmlFor="partyLabelPlural">Plural</Label>
                            <Input
                              id="partyLabelPlural"
                              value={labels.partyLabelPlural}
                              onChange={(e) => setLabels({ ...labels, partyLabelPlural: e.target.value })}
                              placeholder="Partners, Clients, Customers, Vendors"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Resource Type Labels */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Resource Type Labels</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="resourceTypeLabel">Singular</Label>
                            <Input
                              id="resourceTypeLabel"
                              value={labels.resourceTypeLabel}
                              onChange={(e) => setLabels({ ...labels, resourceTypeLabel: e.target.value })}
                              placeholder="Truck Type, Product, Material, Machine Type"
                            />
                          </div>
                          <div>
                            <Label htmlFor="resourceTypeLabelPlural">Plural</Label>
                            <Input
                              id="resourceTypeLabelPlural"
                              value={labels.resourceTypeLabelPlural}
                              onChange={(e) => setLabels({ ...labels, resourceTypeLabelPlural: e.target.value })}
                              placeholder="Truck Types, Products, Materials, Machine Types"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Demand Labels */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Demand Labels</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="demandLabel">Singular</Label>
                            <Input
                              id="demandLabel"
                              value={labels.demandLabel}
                              onChange={(e) => setLabels({ ...labels, demandLabel: e.target.value })}
                              placeholder="Demand, Order, Request"
                            />
                          </div>
                          <div>
                            <Label htmlFor="demandLabelPlural">Plural</Label>
                            <Input
                              id="demandLabelPlural"
                              value={labels.demandLabelPlural}
                              onChange={(e) => setLabels({ ...labels, demandLabelPlural: e.target.value })}
                              placeholder="Demand Forecasts, Orders, Requests"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Supply Labels */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-sm">Supply Labels</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="supplyLabel">Singular</Label>
                            <Input
                              id="supplyLabel"
                              value={labels.supplyLabel}
                              onChange={(e) => setLabels({ ...labels, supplyLabel: e.target.value })}
                              placeholder="Supply, Capacity, Availability"
                            />
                          </div>
                          <div>
                            <Label htmlFor="supplyLabelPlural">Plural</Label>
                            <Input
                              id="supplyLabelPlural"
                              value={labels.supplyLabelPlural}
                              onChange={(e) => setLabels({ ...labels, supplyLabelPlural: e.target.value })}
                              placeholder="Supply Commitments, Capacity Plans, Availability"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditLabelsDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateLabels} disabled={updateSettings.isPending}>
                        {updateSettings.isPending ? 'Updating...' : 'Save Changes'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Domains */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Email Domains
              </CardTitle>
              <CardDescription>
                Domains that can auto-join your organization
              </CardDescription>
            </div>
            {isOwner && (
              <Dialog open={addDomainDialogOpen} onOpenChange={setAddDomainDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Domain
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Domain</DialogTitle>
                    <DialogDescription>
                      Add a new email domain for your organization
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="domain">Domain</Label>
                      <Input
                        id="domain"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        placeholder="example.com"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddDomainDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddDomain} disabled={addDomain.isPending}>
                      {addDomain.isPending ? 'Adding...' : 'Add Domain'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {domainsLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading domains...</div>
          ) : !domains || domains.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No domains claimed</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domain</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Primary</TableHead>
                  <TableHead>Added</TableHead>
                  {isOwner && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains.map((domain) => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">{domain.domain}</TableCell>
                    <TableCell>
                      <Badge variant={domain.isVerified ? 'default' : 'secondary'}>
                        {domain.isVerified ? (
                          <><CheckCircle2 className="mr-1 h-3 w-3" /> Verified</>
                        ) : (
                          <><AlertCircle className="mr-1 h-3 w-3" /> Unverified</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {domain.isPrimary ? (
                        <Badge variant="outline">Primary</Badge>
                      ) : isOwner && domain.isVerified ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => updateDomain.mutate({ domainId: domain.id, data: { isPrimary: true } })}
                        >
                          Set as Primary
                        </Button>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(domain.createdAt), { addSuffix: true })}
                    </TableCell>
                    {isOwner && (
                      <TableCell className="text-right space-x-2">
                        {!domain.isVerified && domain.verificationToken && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedDomain(domain)
                              setVerifyDialogOpen(true)
                            }}
                          >
                            <Shield className="mr-1 h-3 w-3" />
                            Verify
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDomain.mutate(domain.id)}
                          disabled={domain.isPrimary && domain.isVerified}
                          title={domain.isPrimary && domain.isVerified ? 'Cannot delete verified primary domain. Set another domain as primary first.' : 'Delete domain'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Domain Verification Dialog */}
      {selectedDomain && (
        <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Verify Domain Ownership</DialogTitle>
              <DialogDescription>
                Add a DNS TXT record to verify you own {selectedDomain.domain}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/50 p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Verification Instructions
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Log in to your domain registrar (GoDaddy, Namecheap, etc.)</li>
                  <li>Navigate to DNS settings for <span className="font-mono font-semibold text-foreground">{selectedDomain.domain}</span></li>
                  <li>Add a new TXT record with the following values:</li>
                </ol>
              </div>

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Record Type</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="block w-full rounded bg-muted px-3 py-2 font-mono text-sm">
                      TXT
                    </code>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Host / Name</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="block flex-1 rounded bg-muted px-3 py-2 font-mono text-sm">
                      @
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyToClipboard('@')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Use @ to add the record to the root domain, or leave blank if your registrar doesn't support @
                  </p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Value / Data</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="block flex-1 rounded bg-muted px-3 py-2 font-mono text-sm break-all">
                      takt-verification={selectedDomain.verificationToken}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyToClipboard(`takt-verification=${selectedDomain.verificationToken}`)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">TTL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="block w-full rounded bg-muted px-3 py-2 font-mono text-sm">
                      3600 (or default)
                    </code>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-4">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">DNS Propagation</p>
                    <p className="text-blue-700 dark:text-blue-300">
                      DNS changes can take 5-60 minutes to propagate. After adding the TXT record, click "Verify Now" below.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setVerifyDialogOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  handleVerifyDomain(selectedDomain.id)
                  setVerifyDialogOpen(false)
                }}
                disabled={verifyDomain.isPending}
              >
                {verifyDomain.isPending ? (
                  <>Verifying...</>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Verify Now
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Members
              </CardTitle>
              <CardDescription>
                Manage organization members and their roles
              </CardDescription>
            </div>
            {(isOwner || isAdmin) && (
              <Dialog open={inviteMemberDialogOpen} onOpenChange={setInviteMemberDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Member</DialogTitle>
                    <DialogDescription>
                      Invite a new member to your organization
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="role">Organization Role</Label>
                      <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v as any)}>
                        <SelectTrigger id="role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MEMBER">Member</SelectItem>
                          {isOwner && <SelectItem value="ADMIN">Admin</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="functional-role">Functional Role</Label>
                      <Select value={newMemberFunctionalRole} onValueChange={(v) => setNewMemberFunctionalRole(v as any)}>
                        <SelectTrigger id="functional-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DEMAND_PLANNER">Demand Planner</SelectItem>
                          <SelectItem value="SUPPLY_PLANNER">Supply Planner</SelectItem>
                          <SelectItem value="ADMIN">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setInviteMemberDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleInviteMember} disabled={inviteMember.isPending}>
                      {inviteMember.isPending ? 'Inviting...' : 'Invite'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {membersLoading ? (
            <div className="text-center text-muted-foreground py-8">Loading members...</div>
          ) : !members || members.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No members found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Org Role</TableHead>
                  <TableHead>Functional Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {(isOwner || isAdmin) && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => {
                  const isCurrentUser = member.userId === authData?.user?.id
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        {member.user.firstName} {member.user.lastName}
                        {isCurrentUser && <Badge variant="outline" className="ml-2">You</Badge>}
                      </TableCell>
                      <TableCell>{member.user.email}</TableCell>
                      <TableCell>
                        <Badge variant={member.role === 'OWNER' ? 'destructive' : member.role === 'ADMIN' ? 'default' : 'secondary'}>
                          {member.role === 'OWNER' && <Shield className="mr-1 h-3 w-3" />}
                          {member.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{member.functionalRole}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDistanceToNow(new Date(member.joinedAt), { addSuffix: true })}
                      </TableCell>
                      {(isOwner || isAdmin) && (
                        <TableCell className="text-right">
                          {!isCurrentUser && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeMember.mutate(member.id)}
                              disabled={member.role === 'OWNER' && !isOwner}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
