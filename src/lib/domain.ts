// Domain utilities for multi-tenancy organization management

// List of common public email domains that cannot be used for automatic organization creation
const PUBLIC_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'yahoo.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'mail.com',
  'protonmail.com',
  'proton.me',
  'live.com',
  'msn.com',
  'ymail.com',
  'rocketmail.com',
]

/**
 * Extract domain from email address
 * @example extractDomain('john@mepco.com') // 'mepco.com'
 */
export function extractDomain(email: string): string {
  const parts = email.split('@')
  if (parts.length !== 2) {
    throw new Error('Invalid email address')
  }
  return parts[1].toLowerCase().trim()
}

/**
 * Check if a domain is a public email provider
 * @example isPublicDomain('gmail.com') // true
 * @example isPublicDomain('mepco.com') // false
 */
export function isPublicDomain(domain: string): boolean {
  return PUBLIC_DOMAINS.includes(domain.toLowerCase().trim())
}

/**
 * Extract organization name suggestion from domain
 * @example extractOrgNameFromDomain('mepco.com') // 'Mepco'
 * @example extractOrgNameFromDomain('saudi-cables.com') // 'Saudi Cables'
 */
export function extractOrgNameFromDomain(domain: string): string {
  // Remove TLD (.com, .net, etc.)
  const nameWithoutTld = domain.split('.')[0]

  // Replace hyphens and underscores with spaces
  const nameWithSpaces = nameWithoutTld.replace(/[-_]/g, ' ')

  // Capitalize each word
  const capitalized = nameWithSpaces
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  return capitalized
}

/**
 * Generate URL-friendly slug from organization name
 * @example generateSlug('Mepco Industries') // 'mepco-industries'
 * @example generateSlug('Saudi Cables & Co.') // 'saudi-cables-co'
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    // Replace spaces and special characters with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '')
    // Remove consecutive hyphens
    .replace(/-+/g, '-')
}

/**
 * Validate email format
 * @example isValidEmail('john@example.com') // true
 * @example isValidEmail('invalid-email') // false
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check if domain is acceptable for organization creation
 * (not public and has valid format)
 */
export function isAcceptableDomain(domain: string): boolean {
  // Check if it's not a public domain
  if (isPublicDomain(domain)) {
    return false
  }

  // Check if domain has at least one dot
  if (!domain.includes('.')) {
    return false
  }

  // Check if domain has valid characters
  const domainRegex = /^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/i
  return domainRegex.test(domain)
}
