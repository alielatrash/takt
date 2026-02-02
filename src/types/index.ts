import type { User, UserRole, OrgRole } from '@prisma/client'

// Re-export Prisma types
export type { User, UserRole, OrgRole } from '@prisma/client'

// Session types
export interface SessionUser {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  avatarUrl?: string | null
  currentOrgId: string
  currentOrgRole: OrgRole
  currentOrgName: string
}

export interface Session {
  user: SessionUser
  sessionId: string
}

// API Response types
export interface ApiResponse<T> {
  success: true
  data: T
  meta?: {
    page?: number
    pageSize?: number
    total?: number
  }
}

export interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, string[]>
  }
}

export type ApiResult<T> = ApiResponse<T> | ApiError

// Pagination
export interface PaginationParams {
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// Navigation types
export interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: UserRole[]
  children?: NavItem[]
}

// Week days mapping (Sun-Sat)
export const WEEK_DAYS = [
  { key: 'day1', label: 'Sun', fullLabel: 'Sunday' },
  { key: 'day2', label: 'Mon', fullLabel: 'Monday' },
  { key: 'day3', label: 'Tue', fullLabel: 'Tuesday' },
  { key: 'day4', label: 'Wed', fullLabel: 'Wednesday' },
  { key: 'day5', label: 'Thu', fullLabel: 'Thursday' },
  { key: 'day6', label: 'Fri', fullLabel: 'Friday' },
  { key: 'day7', label: 'Sat', fullLabel: 'Saturday' },
] as const

export type DayKey = typeof WEEK_DAYS[number]['key']

// Form types for demand/supply
export interface DailyLoads {
  day1: number
  day2: number
  day3: number
  day4: number
  day5: number
  day6: number
  day7: number
}
