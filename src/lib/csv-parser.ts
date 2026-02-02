import Papa from 'papaparse'

export interface CsvParseResult<T> {
  data: T[]
  errors: string[]
  rowsProcessed: number
  rowsSkipped: number
}

export interface CsvValidationRule<T> {
  field: keyof T
  required?: boolean
  validate?: (value: unknown) => boolean
  transform?: (value: unknown) => unknown
  errorMessage?: string
}

export async function parseCsv<T>(
  file: File,
  validationRules: CsvValidationRule<T>[]
): Promise<CsvParseResult<T>> {
  return new Promise((resolve) => {
    const results: T[] = []
    const errors: string[] = []
    let rowsProcessed = 0
    let rowsSkipped = 0

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (parseResult) => {
        parseResult.data.forEach((row: unknown, index: number) => {
          rowsProcessed++
          const rowNumber = index + 2 // +2 because index starts at 0 and we have a header row

          try {
            const validatedRow: Partial<T> = {}
            let hasError = false

            for (const rule of validationRules) {
              const fieldName = String(rule.field)
              let value = (row as Record<string, unknown>)[fieldName]

              // Check if required field is missing
              if (rule.required && (value === undefined || value === null || value === '')) {
                errors.push(`Row ${rowNumber}: Missing required field "${fieldName}"`)
                hasError = true
                continue
              }

              // Transform value if transform function provided
              if (rule.transform && value !== undefined && value !== null && value !== '') {
                value = rule.transform(value)
              }

              // Validate value if validate function provided
              if (rule.validate && value !== undefined && value !== null && value !== '') {
                if (!rule.validate(value)) {
                  errors.push(
                    `Row ${rowNumber}: Invalid value for "${fieldName}". ${rule.errorMessage || ''}`
                  )
                  hasError = true
                  continue
                }
              }

              validatedRow[rule.field] = value as T[keyof T]
            }

            if (!hasError) {
              results.push(validatedRow as T)
            } else {
              rowsSkipped++
            }
          } catch (error) {
            errors.push(`Row ${rowNumber}: ${error instanceof Error ? error.message : 'Unknown error'}`)
            rowsSkipped++
          }
        })

        resolve({
          data: results,
          errors,
          rowsProcessed,
          rowsSkipped,
        })
      },
      error: (error) => {
        resolve({
          data: [],
          errors: [`CSV parsing error: ${error.message}`],
          rowsProcessed: 0,
          rowsSkipped: 0,
        })
      },
    })
  })
}

// Validation helpers
export const validators = {
  isNotEmpty: (value: unknown): boolean => {
    return value !== undefined && value !== null && String(value).trim() !== ''
  },

  isValidEmail: (value: unknown): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return typeof value === 'string' && emailRegex.test(value)
  },

  isNumber: (value: unknown): boolean => {
    return !isNaN(Number(value))
  },

  isPositiveNumber: (value: unknown): boolean => {
    return !isNaN(Number(value)) && Number(value) >= 0
  },

  isOneOf: (allowedValues: string[]) => (value: unknown): boolean => {
    return typeof value === 'string' && allowedValues.includes(value)
  },
}

// Transform helpers
export const transforms = {
  trim: (value: unknown): string => {
    return String(value).trim()
  },

  uppercase: (value: unknown): string => {
    return String(value).toUpperCase()
  },

  lowercase: (value: unknown): string => {
    return String(value).toLowerCase()
  },

  toNumber: (value: unknown): number => {
    return Number(value)
  },

  toBoolean: (value: unknown): boolean => {
    if (typeof value === 'boolean') return value
    const str = String(value).toLowerCase().trim()
    return str === 'true' || str === '1' || str === 'yes' || str === 'y'
  },
}
