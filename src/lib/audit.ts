import { prisma } from './prisma'

interface AuditLogParams {
  userId: string
  action: string
  entityType: string
  entityId?: string
  metadata?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog({
  userId,
  action,
  entityType,
  entityId,
  metadata,
  ipAddress,
  userAgent,
}: AuditLogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    // Log error but don't throw - audit logging should not break main functionality
    console.error('Failed to create audit log:', error)
  }
}

// Common audit actions
export const AuditAction = {
  // Auth
  USER_REGISTERED: 'user.registered',
  USER_LOGGED_IN: 'user.logged_in',
  USER_LOGGED_OUT: 'user.logged_out',
  OTP_REQUESTED: 'otp.requested',
  OTP_VERIFIED: 'otp.verified',
  OTP_FAILED: 'otp.failed',

  // Demand
  DEMAND_CREATED: 'demand.created',
  DEMAND_UPDATED: 'demand.updated',
  DEMAND_DELETED: 'demand.deleted',

  // Supply
  SUPPLY_COMMITTED: 'supply.committed',
  SUPPLY_UPDATED: 'supply.updated',
  SUPPLY_DELETED: 'supply.deleted',

  // Repositories
  CLIENT_CREATED: 'client.created',
  CLIENT_UPDATED: 'client.updated',
  CLIENT_DELETED: 'client.deleted',
  SUPPLIER_CREATED: 'supplier.created',
  SUPPLIER_UPDATED: 'supplier.updated',
  SUPPLIER_DELETED: 'supplier.deleted',
  CITY_CREATED: 'city.created',
  CITY_UPDATED: 'city.updated',
  CITY_DELETED: 'city.deleted',
  TRUCK_TYPE_CREATED: 'truck_type.created',
  TRUCK_TYPE_UPDATED: 'truck_type.updated',
  TRUCK_TYPE_DELETED: 'truck_type.deleted',

  // Admin
  USER_ROLE_CHANGED: 'user.role_changed',
  USER_DEACTIVATED: 'user.deactivated',
  USER_ACTIVATED: 'user.activated',

  // Organization
  ORGANIZATION_SWITCHED: 'organization.switched',
  ORGANIZATION_CREATED: 'organization.created',
  ORGANIZATION_UPDATED: 'organization.updated',
  DOMAIN_ADDED: 'organization.domain_added',
  DOMAIN_REMOVED: 'organization.domain_removed',
  MEMBER_INVITED: 'organization.member_invited',
  MEMBER_REMOVED: 'organization.member_removed',
  MEMBER_ROLE_CHANGED: 'organization.member_role_changed',
} as const

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction]
