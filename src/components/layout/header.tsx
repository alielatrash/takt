'use client'

import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { OrganizationSwitcher } from '@/components/organization/organization-switcher'
import type { SessionUser } from '@/types'
import { useNotifications, useMarkNotificationsRead } from '@/hooks/use-notifications'
import { formatDistanceToNow } from 'date-fns'

interface HeaderProps {
  user?: SessionUser | null
}

export function Header({ user }: HeaderProps) {
  const { data: notificationsData } = useNotifications()
  const markReadMutation = useMarkNotificationsRead()

  const handleMarkAllRead = () => {
    markReadMutation.mutate({ markAllRead: true })
  }

  const handleMarkRead = (notificationId: string) => {
    markReadMutation.mutate({ notificationIds: [notificationId] })
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive'
      case 'DEMAND_PLANNER':
        return 'default'
      case 'SUPPLY_PLANNER':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const formatRole = (role: string) => {
    return role.replace('_', ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6" suppressHydrationWarning>
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <OrganizationSwitcher />
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notificationsData && notificationsData.unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                  {notificationsData.unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {notificationsData && notificationsData.unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-primary"
                  onClick={handleMarkAllRead}
                >
                  Mark all read
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-[400px]">
              {notificationsData && notificationsData.notifications.length > 0 ? (
                notificationsData.notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification.id}
                    className={`flex flex-col items-start p-3 cursor-pointer ${
                      !notification.isRead ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => !notification.isRead && handleMarkRead(notification.id)}
                  >
                    <div className="flex w-full items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="flex h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User info badge */}
        {user && (
          <div className="flex items-center gap-2">
            <div className="hidden flex-col items-end md:flex">
              <span className="text-sm font-medium">
                {user.firstName} {user.lastName}
              </span>
              <Badge variant={getRoleBadgeVariant(user.role)} className="text-[10px] px-1.5 py-0">
                {formatRole(user.role)}
              </Badge>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
