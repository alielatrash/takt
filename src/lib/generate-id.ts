import { randomBytes } from 'crypto'
import { PartyRole } from '@prisma/client'

/**
 * Generate a CUID-like unique identifier
 */
function generateCuid(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = randomBytes(12).toString('base64url').substring(0, 16)
  return `${timestamp}${randomPart}`
}

/**
 * Generate a unique identifier with role-based prefix
 * @param role - The party role (CUSTOMER, SUPPLIER, CARRIER, etc.)
 * @returns A unique identifier like "cli_abc123xyz"
 */
export function generateUniqueIdentifier(role: PartyRole): string {
  const prefix = role === PartyRole.CUSTOMER ? 'cli' :
                 role === PartyRole.SUPPLIER ? 'sup' :
                 role === PartyRole.CARRIER ? 'car' :
                 role === PartyRole.VENDOR ? 'ven' :
                 role === PartyRole.MANUFACTURER ? 'mfg' :
                 role === PartyRole.DISTRIBUTOR ? 'dst' : 'pty'

  return `${prefix}_${generateCuid()}`
}
