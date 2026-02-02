import { cookies } from 'next/headers'
import { prisma } from './prisma'
import type { Session, SessionUser, UserRole } from '@/types'
import crypto from 'crypto'

const SESSION_COOKIE_NAME = 'takt_session'
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 // 7 days in seconds

// Generate a secure random token
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Hash OTP for storage
export function hashOTP(otp: string): string {
  return crypto.createHash('sha256').update(otp).digest('hex')
}

// Verify OTP
export function verifyOTP(otp: string, hashedOTP: string): boolean {
  return hashOTP(otp) === hashedOTP
}

// Get current session from cookies
export async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (!token) return null

    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            avatarUrl: true,
            currentOrgId: true,
          },
        },
      },
    })

    if (!session || session.expiresAt < new Date()) {
      // Clean up expired session
      if (session) {
        await prisma.session.delete({ where: { id: session.id } }).catch(() => {})
      }
      return null
    }

    // Get user's organization memberships
    const memberships = await prisma.organizationMember.findMany({
      where: { userId: session.user.id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    })

    // If user has no memberships, return null (shouldn't happen in normal flow)
    if (memberships.length === 0) {
      return null
    }

    // If user has no currentOrgId, set it to their first org
    let currentOrgId = session.user.currentOrgId
    if (!currentOrgId) {
      currentOrgId = memberships[0].organizationId
      await prisma.user.update({
        where: { id: session.user.id },
        data: { currentOrgId },
      }).catch(() => {})
    }

    // Find the current organization membership
    const currentMembership = memberships.find(m => m.organizationId === currentOrgId) || memberships[0]

    // Update last active asynchronously (don't block the response)
    // Only update if last active was more than 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    if (session.lastActiveAt < fiveMinutesAgo) {
      prisma.session.update({
        where: { id: session.id },
        data: { lastActiveAt: new Date() },
      }).catch(() => {})
      // Note: Not awaited - runs in background
    }

    return {
      user: {
        ...session.user,
        currentOrgId: currentMembership.organizationId,
        currentOrgRole: currentMembership.role,
        currentOrgName: currentMembership.organization.name,
      } as SessionUser,
      sessionId: session.id,
    }
  } catch (error) {
    console.error('Failed to get session:', error)
    return null
  }
}

// Create a new session
export async function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<string> {
  const token = generateToken()
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000)

  await prisma.session.create({
    data: {
      userId,
      token,
      userAgent,
      ipAddress,
      expiresAt,
    },
  })

  return token
}

// Set session cookie
export async function setSessionCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE,
    path: '/',
  })
}

// Clear session cookie
export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

// Delete session from database
export async function deleteSession(sessionId: string) {
  await prisma.session.delete({ where: { id: sessionId } }).catch(() => {})
}

// Invalidate all sessions for a user
export async function invalidateUserSessions(userId: string) {
  await prisma.session.deleteMany({ where: { userId } })
}

// Role-based access control
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  DEMAND_PLANNER: ['demand:read', 'demand:write', 'repositories:read'],
  SUPPLY_PLANNER: ['supply:read', 'supply:write', 'repositories:read'],
  ADMIN: ['*'],
}

export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role]
  return permissions.includes('*') || permissions.includes(permission)
}

// Validate email domain
export function isValidTaktEmail(email: string): boolean {
  return email.toLowerCase().endsWith('@teamtakt.app')
}

// Clean up expired sessions (for cron job)
export async function cleanupExpiredSessions() {
  const result = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return result.count
}

// Clean up expired OTPs
export async function cleanupExpiredOTPs() {
  const result = await prisma.oTPCode.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return result.count
}
