// Phone number validation and formatting by country

export interface CountryPhoneConfig {
  code: string
  name: string
  prefix: string
  placeholder: string
  pattern: RegExp
  format: (value: string) => string
}

export const COUNTRY_PHONE_CONFIGS: Record<string, CountryPhoneConfig> = {
  SA: {
    code: 'SA',
    name: 'Saudi Arabia',
    prefix: '+966',
    placeholder: '+966XXXXXXXXX (e.g., +966501234567)',
    pattern: /^\+966[0-9]{9}$/,
    format: (value: string) => {
      // Remove any non-digit characters except +
      let cleaned = value.replace(/[^\d+]/g, '')

      // If starts with 966 without +, add +
      if (cleaned.startsWith('966')) {
        cleaned = '+' + cleaned
      }

      // If starts with 0, replace with +966
      if (cleaned.startsWith('0')) {
        cleaned = '+966' + cleaned.substring(1)
      }

      // If doesn't start with +966, prepend it
      if (!cleaned.startsWith('+966')) {
        cleaned = '+966' + cleaned
      }

      return cleaned
    },
  },
  EG: {
    code: 'EG',
    name: 'Egypt',
    prefix: '+20',
    placeholder: '+20XXXXXXXXXX (e.g., +201234567890)',
    pattern: /^\+20[0-9]{10}$/,
    format: (value: string) => {
      let cleaned = value.replace(/[^\d+]/g, '')
      if (cleaned.startsWith('20')) {
        cleaned = '+' + cleaned
      }
      if (cleaned.startsWith('0')) {
        cleaned = '+20' + cleaned.substring(1)
      }
      if (!cleaned.startsWith('+20')) {
        cleaned = '+20' + cleaned
      }
      return cleaned
    },
  },
  AE: {
    code: 'AE',
    name: 'United Arab Emirates',
    prefix: '+971',
    placeholder: '+971XXXXXXXXX (e.g., +971501234567)',
    pattern: /^\+971[0-9]{9}$/,
    format: (value: string) => {
      let cleaned = value.replace(/[^\d+]/g, '')
      if (cleaned.startsWith('971')) {
        cleaned = '+' + cleaned
      }
      if (cleaned.startsWith('0')) {
        cleaned = '+971' + cleaned.substring(1)
      }
      if (!cleaned.startsWith('+971')) {
        cleaned = '+971' + cleaned
      }
      return cleaned
    },
  },
}

// Default config for unknown countries
const DEFAULT_CONFIG: CountryPhoneConfig = {
  code: 'DEFAULT',
  name: 'International',
  prefix: '+',
  placeholder: '+XXXXXXXXXXXX',
  pattern: /^\+[0-9]{8,15}$/,
  format: (value: string) => {
    let cleaned = value.replace(/[^\d+]/g, '')
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned
    }
    return cleaned
  },
}

export function getPhoneConfig(countryCode?: string | null): CountryPhoneConfig {
  if (!countryCode) return DEFAULT_CONFIG
  return COUNTRY_PHONE_CONFIGS[countryCode] || DEFAULT_CONFIG
}

export function validatePhoneNumber(
  phoneNumber: string | null | undefined,
  countryCode?: string | null
): { valid: boolean; formatted?: string; error?: string } {
  // Phone number is optional, so empty is valid
  if (!phoneNumber || phoneNumber.trim() === '') {
    return { valid: true }
  }

  const config = getPhoneConfig(countryCode)
  const formatted = config.format(phoneNumber)

  if (!config.pattern.test(formatted)) {
    return {
      valid: false,
      error: `Phone number must be in format: ${config.placeholder}`,
    }
  }

  return { valid: true, formatted }
}

export function formatPhoneNumber(
  phoneNumber: string | null | undefined,
  countryCode?: string | null
): string {
  if (!phoneNumber) return ''
  const config = getPhoneConfig(countryCode)
  return config.format(phoneNumber)
}
