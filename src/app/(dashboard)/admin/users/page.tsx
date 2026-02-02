'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { PageHeader } from '@/components/layout'
import { UserFormDialog } from '@/components/admin/user-form-dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  mobileNumber: string | null
  role: 'DEMAND_PLANNER' | 'SUPPLY_PLANNER' | 'ADMIN'
  isActive: boolean
  createdAt: string
}

const roleColors = {
  ADMIN: 'bg-purple-100 text-purple-800',
  DEMAND_PLANNER: 'bg-blue-100 text-blue-800',
  SUPPLY_PLANNER: 'bg-green-100 text-green-800',
}

export default function UsersAdminPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: async () => {
      const res = await fetch('/api/admin/users')
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch users')
      return json.data as User[]
    },
  })

  const createUserMutation = useMutation({
    mutationFn: async (userData: {
      email: string
      firstName: string
      lastName: string
      mobileNumber?: string
      role: string
      password: string
    }) => {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || 'Failed to create user')
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('User created successfully')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create user')
    },
  })

  const inviteUserMutation = useMutation({
    mutationFn: async (inviteData: { email: string; role: string }) => {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteData),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || 'Failed to send invitation')
      return json.data
    },
    onSuccess: () => {
      toast.success('Invitation sent successfully')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation')
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || 'Failed to delete user')
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('User deleted successfully')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete user')
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || 'Failed to update role')
      return json.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('User role updated')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update role')
    },
  })

  const handleRoleChange = (userId: string, role: string) => {
    updateRoleMutation.mutate({ userId, role })
  }

  const handleCreateUser = async (userData: any) => {
    await createUserMutation.mutateAsync(userData)
  }

  const handleInviteUser = async (inviteData: any) => {
    await inviteUserMutation.mutateAsync(inviteData)
  }

  const handleDeleteUser = async (userId: string, userName: string) => {
    // Check if user has any forecasts or commitments
    try {
      const user = data?.find(u => u.id === userId)
      if (!user) return

      // Fetch user's forecasts and commitments count
      const [forecastsRes, commitmentsRes] = await Promise.all([
        fetch(`/api/demand`, { credentials: 'include' }),
        fetch(`/api/supply`, { credentials: 'include' })
      ])

      const forecastsData = await forecastsRes.json()
      const commitmentsData = await commitmentsRes.json()

      // Count items created by this user
      const forecastCount = forecastsData.data?.filter((f: any) => f.createdBy?.id === userId).length || 0
      const commitmentCount = commitmentsData.data?.filter((c: any) => c.createdBy?.id === userId).length || 0

      let message = `Are you sure you want to delete ${userName}?\n\n`

      if (forecastCount > 0 || commitmentCount > 0) {
        message += `⚠️ WARNING: This will also permanently delete:\n`
        if (forecastCount > 0) {
          message += `• ${forecastCount} demand forecast(s)\n`
        }
        if (commitmentCount > 0) {
          message += `• ${commitmentCount} supply commitment(s)\n`
        }
        message += `\n❌ This action CANNOT be undone!`
      } else {
        message += `This action cannot be undone.`
      }

      if (confirm(message)) {
        deleteUserMutation.mutate(userId)
      }
    } catch (error) {
      console.error('Error checking user data:', error)
      // Fallback to simple confirmation if check fails
      if (confirm(`Are you sure you want to delete ${userName}?\n\n⚠️ This will also delete all their forecasts and commitments.\n\n❌ This action CANNOT be undone!`)) {
        deleteUserMutation.mutate(userId)
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        description="View and manage user accounts and roles"
      >
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </PageHeader>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : data?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              data?.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {`${user.firstName} ${user.lastName}`.trim()}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.mobileNumber || '—'}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleRoleChange(user.id, value)}
                    >
                      <SelectTrigger className="w-[160px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEMAND_PLANNER">Demand Planner</SelectItem>
                        <SelectItem value="SUPPLY_PLANNER">Supply Planner</SelectItem>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <UserFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={handleCreateUser}
        onInvite={handleInviteUser}
      />
    </div>
  )
}
