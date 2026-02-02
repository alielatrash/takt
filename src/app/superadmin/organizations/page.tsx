'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Building2, Users } from 'lucide-react'
import Link from 'next/link'

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [tier, setTier] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<any>(null)

  useEffect(() => {
    fetchOrganizations()
  }, [search, status, tier, page])

  async function fetchOrganizations() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
      })

      if (search) params.append('search', search)
      if (status && status !== 'all') params.append('status', status)
      if (tier && tier !== 'all') params.append('tier', tier)

      const response = await fetch(`/api/superadmin/organizations?${params}`)
      const data = await response.json()

      if (data.success) {
        setOrganizations(data.data.organizations)
        setPagination(data.data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Organizations</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage all organizations on the platform
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9"
              />
            </div>

            <Select value={status || 'all'} onValueChange={(value) => {
              setStatus(value === 'all' ? '' : value)
              setPage(1)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tier || 'all'} onValueChange={(value) => {
              setTier(value === 'all' ? '' : value)
              setPage(1)
            }}>
              <SelectTrigger>
                <SelectValue placeholder="All tiers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All tiers</SelectItem>
                <SelectItem value="STARTER">Starter</SelectItem>
                <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                setSearch('')
                setStatus('')
                setTier('')
                setPage(1)
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Organizations List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {pagination ? `${pagination.total} Organizations` : 'Organizations'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : organizations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No organizations found</div>
          ) : (
            <div className="space-y-2">
              {organizations.map((org) => (
                <Link
                  key={org.id}
                  href={`/superadmin/organizations/${org.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-gray-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {org.name}
                            </p>
                            <Badge variant={org.status === 'ACTIVE' ? 'default' : 'destructive'}>
                              {org.status}
                            </Badge>
                            <Badge variant="secondary">{org.subscriptionTier}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {org.memberCount} members
                            </span>
                            <span>
                              Created {new Date(org.createdAt).toLocaleDateString()}
                            </span>
                            {org.lastActivityAt && (
                              <span>
                                Last active {new Date(org.lastActivityAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
