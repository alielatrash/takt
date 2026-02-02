import { startOfWeek, endOfWeek, getWeek, getYear, addWeeks, format, startOfMonth, endOfMonth, addMonths, getMonth } from 'date-fns'
import { prisma } from './prisma'

// Helper to convert WeekStartDay enum to date-fns weekStartsOn value
function weekStartDayToNumber(weekStartDay: string): 0 | 1 | 6 {
  switch (weekStartDay.toUpperCase()) {
    case 'SUNDAY': return 0
    case 'MONDAY': return 1
    case 'SATURDAY': return 6
    default: return 0
  }
}

// Get the Sunday of the week containing the given date
export function getWeekStart(date: Date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 0 }) // 0 = Sunday
}

// Get the Saturday of the week containing the given date
export function getWeekEnd(date: Date = new Date()): Date {
  return endOfWeek(date, { weekStartsOn: 0 })
}

// Get week number (ISO week)
export function getWeekNumber(date: Date = new Date()): number {
  return getWeek(date, { weekStartsOn: 0 })
}

// Format week/month display string
export function formatWeekDisplay(weekStart: Date, weekEnd: Date): string {
  // Check if this is a full month (starts on 1st and ends on last day of month)
  const isFullMonth = weekStart.getDate() === 1 &&
    endOfMonth(weekStart).getDate() === weekEnd.getDate() &&
    weekStart.getMonth() === weekEnd.getMonth()

  if (isFullMonth) {
    // For full months, show month name with date range
    return `${format(weekStart, 'MMMM yyyy')} (${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')})`
  }

  // For weeks or partial periods, show date range
  return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
}

// Get or create planning week
export async function getOrCreatePlanningWeek(date: Date = new Date(), organizationId: string) {
  const weekStart = getWeekStart(date)
  const weekEnd = getWeekEnd(date)
  const year = getYear(weekStart)
  const weekNumber = getWeekNumber(weekStart)

  // Try to find existing week for this organization
  let planningWeek = await prisma.planningWeek.findUnique({
    where: { organizationId_year_weekNumber: { organizationId, year, weekNumber } },
  })

  if (!planningWeek) {
    // Create new week for this organization
    planningWeek = await prisma.planningWeek.create({
      data: {
        organizationId,
        weekStart,
        weekEnd,
        year,
        weekNumber,
      },
    })
  }

  return planningWeek
}

// Get current planning week
export async function getCurrentPlanningWeek(organizationId: string) {
  const now = new Date()
  return getOrCreatePlanningWeek(now, organizationId)
}

// Get upcoming periods (current + next N periods) - respects organization's planning cycle
export async function getUpcomingWeeks(count: number = 4, organizationId: string) {
  // Fetch organization settings to determine planning cycle
  const orgSettings = await prisma.organizationSettings.findUnique({
    where: { organizationId },
  })

  const planningCycle = orgSettings?.planningCycle || 'DAILY'
  const weekStartDay = orgSettings?.weekStartDay || 'SUNDAY'

  if (planningCycle === 'MONTHLY') {
    return getUpcomingMonths(count, organizationId)
  }

  // DAILY and WEEKLY both use weekly periods (DAILY is future enhancement)
  const weekStartsOn = weekStartDayToNumber(weekStartDay)
  const now = new Date()

  // Calculate week ranges for all weeks we need
  const weekRanges = []
  for (let i = 0; i < count; i++) {
    const date = addWeeks(now, i)
    const weekStart = startOfWeek(date, { weekStartsOn })
    const weekEnd = endOfWeek(date, { weekStartsOn })
    const year = getYear(weekStart)
    const weekNumber = getWeek(weekStart, { weekStartsOn })
    weekRanges.push({ year, weekNumber, weekStart, weekEnd })
  }

  // Fetch all existing weeks in one query (scoped to organization)
  const existingWeeks = await prisma.planningWeek.findMany({
    where: {
      organizationId,
      OR: weekRanges.map(({ year, weekNumber }) => ({ year, weekNumber }))
    }
  })

  // Create a map of existing weeks by year-weekNumber
  const existingWeeksMap = new Map(
    existingWeeks.map(w => [`${w.year}-${w.weekNumber}`, w])
  )

  // Identify missing weeks
  const missingWeeks = weekRanges.filter(
    ({ year, weekNumber }) => !existingWeeksMap.has(`${year}-${weekNumber}`)
  )

  // Create all missing weeks in one transaction (if any)
  if (missingWeeks.length > 0) {
    await prisma.planningWeek.createMany({
      data: missingWeeks.map(({ year, weekNumber, weekStart, weekEnd }) => ({
        organizationId,
        year,
        weekNumber,
        weekStart,
        weekEnd,
      })),
      skipDuplicates: true,
    })

    // Fetch the newly created weeks
    const newWeeks = await prisma.planningWeek.findMany({
      where: {
        organizationId,
        OR: missingWeeks.map(({ year, weekNumber }) => ({ year, weekNumber }))
      }
    })

    // Add them to the map
    newWeeks.forEach(w => existingWeeksMap.set(`${w.year}-${w.weekNumber}`, w))
  }

  // Return weeks in the correct order
  return weekRanges.map(({ year, weekNumber }) =>
    existingWeeksMap.get(`${year}-${weekNumber}`)!
  )
}

