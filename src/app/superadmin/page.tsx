import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, TrendingUp, Activity } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { getSuperadminStats } from '@/lib/superadmin-stats'

export default async function SuperadminDashboard() {
  const data = await getSuperadminStats(30)

  const statCards = [
    {
      title: 'Total Organizations',
      value: data.overview.totalOrgs,
      description: `${data.overview.activeOrgs} active, ${data.overview.suspendedOrgs} suspended`,
      icon: Building2,
      href: '/superadmin/organizations',
    },
    {
      title: 'Total Users',
      value: data.overview.totalUsers,
      description: `${data.overview.activeUsers} active users`,
      icon: Users,
      href: '/superadmin/users',
    },
    {
      title: 'Demand Forecasts',
      value: data.overview.totalDemand.toLocaleString(),
      description: 'Total forecasts created',
      icon: TrendingUp,
      href: '/superadmin/activity',
    },
    {
      title: 'Recent Activity',
      value: data.overview.totalActivity.toLocaleString(),
      description: `Last ${data.period.days} days`,
      icon: Activity,
      href: '/superadmin/activity',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Platform Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Overview of all organizations and users on the platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-5 w-5 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Organizations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Organizations</CardTitle>
            <CardDescription>
              Organizations created in the last {data.period.days} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentOrgs.length === 0 ? (
                <p className="text-sm text-gray-500">No recent organizations</p>
              ) : (
                data.recentOrgs.map((org: any) => (
                  <Link
                    key={org.id}
                    href={`/superadmin/organizations/${org.id}`}
                    className="block"
                  >
                    <div className="flex items-start justify-between p-3 rounded-lg hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {org.name}
                          </p>
                          <Badge variant={org.status === 'ACTIVE' ? 'default' : 'destructive'}>
                            {org.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {org.subscriptionTier} • {org._count.members} members
                        </p>
                      </div>
                      <time className="text-xs text-gray-500">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </time>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
            <CardDescription>
              Users registered in the last {data.period.days} days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentUsers.length === 0 ? (
                <p className="text-sm text-gray-500">No recent users</p>
              ) : (
                data.recentUsers.map((user: any) => (
                  <Link
                    key={user.id}
                    href={`/superadmin/users/${user.id}`}
                    className="block"
                  >
                    <div className="flex items-start justify-between p-3 rounded-lg hover:bg-gray-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {user.email}
                        </p>
                        {user.organizationMemberships[0] && (
                          <p className="text-xs text-gray-400 mt-1">
                            {user.organizationMemberships[0].organization.name}
                          </p>
                        )}
                      </div>
                      <time className="text-xs text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </time>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Subscription Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Tiers</CardTitle>
            <CardDescription>Distribution of organizations by plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.tierDistribution.map((tier: any) => (
                <div key={tier.subscriptionTier} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    {tier.subscriptionTier}
                  </span>
                  <Badge variant="secondary">{tier._count.subscriptionTier}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Most Active Organizations */}
        <Card>
          <CardHeader>
            <CardTitle>Most Active Organizations</CardTitle>
            <CardDescription>By activity events in last {data.period.days} days</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.mostActiveOrgs.length === 0 ? (
                <p className="text-sm text-gray-500">No activity data</p>
              ) : (
                data.mostActiveOrgs.map((org: any) => (
                  <div key={org.organizationId} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {org.name}
                    </span>
                    <Badge variant="secondary">{org.count} events</Badge>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
