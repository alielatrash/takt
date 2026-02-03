import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Query keys
export const organizationKeys = {
  all: ['organizations'] as const,
  list: () => [...organizationKeys.all, 'list'] as const,
  current: () => [...organizationKeys.all, 'current'] as const,
  domains: () => [...organizationKeys.all, 'domains'] as const,
  members: () => [...organizationKeys.all, 'members'] as const,
}

// Types
export interface Organization {
  id: string
  name: string
  slug: string
  isActive: boolean
  isCurrent: boolean
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  functionalRole: 'DEMAND_PLANNER' | 'SUPPLY_PLANNER' | 'ADMIN'
  memberCount: number
  joinedAt: string
}

export interface OrganizationDetails {
  id: string
  name: string
  slug: string
  country?: string | null
  subscriptionTier?: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE'
  subscriptionStatus?: 'FREE_TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED'
  trialEndsAt?: string | null
  currentBillingCycle?: 'MONTHLY' | 'ANNUAL' | null
  subscriptionCurrentPeriodEnd?: string | null
  subscriptionCancelAtPeriodEnd?: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
  settings?: {
    locationLabel: string
    locationLabelPlural: string
    partyLabel: string
    partyLabelPlural: string
    resourceTypeLabel: string
    resourceTypeLabelPlural: string
    demandLabel: string
    demandLabelPlural: string
    supplyLabel: string
    supplyLabelPlural: string
  }
  domains?: Array<{
    id: string
    domain: string
    isVerified: boolean
    isPrimary: boolean
    createdAt: string
  }>
  _count?: {
    members: number
    parties: number
    locations: number
    resourceTypes: number
    planningWeeks: number
  }
}

export interface OrganizationDomain {
  id: string
  organizationId: string
  domain: string
  isVerified: boolean
  isPrimary: boolean
  verificationToken?: string | null
  verifiedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface OrganizationSettings {
  id: string
  organizationId: string
  locationLabel: string
  locationLabelPlural: string
  partyLabel: string
  partyLabelPlural: string
  resourceTypeLabel: string
  resourceTypeLabelPlural: string
  demandLabel: string
  demandLabelPlural: string
  supplyLabel: string
  supplyLabelPlural: string
  demandCategoryEnabled: boolean
  demandCategoryLabel: string
  demandCategoryLabelPlural: string
  demandCategoryRequired: boolean
  createdAt: string
  updatedAt: string
}

export interface OrganizationMember {
  id: string
  organizationId: string
  userId: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  functionalRole: 'DEMAND_PLANNER' | 'SUPPLY_PLANNER' | 'ADMIN'
  joinedAt: string
  invitedBy?: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    avatarUrl?: string | null
    isActive: boolean
  }
}

// GET /api/organizations - List all organizations user belongs to
export function useOrganizations() {
  return useQuery({
    queryKey: organizationKeys.list(),
    queryFn: async () => {
      const res = await fetch('/api/organizations')
      if (!res.ok) throw new Error('Failed to fetch organizations')
      const data = await res.json()
      return data.data as Organization[]
    },
  })
}

// GET /api/organization - Get current organization details
export function useCurrentOrganization() {
  return useQuery({
    queryKey: organizationKeys.current(),
    queryFn: async () => {
      const res = await fetch('/api/organization')
      if (!res.ok) throw new Error('Failed to fetch organization')
      const data = await res.json()
      return data.data as OrganizationDetails
    },
  })
}

// GET /api/organization/domains - List organization domains
export function useOrganizationDomains() {
  return useQuery({
    queryKey: organizationKeys.domains(),
    queryFn: async () => {
      const res = await fetch('/api/organization/domains')
      if (!res.ok) throw new Error('Failed to fetch domains')
      const data = await res.json()
      return data.data as OrganizationDomain[]
    },
  })
}

// GET /api/organization/members - List organization members
export function useOrganizationMembers() {
  return useQuery({
    queryKey: organizationKeys.members(),
    queryFn: async () => {
      const res = await fetch('/api/organization/members')
      if (!res.ok) throw new Error('Failed to fetch members')
      const data = await res.json()
      return data.data as OrganizationMember[]
    },
  })
}

