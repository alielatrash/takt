import type { Session } from '@/types'

/**
 * Helper function to create organization-scoped where clauses
 * Ensures all queries are filtered by the current user's organization
 *
 * @example
 * const where = orgScopedWhere(session, { isActive: true })
 * // Returns: { organizationId: 'org-id', isActive: true }
 */
export function orgScopedWhere(session: Session, additionalWhere?: any) {
  return {
    organizationId: session.user.currentOrgId,
    ...additionalWhere,
  }
}

/**
 * Helper function to create organization-scoped data for inserts
 * Ensures all created entities are associated with the current user's organization
 *
 * @example
 * const data = orgScopedData(session, { name: 'Cairo', code: 'CAI' })
 * // Returns: { organizationId: 'org-id', name: 'Cairo', code: 'CAI' }
 */
export function orgScopedData(session: Session, data: any) {
  return {
    organizationId: session.user.currentOrgId,
    ...data,
  }
}

/**
 * Verify that a fetched entity belongs to the current user's organization
 * Throws an error if the entity doesn't belong to the organization
 *
 * @example
 * const client = await prisma.client.findUnique({ where: { id } })
 * verifyOrgOwnership(session, client)
 */
export function verifyOrgOwnership(session: Session, entity: any) {
  if (!entity) {
    throw new Error('Entity not found')
  }
  if (entity.organizationId !== session.user.currentOrgId) {
    throw new Error('Access denied: Entity belongs to different organization')
  }
}
