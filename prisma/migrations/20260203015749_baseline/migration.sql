-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DEMAND_PLANNER', 'SUPPLY_PLANNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OTPPurpose" AS ENUM ('EMAIL_VERIFICATION', 'LOGIN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEMAND_CREATED', 'SUPPLY_UPDATED', 'SUPPLY_CREATED');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SubscriptionTier" AS ENUM ('STARTER', 'PROFESSIONAL', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('FREE_TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "SubscriptionEventType" AS ENUM ('CREATED', 'UPGRADED', 'DOWNGRADED', 'RENEWED', 'CANCELLED', 'PAYMENT_FAILED', 'REACTIVATED', 'TRIAL_CONVERTED');

-- CreateEnum
CREATE TYPE "PlanningCycle" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "WeekStartDay" AS ENUM ('SUNDAY', 'MONDAY', 'SATURDAY');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "PartyRole" AS ENUM ('CUSTOMER', 'SUPPLIER', 'CARRIER', 'VENDOR', 'MANUFACTURER', 'DISTRIBUTOR');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('CITY', 'WAREHOUSE', 'FACTORY', 'STORE', 'PLANT', 'DISTRIBUTION_CENTER', 'PORT', 'TERMINAL');

-- CreateEnum
CREATE TYPE "RedashEndpoint" AS ENUM ('ACTUAL_SHIPPER_REQUESTS', 'FLEET_PARTNER_COMPLETION');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'FAILED', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "PlatformAdminRole" AS ENUM ('ADMIN', 'SUPER_ADMIN');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "mobileNumber" TEXT,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL,
    "currentOrgId" TEXT,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActivityAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserManagedClient" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserManagedClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OTPCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" "OTPPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OTPCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "functionalRole" "UserRole" NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT DEFAULT 'SA',
    "subscriptionTier" "SubscriptionTier" NOT NULL DEFAULT 'STARTER',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'FREE_TRIAL',
    "trialEndsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "OrgStatus" NOT NULL DEFAULT 'ACTIVE',
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "suspendedBy" TEXT,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "currentBillingCycle" "BillingCycle",
    "subscriptionCurrentPeriodEnd" TIMESTAMP(3),
    "subscriptionCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "priceOverride" INTEGER,
    "seatLimit" INTEGER,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventType" "SubscriptionEventType" NOT NULL,
    "fromTier" "SubscriptionTier",
    "toTier" "SubscriptionTier",
    "fromBillingCycle" "BillingCycle",
    "toBillingCycle" "BillingCycle",
    "stripeEventId" TEXT,
    "amount" INTEGER,
    "metadata" JSONB,
    "triggeredBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "locationLabel" TEXT NOT NULL DEFAULT 'City',
    "locationLabelPlural" TEXT NOT NULL DEFAULT 'Cities',
    "partyLabel" TEXT NOT NULL DEFAULT 'Partner',
    "partyLabelPlural" TEXT NOT NULL DEFAULT 'Partners',
    "resourceTypeLabel" TEXT NOT NULL DEFAULT 'Truck Type',
    "resourceTypeLabelPlural" TEXT NOT NULL DEFAULT 'Truck Types',
    "demandLabel" TEXT NOT NULL DEFAULT 'Demand',
    "demandLabelPlural" TEXT NOT NULL DEFAULT 'Demand Forecasts',
    "supplyLabel" TEXT NOT NULL DEFAULT 'Supply',
    "supplyLabelPlural" TEXT NOT NULL DEFAULT 'Supply Commitments',
    "demandCategoryLabel" TEXT NOT NULL DEFAULT 'Category',
    "demandCategoryLabelPlural" TEXT NOT NULL DEFAULT 'Categories',
    "demandCategoryEnabled" BOOLEAN NOT NULL DEFAULT false,
    "demandCategoryRequired" BOOLEAN NOT NULL DEFAULT false,
    "planningCycle" "PlanningCycle" NOT NULL DEFAULT 'DAILY',
    "weekStartDay" "WeekStartDay" NOT NULL DEFAULT 'SUNDAY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationDomain" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "functionalRole" "UserRole" NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedBy" TEXT,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicEmailDomain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicEmailDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "uniqueIdentifier" TEXT,
    "pointOfContact" TEXT,
    "phoneNumber" TEXT,
    "partyRole" "PartyRole" NOT NULL,
    "capacity" INTEGER,
    "capacityType" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "nameAr" TEXT,
    "locationType" "LocationType",
    "region" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceType" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "category" TEXT,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandCategory" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningWeek" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "year" INTEGER NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanningWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandForecast" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planningWeekId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "pickupLocationId" TEXT NOT NULL,
    "dropoffLocationId" TEXT NOT NULL,
    "routeKey" TEXT NOT NULL,
    "demandCategoryId" TEXT,
    "resourceTypeId" TEXT NOT NULL,
    "day1Qty" INTEGER NOT NULL DEFAULT 0,
    "day2Qty" INTEGER NOT NULL DEFAULT 0,
    "day3Qty" INTEGER NOT NULL DEFAULT 0,
    "day4Qty" INTEGER NOT NULL DEFAULT 0,
    "day5Qty" INTEGER NOT NULL DEFAULT 0,
    "day6Qty" INTEGER NOT NULL DEFAULT 0,
    "day7Qty" INTEGER NOT NULL DEFAULT 0,
    "week1Qty" INTEGER NOT NULL DEFAULT 0,
    "week2Qty" INTEGER NOT NULL DEFAULT 0,
    "week3Qty" INTEGER NOT NULL DEFAULT 0,
    "week4Qty" INTEGER NOT NULL DEFAULT 0,
    "week5Qty" INTEGER NOT NULL DEFAULT 0,
    "totalQty" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyCommitment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "planningWeekId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "routeKey" TEXT NOT NULL,
    "resourceTypeId" TEXT,
    "day1Committed" INTEGER NOT NULL DEFAULT 0,
    "day2Committed" INTEGER NOT NULL DEFAULT 0,
    "day3Committed" INTEGER NOT NULL DEFAULT 0,
    "day4Committed" INTEGER NOT NULL DEFAULT 0,
    "day5Committed" INTEGER NOT NULL DEFAULT 0,
    "day6Committed" INTEGER NOT NULL DEFAULT 0,
    "day7Committed" INTEGER NOT NULL DEFAULT 0,
    "week1Committed" INTEGER NOT NULL DEFAULT 0,
    "week2Committed" INTEGER NOT NULL DEFAULT 0,
    "week3Committed" INTEGER NOT NULL DEFAULT 0,
    "week4Committed" INTEGER NOT NULL DEFAULT 0,
    "week5Committed" INTEGER NOT NULL DEFAULT 0,
    "totalCommitted" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplyCommitment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSubmission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RedashSync" (
    "id" TEXT NOT NULL,
    "endpoint" "RedashEndpoint" NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" "SyncStatus" NOT NULL,
    "recordsCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RedashSync_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActualShipperRequest" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "shipperName" TEXT,
    "citym" TEXT NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL,
    "truckType" TEXT,
    "loadsRequested" INTEGER NOT NULL,
    "loadsFulfilled" INTEGER NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActualShipperRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetPartnerCompletion" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "supplierName" TEXT,
    "citym" TEXT NOT NULL,
    "completionDate" TIMESTAMP(3) NOT NULL,
    "truckType" TEXT,
    "loadsCompleted" INTEGER NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetPartnerCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformAdmin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "PlatformAdminRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,

    CONSTRAINT "PlatformAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetName" TEXT,
    "beforeState" JSONB,
    "afterState" JSONB,
    "reason" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_currentOrgId_idx" ON "User"("currentOrgId");

-- CreateIndex
CREATE INDEX "User_onboardingCompleted_idx" ON "User"("onboardingCompleted");

-- CreateIndex
CREATE INDEX "User_lastActivityAt_idx" ON "User"("lastActivityAt");

-- CreateIndex
CREATE INDEX "UserManagedClient_userId_idx" ON "UserManagedClient"("userId");

-- CreateIndex
CREATE INDEX "UserManagedClient_partyId_idx" ON "UserManagedClient"("partyId");

-- CreateIndex
CREATE UNIQUE INDEX "UserManagedClient_userId_partyId_key" ON "UserManagedClient"("userId", "partyId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_token_idx" ON "Session"("token");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "OTPCode_userId_purpose_idx" ON "OTPCode"("userId", "purpose");

-- CreateIndex
CREATE INDEX "OTPCode_expiresAt_idx" ON "OTPCode"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_token_idx" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_organizationId_idx" ON "Invitation"("organizationId");

-- CreateIndex
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");

-- CreateIndex
CREATE INDEX "Invitation_acceptedAt_idx" ON "Invitation"("acceptedAt");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_stripeSubscriptionId_key" ON "Organization"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_isActive_idx" ON "Organization"("isActive");

-- CreateIndex
CREATE INDEX "Organization_country_idx" ON "Organization"("country");

-- CreateIndex
CREATE INDEX "Organization_subscriptionTier_idx" ON "Organization"("subscriptionTier");

-- CreateIndex
CREATE INDEX "Organization_subscriptionStatus_idx" ON "Organization"("subscriptionStatus");

-- CreateIndex
CREATE INDEX "Organization_status_idx" ON "Organization"("status");

-- CreateIndex
CREATE INDEX "Organization_stripeCustomerId_idx" ON "Organization"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Organization_stripeSubscriptionId_idx" ON "Organization"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionEvent_stripeEventId_key" ON "SubscriptionEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_organizationId_idx" ON "SubscriptionEvent"("organizationId");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_eventType_idx" ON "SubscriptionEvent"("eventType");

-- CreateIndex
CREATE INDEX "SubscriptionEvent_createdAt_idx" ON "SubscriptionEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSettings_organizationId_key" ON "OrganizationSettings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationDomain_domain_key" ON "OrganizationDomain"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationDomain_verificationToken_key" ON "OrganizationDomain"("verificationToken");

-- CreateIndex
CREATE INDEX "OrganizationDomain_organizationId_idx" ON "OrganizationDomain"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationDomain_domain_idx" ON "OrganizationDomain"("domain");

-- CreateIndex
CREATE INDEX "OrganizationDomain_verificationToken_idx" ON "OrganizationDomain"("verificationToken");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationDomain_organizationId_domain_key" ON "OrganizationDomain"("organizationId", "domain");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMember_role_idx" ON "OrganizationMember"("role");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PublicEmailDomain_domain_key" ON "PublicEmailDomain"("domain");

-- CreateIndex
CREATE INDEX "PublicEmailDomain_domain_idx" ON "PublicEmailDomain"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Party_uniqueIdentifier_key" ON "Party"("uniqueIdentifier");

-- CreateIndex
CREATE INDEX "Party_organizationId_idx" ON "Party"("organizationId");

-- CreateIndex
CREATE INDEX "Party_name_idx" ON "Party"("name");

-- CreateIndex
CREATE INDEX "Party_partyRole_idx" ON "Party"("partyRole");

-- CreateIndex
CREATE INDEX "Party_isActive_idx" ON "Party"("isActive");

-- CreateIndex
CREATE INDEX "Party_uniqueIdentifier_idx" ON "Party"("uniqueIdentifier");

-- CreateIndex
CREATE UNIQUE INDEX "Party_organizationId_name_partyRole_key" ON "Party"("organizationId", "name", "partyRole");

-- CreateIndex
CREATE INDEX "Location_organizationId_idx" ON "Location"("organizationId");

-- CreateIndex
CREATE INDEX "Location_name_idx" ON "Location"("name");

-- CreateIndex
CREATE INDEX "Location_locationType_idx" ON "Location"("locationType");

-- CreateIndex
CREATE INDEX "Location_region_idx" ON "Location"("region");

-- CreateIndex
CREATE INDEX "Location_isActive_idx" ON "Location"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Location_organizationId_name_key" ON "Location"("organizationId", "name");

-- CreateIndex
CREATE INDEX "ResourceType_organizationId_idx" ON "ResourceType"("organizationId");

-- CreateIndex
CREATE INDEX "ResourceType_name_idx" ON "ResourceType"("name");

-- CreateIndex
CREATE INDEX "ResourceType_category_idx" ON "ResourceType"("category");

-- CreateIndex
CREATE INDEX "ResourceType_isActive_idx" ON "ResourceType"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceType_organizationId_name_key" ON "ResourceType"("organizationId", "name");

-- CreateIndex
CREATE INDEX "DemandCategory_organizationId_idx" ON "DemandCategory"("organizationId");

-- CreateIndex
CREATE INDEX "DemandCategory_name_idx" ON "DemandCategory"("name");

-- CreateIndex
CREATE INDEX "DemandCategory_isActive_idx" ON "DemandCategory"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "DemandCategory_organizationId_name_key" ON "DemandCategory"("organizationId", "name");

-- CreateIndex
CREATE INDEX "PlanningWeek_organizationId_idx" ON "PlanningWeek"("organizationId");

-- CreateIndex
CREATE INDEX "PlanningWeek_weekStart_idx" ON "PlanningWeek"("weekStart");

-- CreateIndex
CREATE INDEX "PlanningWeek_isCurrent_idx" ON "PlanningWeek"("isCurrent");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningWeek_organizationId_year_weekNumber_key" ON "PlanningWeek"("organizationId", "year", "weekNumber");

-- CreateIndex
CREATE INDEX "DemandForecast_organizationId_idx" ON "DemandForecast"("organizationId");

-- CreateIndex
CREATE INDEX "DemandForecast_routeKey_idx" ON "DemandForecast"("routeKey");

-- CreateIndex
CREATE INDEX "DemandForecast_planningWeekId_idx" ON "DemandForecast"("planningWeekId");

-- CreateIndex
CREATE INDEX "DemandForecast_demandCategoryId_idx" ON "DemandForecast"("demandCategoryId");

-- CreateIndex
CREATE INDEX "DemandForecast_partyId_idx" ON "DemandForecast"("partyId");

-- CreateIndex
CREATE INDEX "DemandForecast_pickupLocationId_idx" ON "DemandForecast"("pickupLocationId");

-- CreateIndex
CREATE INDEX "DemandForecast_dropoffLocationId_idx" ON "DemandForecast"("dropoffLocationId");

-- CreateIndex
CREATE INDEX "DemandForecast_resourceTypeId_idx" ON "DemandForecast"("resourceTypeId");

-- CreateIndex
CREATE INDEX "DemandForecast_createdById_idx" ON "DemandForecast"("createdById");

-- CreateIndex
CREATE INDEX "DemandForecast_planningWeekId_partyId_idx" ON "DemandForecast"("planningWeekId", "partyId");

-- CreateIndex
CREATE INDEX "DemandForecast_planningWeekId_routeKey_idx" ON "DemandForecast"("planningWeekId", "routeKey");

-- CreateIndex
CREATE UNIQUE INDEX "DemandForecast_organizationId_planningWeekId_partyId_pickup_key" ON "DemandForecast"("organizationId", "planningWeekId", "partyId", "pickupLocationId", "dropoffLocationId", "resourceTypeId", "demandCategoryId");

-- CreateIndex
CREATE INDEX "SupplyCommitment_organizationId_idx" ON "SupplyCommitment"("organizationId");

-- CreateIndex
CREATE INDEX "SupplyCommitment_routeKey_idx" ON "SupplyCommitment"("routeKey");

-- CreateIndex
CREATE INDEX "SupplyCommitment_planningWeekId_idx" ON "SupplyCommitment"("planningWeekId");

-- CreateIndex
CREATE INDEX "SupplyCommitment_partyId_idx" ON "SupplyCommitment"("partyId");

-- CreateIndex
CREATE INDEX "SupplyCommitment_resourceTypeId_idx" ON "SupplyCommitment"("resourceTypeId");

-- CreateIndex
CREATE INDEX "SupplyCommitment_createdById_idx" ON "SupplyCommitment"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "SupplyCommitment_organizationId_planningWeekId_partyId_rout_key" ON "SupplyCommitment"("organizationId", "planningWeekId", "partyId", "routeKey", "resourceTypeId");

-- CreateIndex
CREATE INDEX "ContactSubmission_email_idx" ON "ContactSubmission"("email");

-- CreateIndex
CREATE INDEX "ContactSubmission_createdAt_idx" ON "ContactSubmission"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RedashSync_endpoint_key" ON "RedashSync"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "ActualShipperRequest_externalId_key" ON "ActualShipperRequest"("externalId");

-- CreateIndex
CREATE INDEX "ActualShipperRequest_citym_idx" ON "ActualShipperRequest"("citym");

-- CreateIndex
CREATE INDEX "ActualShipperRequest_requestDate_idx" ON "ActualShipperRequest"("requestDate");

-- CreateIndex
CREATE INDEX "ActualShipperRequest_shipperName_idx" ON "ActualShipperRequest"("shipperName");

-- CreateIndex
CREATE UNIQUE INDEX "FleetPartnerCompletion_externalId_key" ON "FleetPartnerCompletion"("externalId");

-- CreateIndex
CREATE INDEX "FleetPartnerCompletion_citym_idx" ON "FleetPartnerCompletion"("citym");

-- CreateIndex
CREATE INDEX "FleetPartnerCompletion_completionDate_idx" ON "FleetPartnerCompletion"("completionDate");

-- CreateIndex
CREATE INDEX "FleetPartnerCompletion_supplierName_idx" ON "FleetPartnerCompletion"("supplierName");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdmin_userId_key" ON "PlatformAdmin"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformAdmin_email_key" ON "PlatformAdmin"("email");

-- CreateIndex
CREATE INDEX "PlatformAdmin_userId_idx" ON "PlatformAdmin"("userId");

-- CreateIndex
CREATE INDEX "PlatformAdmin_email_idx" ON "PlatformAdmin"("email");

-- CreateIndex
CREATE INDEX "PlatformAdmin_role_idx" ON "PlatformAdmin"("role");

-- CreateIndex
CREATE INDEX "ActivityEvent_organizationId_idx" ON "ActivityEvent"("organizationId");

-- CreateIndex
CREATE INDEX "ActivityEvent_actorUserId_idx" ON "ActivityEvent"("actorUserId");

-- CreateIndex
CREATE INDEX "ActivityEvent_eventType_idx" ON "ActivityEvent"("eventType");

-- CreateIndex
CREATE INDEX "ActivityEvent_createdAt_idx" ON "ActivityEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_organizationId_createdAt_idx" ON "ActivityEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ActivityEvent_actorUserId_createdAt_idx" ON "ActivityEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminUserId_idx" ON "AdminAuditLog"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_actionType_idx" ON "AdminAuditLog"("actionType");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetType_targetId_idx" ON "AdminAuditLog"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_adminUserId_createdAt_idx" ON "AdminAuditLog"("adminUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserManagedClient" ADD CONSTRAINT "UserManagedClient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OTPCode" ADD CONSTRAINT "OTPCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionEvent" ADD CONSTRAINT "SubscriptionEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationSettings" ADD CONSTRAINT "OrganizationSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationDomain" ADD CONSTRAINT "OrganizationDomain_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Party" ADD CONSTRAINT "Party_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceType" ADD CONSTRAINT "ResourceType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandCategory" ADD CONSTRAINT "DemandCategory_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningWeek" ADD CONSTRAINT "PlanningWeek_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_planningWeekId_fkey" FOREIGN KEY ("planningWeekId") REFERENCES "PlanningWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_pickupLocationId_fkey" FOREIGN KEY ("pickupLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_dropoffLocationId_fkey" FOREIGN KEY ("dropoffLocationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_demandCategoryId_fkey" FOREIGN KEY ("demandCategoryId") REFERENCES "DemandCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_resourceTypeId_fkey" FOREIGN KEY ("resourceTypeId") REFERENCES "ResourceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyCommitment" ADD CONSTRAINT "SupplyCommitment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyCommitment" ADD CONSTRAINT "SupplyCommitment_planningWeekId_fkey" FOREIGN KEY ("planningWeekId") REFERENCES "PlanningWeek"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyCommitment" ADD CONSTRAINT "SupplyCommitment_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyCommitment" ADD CONSTRAINT "SupplyCommitment_resourceTypeId_fkey" FOREIGN KEY ("resourceTypeId") REFERENCES "ResourceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyCommitment" ADD CONSTRAINT "SupplyCommitment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityEvent" ADD CONSTRAINT "ActivityEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

