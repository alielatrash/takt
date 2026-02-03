# Database Migration Guide

This guide explains how to properly manage database schema changes to prevent data loss.

## The Problem We Had

Previously, we used `prisma db push --force-reset` which **deleted all data** in the database. This should NEVER be used on databases with important data.

## Proper Migration Workflow

### For Development (with data you want to keep)

1. **Make changes to `prisma/schema.prisma`**
   ```prisma
   model OrganizationSettings {
     // Add new fields
     demandCategoryEnabled Boolean @default(false)
     demandCategoryLabel String @default("Category")
   }
   ```

2. **Create a migration** (NOT db push)
   ```bash
   npx prisma migrate dev --name describe_your_change
   ```

   This will:
   - Create a migration file in `prisma/migrations/`
   - Apply it to your database
   - Regenerate Prisma Client
   - Keep all your data safe ✅

3. **Review the generated SQL**
   - Check `prisma/migrations/[timestamp]_describe_your_change/migration.sql`
   - Ensure it's doing what you expect
   - Add data migration logic if needed

### For Production

1. **Never use `migrate dev` in production**

2. **Use `migrate deploy` instead**
   ```bash
   npx prisma migrate deploy
   ```

   This applies pending migrations without interactive prompts.

3. **Always test migrations on staging first**

## Commands Comparison

| Command | Use Case | Keeps Data? | Creates Migration File? |
|---------|----------|-------------|------------------------|
| `prisma db push` | Quick prototyping, throwaway data | ✅ Usually | ❌ No |
| `prisma db push --force-reset` | ⚠️ **NEVER USE** | ❌ **DELETES EVERYTHING** | ❌ No |
| `prisma migrate dev` | Development with data to keep | ✅ Yes | ✅ Yes |
| `prisma migrate deploy` | Production deployments | ✅ Yes | Uses existing |

## Data Migration Example

Sometimes you need to transform existing data when changing the schema. Here's how:

```sql
-- migration.sql

-- 1. Add new column
ALTER TABLE "DemandForecast" ADD COLUMN "demandCategoryId" TEXT;

-- 2. Migrate existing data
UPDATE "DemandForecast"
SET "demandCategoryId" = (
  SELECT id FROM "DemandCategory"
  WHERE "DemandCategory"."name" = "DemandForecast"."vertical"
  AND "DemandCategory"."organizationId" = "DemandForecast"."organizationId"
)
WHERE "vertical" IS NOT NULL;

-- 3. Drop old column
ALTER TABLE "DemandForecast" DROP COLUMN "vertical";
```

## Migration Checklist

Before running migrations in production:

- [ ] Test migration on a database backup locally
- [ ] Review the generated SQL file
- [ ] Check for data transformations needed
- [ ] Have a rollback plan
- [ ] Backup production database
- [ ] Run migration during low-traffic period
- [ ] Verify data integrity after migration

## Recovering from Mistakes

If you accidentally deleted data:

1. **Restore from backup**
   - Your production database should have automated backups
   - Development databases should be re-seedable from fixtures

2. **Revert the schema**
   ```bash
   git revert HEAD
   npx prisma migrate dev --name revert_change
   ```

3. **Fix and try again**

## Best Practices

1. **Always commit migration files to Git**
   ```bash
   git add prisma/migrations/
   git commit -m "Add demand category feature"
   ```

2. **One logical change per migration**
   - Bad: "Update schema" (too vague)
   - Good: "Add demand category fields to organization settings"

3. **Test migrations both ways**
   - Test applying the migration (up)
   - Test rolling back (down) if needed

4. **Document breaking changes**
   - If a migration requires application code changes
   - Add notes in the migration file as comments

## Current Setup

We've created a baseline migration (`20260203015749_baseline`) that captures the current schema. All future changes should be done through proper migrations.

## Resources

- [Prisma Migrate Docs](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Production Best Practices](https://www.prisma.io/docs/guides/deployment/production-best-practices)
- [Migration Troubleshooting](https://www.prisma.io/docs/guides/database/production-troubleshooting)
