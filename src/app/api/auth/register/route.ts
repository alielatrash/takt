import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { createAuditLog, AuditAction } from '@/lib/audit'
import { registerSchema } from '@/lib/validations/auth'
import { createOTP } from '@/lib/otp'
import { sendOTPEmail } from '@/lib/email'
import {
  extractDomain,
  isPublicDomain,
  isAcceptableDomain,
  extractOrgNameFromDomain,
  generateSlug,
} from '@/lib/domain'
import { PlanningCycle, WeekStartDay } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Validate input
    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            details: validationResult.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      )
    }

    const { email, password, firstName, lastName, mobileNumber, role, organizationName, planningCycle, weekStartDay, organizationSettings } =
      validationResult.data
    const normalizedEmail = email.toLowerCase()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'USER_EXISTS',
            message: 'An account with this email already exists',
          },
        },
        { status: 409 }
      )
    }

    // Check if mobile number already exists
    if (mobileNumber) {
      const existingMobileUser = await prisma.user.findFirst({
        where: { mobileNumber },
      })

      if (existingMobileUser) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'MOBILE_EXISTS',
              message: 'An account with this mobile number already exists',
            },
          },
          { status: 409 }
        )
      }
    }

    // Extract domain from email
    const domain = extractDomain(normalizedEmail)

    // Handle public email domains (gmail, outlook, etc.)
    const isPublicEmail = isPublicDomain(domain)

    if (isPublicEmail) {
      // Public domain users MUST provide an organization name to create manually
      if (!organizationName) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'PUBLIC_DOMAIN',
              message: 'Please use a company email address or create an organization',
              needsOrgCreation: true,
              suggestedOrgName: '', // No suggestion for public domains
            },
          },
          { status: 400 }
        )
      }

      // Allow manual org creation for public domain users
      // We'll skip domain claiming entirely for these users
      const slug = generateSlug(organizationName)

      // Check if slug is already taken
      const existingOrg = await prisma.organization.findUnique({
        where: { slug },
      })

      if (existingOrg) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ORG_SLUG_EXISTS',
              message: 'An organization with this name already exists. Please choose a different name.',
            },
          },
          { status: 409 }
        )
      }

      // Create new organization (no domain claiming for public emails)
      const org = await prisma.organization.create({
        data: {
          name: organizationName,
          slug,
          isActive: true,
        },
      })

      // Create organization settings
      await prisma.organizationSettings.create({
        data: organizationSettings ? {
          organizationId: org.id,
          ...organizationSettings,
          planningCycle: organizationSettings.planningCycle as PlanningCycle,
          weekStartDay: organizationSettings.weekStartDay as WeekStartDay,
        } : {
          organizationId: org.id,
          locationLabel: 'City',
          locationLabelPlural: 'Cities',
          partyLabel: 'Partner',
          partyLabelPlural: 'Partners',
          resourceTypeLabel: 'Truck Type',
          resourceTypeLabelPlural: 'Truck Types',
          demandLabel: 'Demand',
          demandLabelPlural: 'Demand Forecasts',
          supplyLabel: 'Supply',
          supplyLabelPlural: 'Supply Commitments',
          demandCategoryLabel: 'Category',
          demandCategoryLabelPlural: 'Categories',
          demandCategoryEnabled: false,
          demandCategoryRequired: false,
          planningCycle: planningCycle || 'DAILY',
          weekStartDay: weekStartDay || 'SUNDAY',
        },
      })

      // Note: We do NOT create an OrganizationDomain entry for public email domains
      // This prevents domain claiming for gmail.com, outlook.com, etc.

      // Create user as OWNER (new org creators are always admins)
      const passwordHash = await hashPassword(password)
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName,
          lastName,
          mobileNumber,
          role: 'ADMIN', // New org creators are always admins
          currentOrgId: org.id,
          emailVerified: false, // Require email verification
        },
      })

      // Create organization membership
      await prisma.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: user.id,
          role: 'OWNER',
          functionalRole: 'ADMIN', // Owners have admin functional role
        },
      })

      // Generate OTP and send verification email
      console.log('[REGISTER] Generating OTP for user:', user.id, normalizedEmail)
      const otpCode = await createOTP(user.id, 'EMAIL_VERIFICATION')
      console.log('[REGISTER] OTP generated successfully:', otpCode.substring(0, 2) + '****')

      console.log('[REGISTER] Attempting to send OTP email to:', normalizedEmail)
      try {
        const emailResult = await sendOTPEmail({
          to: normalizedEmail,
          firstName,
          otp: otpCode,
          purpose: 'verification',
        })
        console.log('[REGISTER] OTP email sent successfully:', emailResult)
      } catch (emailError) {
        console.error('[REGISTER] Failed to send OTP email:', emailError)
        // Don't throw - allow registration to continue even if email fails
      }

      // Audit log
      await createAuditLog({
        userId: user.id,
        action: AuditAction.ORGANIZATION_CREATED,
        entityType: 'Organization',
        entityId: org.id,
        metadata: {
          email: normalizedEmail,
          role: 'ADMIN', // New org creators are admins
          organizationId: org.id,
          organizationName,
          orgRole: 'OWNER',
          publicDomain: true,
        },
      })

      return NextResponse.json({
        success: true,
        data: {
          message: `Organization "${organizationName}" created successfully. Please verify your email to continue.`,
          requiresVerification: true,
          userId: user.id,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            organizationId: org.id,
            organizationName,
          },
        },
      })
    }

    // For non-public domains, check if domain is acceptable
    if (!isAcceptableDomain(domain)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_DOMAIN',
            message: 'Invalid email domain format',
          },
        },
        { status: 400 }
      )
    }

    // Check if domain is already claimed (for company email domains)
    const existingDomain = await prisma.organizationDomain.findUnique({
      where: { domain },
      include: { organization: true },
    })

    let organizationId: string
    let orgRole: 'OWNER' | 'MEMBER'
    let orgName: string

    if (existingDomain) {
      // User is joining existing organization - require role selection
      if (!role) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ROLE_REQUIRED',
              message: 'Please select your role',
              needsRoleSelection: true,
              organizationName: existingDomain.organization.name,
            },
          },
          { status: 400 }
        )
      }

      // AUTO-JOIN existing organization with selected role
      organizationId = existingDomain.organizationId
      orgRole = 'MEMBER'
      orgName = existingDomain.organization.name
    } else {
      // NEW ORGANIZATION - requires organizationName
      if (!organizationName) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ORG_NAME_REQUIRED',
              message: 'Organization name is required for new domain',
              needsOrgCreation: true,
              suggestedOrgName: extractOrgNameFromDomain(domain),
            },
          },
          { status: 400 }
        )
      }

      const slug = generateSlug(organizationName)

      // Check if slug is already taken
      const existingOrg = await prisma.organization.findUnique({
        where: { slug },
      })

      if (existingOrg) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ORG_SLUG_EXISTS',
              message: 'An organization with this name already exists. Please choose a different name.',
            },
          },
          { status: 409 }
        )
      }

      // Create new organization
      const org = await prisma.organization.create({
        data: {
          name: organizationName,
          slug,
          isActive: true,
        },
      })

      // Create organization settings
      await prisma.organizationSettings.create({
        data: organizationSettings ? {
          organizationId: org.id,
          ...organizationSettings,
          planningCycle: organizationSettings.planningCycle as PlanningCycle,
          weekStartDay: organizationSettings.weekStartDay as WeekStartDay,
        } : {
          organizationId: org.id,
          locationLabel: 'City',
          locationLabelPlural: 'Cities',
          partyLabel: 'Partner',
          partyLabelPlural: 'Partners',
          resourceTypeLabel: 'Truck Type',
          resourceTypeLabelPlural: 'Truck Types',
          demandLabel: 'Demand',
          demandLabelPlural: 'Demand Forecasts',
          supplyLabel: 'Supply',
          supplyLabelPlural: 'Supply Commitments',
          demandCategoryLabel: 'Category',
          demandCategoryLabelPlural: 'Categories',
          demandCategoryEnabled: false,
          demandCategoryRequired: false,
          planningCycle: planningCycle || 'DAILY',
          weekStartDay: weekStartDay || 'SUNDAY',
        },
      })

      // Claim domain
      await prisma.organizationDomain.create({
        data: {
          organizationId: org.id,
          domain,
          isVerified: true,
          isPrimary: true,
        },
      })

      organizationId = org.id
      orgRole = 'OWNER'
      orgName = organizationName
    }

    // Hash password
    const passwordHash = await hashPassword(password)

    // Determine user role: new org creators are ADMIN, others use provided role or default to DEMAND_PLANNER
    const userRole = orgRole === 'OWNER' ? 'ADMIN' : (role || 'DEMAND_PLANNER')

    // Create new user with currentOrgId
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash,
        firstName,
        lastName,
        mobileNumber,
        role: userRole,
        currentOrgId: organizationId,
        emailVerified: false, // Require email verification
      },
    })

    // Create organization membership
    await prisma.organizationMember.create({
      data: {
        organizationId,
        userId: user.id,
        role: orgRole,
        functionalRole: userRole,
      },
    })

    // Generate OTP and send verification email
    console.log('[REGISTER] Generating OTP for user:', user.id, normalizedEmail)
    const otpCode = await createOTP(user.id, 'EMAIL_VERIFICATION')
    console.log('[REGISTER] OTP generated successfully:', otpCode.substring(0, 2) + '****')

    console.log('[REGISTER] Attempting to send OTP email to:', normalizedEmail)
    try {
      const emailResult = await sendOTPEmail({
        to: normalizedEmail,
        firstName,
        otp: otpCode,
        purpose: 'verification',
      })
      console.log('[REGISTER] OTP email sent successfully:', emailResult)
    } catch (emailError) {
      console.error('[REGISTER] Failed to send OTP email:', emailError)
      // Don't throw - allow registration to continue even if email fails
    }

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: AuditAction.USER_REGISTERED,
      entityType: 'User',
      entityId: user.id,
      metadata: {
        email: normalizedEmail,
        role: userRole,
        organizationId,
        organizationName: orgName,
        orgRole,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        message:
          orgRole === 'OWNER'
            ? `Organization "${orgName}" created successfully. Please verify your email to continue.`
            : `Joined ${orgName} successfully. Please verify your email to continue.`,
        requiresVerification: true,
        userId: user.id,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          organizationId,
          organizationName: orgName,
        },
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    )
  }
}