// POST /api/organizations/switch - Switch organization
export function useSwitchOrganization() {
  const queryClient = useQueryClient()
  const router = useRouter()

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const res = await fetch('/api/organizations/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to switch organization')
      }

      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.data.message)

      // Invalidate all queries to refetch with new org context
      queryClient.invalidateQueries()

      // Refresh the page to reset all state
      router.refresh()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// PATCH /api/organization - Update organization details
export function useUpdateOrganization() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: { name: string; country?: string }) => {
      const res = await fetch('/api/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to update organization')
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success('Organization updated successfully')
      queryClient.invalidateQueries({ queryKey: organizationKeys.current() })
      queryClient.invalidateQueries({ queryKey: organizationKeys.list() })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// POST /api/organization/domains - Add domain
export function useAddDomain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (domain: string) => {
      const res = await fetch('/api/organization/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to add domain')
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success('Domain added successfully')
      queryClient.invalidateQueries({ queryKey: organizationKeys.domains() })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// DELETE /api/organization/domains/[id] - Remove domain
export function useRemoveDomain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (domainId: string) => {
      const res = await fetch(`/api/organization/domains/${domainId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to remove domain')
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success('Domain removed successfully')
      queryClient.invalidateQueries({ queryKey: organizationKeys.domains() })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// PATCH /api/organization/domains/[id] - Update domain (set as primary)
export function useUpdateDomain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ domainId, data }: { domainId: string; data: { isPrimary?: boolean; isVerified?: boolean } }) => {
      const res = await fetch(`/api/organization/domains/${domainId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to update domain')
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success('Domain updated successfully')
      queryClient.invalidateQueries({ queryKey: organizationKeys.domains() })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// POST /api/organization/invite - Invite member
export function useInviteMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: {
      email: string
      role?: 'ADMIN' | 'MEMBER'
      functionalRole?: 'DEMAND_PLANNER' | 'SUPPLY_PLANNER' | 'ADMIN'
    }) => {
      const res = await fetch('/api/organization/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to invite member')
      }

      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.data.message)
      queryClient.invalidateQueries({ queryKey: organizationKeys.members() })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// DELETE /api/organization/members/[id] - Remove member
export function useRemoveMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (memberId: string) => {
      const res = await fetch(`/api/organization/members/${memberId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to remove member')
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success('Member removed successfully')
      queryClient.invalidateQueries({ queryKey: organizationKeys.members() })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// PATCH /api/organization/members/[id] - Update member role
export function useUpdateMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      memberId,
      data,
    }: {
      memberId: string
      data: {
        role?: 'OWNER' | 'ADMIN' | 'MEMBER'
        functionalRole?: 'DEMAND_PLANNER' | 'SUPPLY_PLANNER' | 'ADMIN'
      }
    }) => {
      const res = await fetch(`/api/organization/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to update member role')
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success('Member role updated successfully')
      queryClient.invalidateQueries({ queryKey: organizationKeys.members() })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// POST /api/organization/domains/[id]/verify - Verify domain ownership
export function useVerifyDomain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (domainId: string) => {
      const res = await fetch(`/api/organization/domains/${domainId}/verify`, {
        method: 'POST',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to verify domain')
      }

      return res.json()
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Domain verified successfully!')
      queryClient.invalidateQueries({ queryKey: organizationKeys.domains() })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}

// GET /api/organization/settings - Get organization settings
export function useOrganizationSettings() {
  return useQuery({
    queryKey: [...organizationKeys.all, 'settings'] as const,
    queryFn: async () => {
      const res = await fetch('/api/organization/settings')
      if (!res.ok) throw new Error('Failed to fetch settings')
      const data = await res.json()
      return data.data as OrganizationSettings
    },
  })
}

// PATCH /api/organization/settings - Update organization settings
export function useUpdateOrganizationSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<Omit<OrganizationSettings, 'id' | 'organizationId' | 'createdAt' | 'updatedAt'>>) => {
      const res = await fetch('/api/organization/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error?.message || 'Failed to update settings')
      }

      return res.json()
    },
    onSuccess: () => {
      toast.success('Label settings updated successfully')
      queryClient.invalidateQueries({ queryKey: [...organizationKeys.all, 'settings'] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })
}
