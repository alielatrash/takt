# Onboarding Flow Implementation

## Overview
Implemented a comprehensive 3-step onboarding wizard for new organizations that guides users through setup instead of just asking for an organization name.

## What's New

### 1. Multi-Step Onboarding Wizard ([onboarding-wizard.tsx](src/components/onboarding/onboarding-wizard.tsx))

**Step 1: Organization Details**
- Organization name entry
- Clear progress indicators

**Step 2: Terminology Customization**
- Industry presets (Trucking, Manufacturing, Retail, Warehousing, Custom)
- Auto-fill labels based on industry selection
- Customizable labels for:
  - Locations (City/Warehouse/Factory/Store)
  - Partners (Client/Customer/Vendor)
  - Resource Types (Truck Type/Product/Material)
  - Demand (Order/Requirement)
  - Supply (Capacity/Production)

**Step 3: Planning Configuration**
- Planning cycle selection (Daily/Weekly/Monthly)
- Week start day (for weekly planning)
- Configuration summary

### 2. Updated Registration Flow

**Before:**
- User enters email/password/name/role
- If new org → simple org name dialog
- Role selection required for ALL users

**After:**
- User enters email/password/name (NO role selection)
- If new org/unclaimed domain → **Onboarding Wizard** (3 steps)
- If existing org → Role selection happens on backend
- Better UX with clear guidance

### 3. Database Schema Updates

Added to `OrganizationSettings`:
```prisma
planningCycle PlanningCycle @default(DAILY) // DAILY, WEEKLY, MONTHLY
weekStartDay  WeekStartDay  @default(SUNDAY) // SUNDAY, MONDAY, SATURDAY
```

**Note:** Database migration needs to be run manually to apply these changes.

## Industry Presets

### Trucking & Logistics (Default)
- Locations: City / Cities
- Partners: Partner / Partners
- Resources: Truck Type / Truck Types
- Demand: Demand / Demand Forecasts
- Supply: Supply / Supply Commitments

### Manufacturing
- Locations: Factory / Factories
- Partners: Customer / Customers
- Resources: Product / Products
- Demand: Order / Orders
- Supply: Production / Production Plans

### Retail & Distribution
- Locations: Store / Stores
- Partners: Vendor / Vendors
- Resources: Product / Products
- Demand: Demand / Demand Forecasts
- Supply: Inventory / Inventory Plans

### Warehousing
- Locations: Warehouse / Warehouses
- Partners: Client / Clients
- Resources: Material / Materials
- Demand: Requirement / Requirements
- Supply: Capacity / Capacity Plans

### Custom
- Generic defaults that can be fully customized

## Benefits

1. **Better First Experience**: New users are guided through setup instead of being dropped into an empty org
2. **Industry-Specific**: Terminology automatically matches the user's industry
3. **Planning Flexibility**: Support for different planning cycles (architecture ready for future implementation)
4. **Reduced Friction**: No need to ask for role during initial signup
5. **Clear Progress**: Visual progress indicator shows where users are in the setup process

## Next Steps

### Immediate (Required)
1. **Run Database Migration**: Apply schema changes for planning cycle fields
   ```bash
   npx prisma migrate dev --name add_planning_cycle
   ```

2. **Update Registration API**: Modify `/api/auth/register` to accept `organizationSettings` parameter from onboarding wizard

### Future Enhancements
1. **Apply Labels Throughout UI**: Update navigation, page titles, table headers to use custom labels
2. **Implement Planning Cycle Logic**:
   - Weekly planning: Group data by weeks instead of days
   - Monthly planning: Group data by months
   - Adjust date pickers and filters based on planning cycle
3. **Add More Onboarding Steps**:
   - Time zone selection
   - Currency selection
   - Fiscal year start
   - Import initial data (CSV upload)
4. **Industry-Specific Defaults**:
   - Pre-populate common locations/partners for selected industry
   - Industry-specific report templates

## Files Modified

- `src/components/onboarding/onboarding-wizard.tsx` (NEW)
- `src/components/auth/register-form.tsx` (Updated to use wizard)
- `prisma/schema.prisma` (Added planning cycle fields)

## Testing

Test the onboarding flow by:
1. Register with a public email (Gmail) → Should see onboarding wizard
2. Register with an unclaimed company domain → Should see onboarding wizard
3. Try different industry presets → Labels should auto-fill
4. Complete all 3 steps → Should create org with custom settings
5. Register with an existing org's domain → Should auto-join without onboarding

## Architecture Notes

### Planning Cycle Implementation

The planning cycle field is now stored but not yet fully implemented in the UI. Current system is built for daily planning. To fully implement weekly/monthly:

**Weekly Planning Changes Needed:**
- `PlanningWeek` model → Rename to `PlanningPeriod`
- Date range calculations based on `weekStartDay`
- Aggregate daily data into weeks
- Update all date filters to work with week ranges

**Monthly Planning Changes Needed:**
- Date range calculations for month boundaries
- Aggregate daily data into months
- Handle month-end/start date logic
- Update all date filters to work with month ranges

**Impact:**
- Dashboard aggregations
- Report date grouping
- Forecast/supply data entry
- Date pickers and filters
- Export logic

This is a significant architectural change and should be planned as a separate feature after onboarding is live.
