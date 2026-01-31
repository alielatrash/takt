'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  Building2,
  CalendarDays,
  Home,
  Package,
  Truck,
  Users,
  FileText,
  MapPin,
  ClipboardList,
  RefreshCw,
  ClipboardCheck,
  Plus,
  User,
  LogOut,
  Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from './logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { UserRole, SessionUser } from '@/types'
import { useNotifications, useMarkNotificationsRead } from '@/hooks/use-notifications'
import { formatDistanceToNow } from 'date-fns'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: UserRole[]
}

const navigation: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: Home },
  { title: 'Demand Planning', href: '/demand', icon: ClipboardList, roles: ['DEMAND_PLANNER', 'ADMIN'] },
  { title: 'Supply Planning', href: '/supply', icon: Truck, roles: ['SUPPLY_PLANNER', 'ADMIN'] },
  { title: 'Dispatch Sheet', href: '/dispatch', icon: ClipboardCheck, roles: ['SUPPLY_PLANNER', 'ADMIN'] },
  { title: 'Clients', href: '/repositories/clients', icon: Building2 },
  { title: 'Suppliers', href: '/repositories/suppliers', icon: Package },
  { title: 'Cities', href: '/repositories/cities', icon: MapPin },
  { title: 'Truck Types', href: '/repositories/truck-types', icon: Truck },
  { title: 'Forecast Accuracy', href: '/reports/accuracy', icon: BarChart3 },
  { title: 'Vendor Performance', href: '/reports/performance', icon: FileText },
  { title: 'Users', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
  { title: 'Audit Log', href: '/admin/audit', icon: CalendarDays, roles: ['ADMIN'] },
  { title: 'Data Sync', href: '/admin/sync', icon: RefreshCw, roles: ['ADMIN'] },
]

interface SidebarProps {
  userRole?: UserRole
  user?: SessionUser | null
}

export function Sidebar({ userRole, user }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { data: notificationsData } = useNotifications()
  const markReadMutation = useMarkNotificationsRead()

  // Fix hydration mismatch with Radix UI IDs
  useEffect(() => {
    setMounted(true)
  }, [])

  const canAccess = (item: NavItem) => {
    if (!item.roles) return true
    if (!userRole) return false
    return item.roles.includes(userRole)
  }

  const accessibleItems = navigation.filter(canAccess)

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleMarkAllRead = () => {
    markReadMutation.mutate({ markAllRead: true })
  }

  const handleMarkRead = (notificationId: string) => {
    markReadMutation.mutate({ notificationIds: [notificationId] })
  }

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

  const canCreateDemand = userRole === 'DEMAND_PLANNER' || userRole === 'ADMIN'
  const canCreateSupply = userRole === 'SUPPLY_PLANNER' || userRole === 'ADMIN'

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-16 flex-col items-center border-r bg-background py-6" suppressHydrationWarning>
        {/* Logo */}
        <Link href="/dashboard">
          <Logo size="md" />
        </Link>

        {/* Navigation Icons */}
        <nav className="slim-scrollbar flex flex-1 flex-col items-center gap-3 overflow-y-auto py-2">
          {accessibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'group relative flex h-11 w-11 items-center justify-center rounded-lg py-2.5 transition-all',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {isActive && (
                      <div className="absolute left-0 h-7 w-1 rounded-r-full bg-primary" />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  {item.title}
                </TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        {/* Quick Create Button */}
        {(canCreateDemand || canCreateSupply) && (
          <>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setCreateDialogOpen(true)}
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg transition-all hover:bg-primary/90 hover:shadow-xl"
                >
                  <Plus className="h-6 w-6" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                Quick Create
              </TooltipContent>
            </Tooltip>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New</DialogTitle>
                  <DialogDescription>
                    Choose what you'd like to create
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3 py-4">
                  {canCreateDemand && (
                    <Button
                      variant="outline"
                      className="h-auto flex-col gap-2 p-6"
                      onClick={() => {
                        router.push('/demand')
                        setCreateDialogOpen(false)
                      }}
                    >
                      <ClipboardList className="h-6 w-6" />
                      <div className="text-center">
                        <div className="font-semibold">Demand Plan</div>
                        <div className="text-xs text-muted-foreground">
                          Create a new demand forecast
                        </div>
                      </div>
                    </Button>
                  )}
                  {canCreateSupply && (
                    <Button
                      variant="outline"
                      className="h-auto flex-col gap-2 p-6"
                      onClick={() => {
                        router.push('/supply')
                        setCreateDialogOpen(false)
                      }}
                    >
                      <Truck className="h-6 w-6" />
                      <div className="text-center">
                        <div className="font-semibold">Supply Plan</div>
                        <div className="text-xs text-muted-foreground">
                          Create a new supply commitment
                        </div>
                      </div>
                    </Button>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}

        {/* Notifications */}
        {mounted && <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="relative mb-4 flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  <Bell className="h-5 w-5" />
                  {notificationsData && notificationsData.unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                      {notificationsData.unreadCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium">
              Notifications
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="start" side="right" className="w-80">
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
        </DropdownMenu>}

        {/* User Profile with Online Indicator */}
        {mounted && user && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button className="relative flex h-10 w-10 items-center justify-center">
                    <Avatar className="h-10 w-10">
                      {user.avatarUrl && (
                        <AvatarImage
                          src={user.avatarUrl}
                          alt={`${user.firstName} ${user.lastName}`}
                        />
                      )}
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {getInitials(user.firstName, user.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    {/* Online indicator */}
                    <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {user.firstName} {user.lastName}
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" side="right" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </aside>
    </TooltipProvider>
  )
}
