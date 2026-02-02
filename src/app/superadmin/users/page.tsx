'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, User, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState<any>(null)
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [search, page])

  async function fetchUsers() {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
      })

      if (search) params.append('search', search)

      const response = await fetch(`/api/superadmin/users?${params}`)
      const data = await response.json()

      if (data.success) {
        setUsers(data.data.users)
        setPagination(data.data.pagination)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }

  function toggleUserSelection(userId: string) {
    const newSelection = new Set(selectedUsers)
    if (newSelection.has(userId)) {
      newSelection.delete(userId)
    } else {
      newSelection.add(userId)
    }
    setSelectedUsers(newSelection)
  }

  function toggleSelectAll() {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)))
    }
  }

  async function handleBulkDelete() {
    if (selectedUsers.size === 0) return

    setDeleteLoading(true)
    try {
      const deletePromises = Array.from(selectedUsers).map(async (userId) => {
        const response = await fetch(`/api/superadmin/users/${userId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: deleteReason }),
        })
        const data = await response.json()
        return { success: data.success, userId, response: data }
      })

      const results = await Promise.allSettled(deletePromises)

      const successCount = results.filter(
        (r) => r.status === 'fulfilled' && r.value.success
      ).length
      const failCount = results.filter(
        (r) => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)
      ).length

      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} user(s)`)
      }
      if (failCount > 0) {
        toast.error(`Failed to delete ${failCount} user(s)`)
        // Log failed deletions for debugging
        results.forEach((r) => {
          if (r.status === 'fulfilled' && !r.value.success) {
            console.error('Failed to delete user:', r.value.userId, r.value.response)
          }
        })
      }

      // Reset state
      setSelectedUsers(new Set())
      setDeleteReason('')
      setShowDeleteDialog(false)

      // Refresh the list
      fetchUsers()
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Failed to delete users')
    } finally {
      setDeleteLoading(false)
    }
  }

  const allSelected = users.length > 0 && selectedUsers.size === users.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Users</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage all users across all organizations
          </p>
        </div>

        {selectedUsers.size > 0 && (
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={deleteLoading}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete {selectedUsers.size} User{selectedUsers.size !== 1 ? 's' : ''}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedUsers.size} User{selectedUsers.size !== 1 ? 's' : ''}</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete {selectedUsers.size} user
                  {selectedUsers.size !== 1 ? 's' : ''} and all their related data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="py-4">
                <label className="text-sm font-medium mb-2 block">
                  Reason (optional)
                </label>
                <Textarea
                  placeholder="Enter reason for deleting these users..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={3}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleBulkDelete}
                  disabled={deleteLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteLoading ? 'Deleting...' : 'Delete Permanently'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {pagination ? `${pagination.total} Users` : 'Users'}
            </CardTitle>
            {users.length > 0 && (
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  id="select-all"
                />
                <label
                  htmlFor="select-all"
                  className="text-sm font-medium cursor-pointer"
                >
                  Select All
                </label>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No users found</div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 p-4 rounded-lg border ${
                    selectedUsers.has(user.id) ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <Checkbox
                    checked={selectedUsers.has(user.id)}
                    onCheckedChange={() => toggleUserSelection(user.id)}
                    onClick={(e) => e.stopPropagation()}
                  />

                  <Link
                    href={`/superadmin/users/${user.id}`}
                    className="flex-1 min-w-0"
                  >
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </p>
                          <Badge variant={user.isActive ? 'default' : 'destructive'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="secondary">{user.role}</Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{user.email}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>
                            {user.organizations.length}{' '}
                            {user.organizations.length === 1 ? 'org' : 'orgs'}
                          </span>
                          <span>
                            Joined {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                          {user.lastLogin && (
                            <span>
                              Last login {new Date(user.lastLogin).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
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
