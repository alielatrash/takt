import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  entityId: string | null
  isRead: boolean
  createdAt: string
}

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: async (): Promise<NotificationsResponse> => {
      const res = await fetch('/api/notifications', {
        credentials: 'include',
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || 'Failed to fetch notifications')
      return json.data
    },
    refetchInterval: 30000, // Refetch every 30 seconds (reduced from 5s)
    staleTime: 25000, // Consider data fresh for 25 seconds
    refetchOnWindowFocus: false, // Don't refetch on every focus
  })
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      notificationIds,
      markAllRead,
    }: {
      notificationIds?: string[]
      markAllRead?: boolean
    }) => {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds, markAllRead }),
        credentials: 'include',
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error?.message || 'Failed to mark notifications as read')
      return json.data
    },
    // Optimistic update - immediately update UI before server responds
    onMutate: async ({ notificationIds, markAllRead }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['notifications'] })

      // Snapshot the previous value
      const previousNotifications = queryClient.getQueryData<NotificationsResponse>(['notifications'])

      // Optimistically update to the new value
      if (previousNotifications) {
        const updatedNotifications = previousNotifications.notifications.map((notif) => {
          if (markAllRead || (notificationIds && notificationIds.includes(notif.id))) {
            return { ...notif, isRead: true }
          }
          return notif
        })

        const newUnreadCount = updatedNotifications.filter((n) => !n.isRead).length

        queryClient.setQueryData<NotificationsResponse>(['notifications'], {
          notifications: updatedNotifications,
          unreadCount: newUnreadCount,
        })
      }

      return { previousNotifications }
    },
    // If mutation fails, rollback to previous value
    onError: (err, variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['notifications'], context.previousNotifications)
      }
    },
    // Always refetch after error or success to sync with server
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
