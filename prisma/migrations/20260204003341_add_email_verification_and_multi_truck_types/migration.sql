-- Add email verification fields to User
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

-- Create junction table for DemandForecast to ResourceType many-to-many relationship
CREATE TABLE "DemandForecastResourceType" (
    "id" TEXT NOT NULL,
    "demandForecastId" TEXT NOT NULL,
    "resourceTypeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemandForecastResourceType_pkey" PRIMARY KEY ("id")
);

-- Migrate existing data: copy resourceTypeId relationships to junction table
INSERT INTO "DemandForecastResourceType" ("id", "demandForecastId", "resourceTypeId", "createdAt")
SELECT
    gen_random_uuid()::text,
    "id",
    "resourceTypeId",
    CURRENT_TIMESTAMP
FROM "DemandForecast"
WHERE "resourceTypeId" IS NOT NULL;

-- Drop the old unique constraint that includes resourceTypeId
ALTER TABLE "DemandForecast" DROP CONSTRAINT IF EXISTS "DemandForecast_organizationId_planningWeekId_partyId_pickupL_key";

-- Drop the resourceTypeId column from DemandForecast
ALTER TABLE "DemandForecast" DROP COLUMN "resourceTypeId";

-- Create new unique constraint without resourceTypeId
CREATE UNIQUE INDEX "DemandForecast_organizationId_planningWeekId_partyId_pickupL_key" ON "DemandForecast"("organizationId", "planningWeekId", "partyId", "pickupLocationId", "dropoffLocationId", "demandCategoryId");

-- Create unique constraint on junction table
CREATE UNIQUE INDEX "DemandForecastResourceType_demandForecastId_resourceTypeId_key" ON "DemandForecastResourceType"("demandForecastId", "resourceTypeId");

-- Create indices on junction table
CREATE INDEX "DemandForecastResourceType_demandForecastId_idx" ON "DemandForecastResourceType"("demandForecastId");
CREATE INDEX "DemandForecastResourceType_resourceTypeId_idx" ON "DemandForecastResourceType"("resourceTypeId");

-- Add foreign key constraints to junction table
ALTER TABLE "DemandForecastResourceType" ADD CONSTRAINT "DemandForecastResourceType_demandForecastId_fkey" FOREIGN KEY ("demandForecastId") REFERENCES "DemandForecast"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DemandForecastResourceType" ADD CONSTRAINT "DemandForecastResourceType_resourceTypeId_fkey" FOREIGN KEY ("resourceTypeId") REFERENCES "ResourceType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Update ResourceType relation indexes (removing old demandForecasts relation)
-- Note: Prisma will handle the relation field changes in the schema