// Get upcoming months (for monthly planning cycle)
async function getUpcomingMonths(count: number = 4, organizationId: string) {
  const now = new Date()

  // Calculate month ranges
  const monthRanges = []
  for (let i = 0; i < count; i++) {
    const date = addMonths(now, i)
    const monthStart = startOfMonth(date)
    const monthEnd = endOfMonth(date)
    const year = getYear(monthStart)
    const monthNumber = getMonth(monthStart) + 1 // getMonth is 0-indexed
    monthRanges.push({ year, weekNumber: monthNumber, weekStart: monthStart, weekEnd: monthEnd })
  }

  // Fetch existing months (stored in planningWeek table, but weekNumber represents month)
  const existingMonths = await prisma.planningWeek.findMany({
    where: {
      organizationId,
      OR: monthRanges.map(({ year, weekNumber }) => ({ year, weekNumber }))
    }
  })

  // Create map of existing months
  const existingMonthsMap = new Map(
    existingMonths.map(m => [`${m.year}-${m.weekNumber}`, m])
  )

  // Identify missing months
  const missingMonths = monthRanges.filter(
    ({ year, weekNumber }) => !existingMonthsMap.has(`${year}-${weekNumber}`)
  )

  // Create missing months
  if (missingMonths.length > 0) {
    await prisma.planningWeek.createMany({
      data: missingMonths.map(({ year, weekNumber, weekStart, weekEnd }) => ({
        organizationId,
        year,
        weekNumber, // For months, weekNumber stores month number (1-12)
        weekStart,
        weekEnd,
      })),
      skipDuplicates: true,
    })

    // Fetch newly created months
    const newMonths = await prisma.planningWeek.findMany({
      where: {
        organizationId,
        OR: missingMonths.map(({ year, weekNumber }) => ({ year, weekNumber }))
      }
    })

    // Add to map
    newMonths.forEach(m => existingMonthsMap.set(`${m.year}-${m.weekNumber}`, m))
  }

  // Return months in correct order
  return monthRanges.map(({ year, weekNumber }) =>
    existingMonthsMap.get(`${year}-${weekNumber}`)!
  )
}

// Mark a week as current
export async function setCurrentWeek(weekId: string) {
  // Remove current flag from all weeks
  await prisma.planningWeek.updateMany({
    where: { isCurrent: true },
    data: { isCurrent: false },
  })

  // Set the new current week
  return prisma.planningWeek.update({
    where: { id: weekId },
    data: { isCurrent: true },
  })
}

// Lock a week (prevent edits)
export async function lockWeek(weekId: string) {
  return prisma.planningWeek.update({
    where: { id: weekId },
    data: { isLocked: true },
  })
}
