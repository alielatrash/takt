'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Input } from '@/components/ui/input'

// Country data with dial codes and validation rules
export const COUNTRIES = [
  {
    code: 'SA',
    name: 'Saudi Arabia',
    dialCode: '+966',
    flag: '🇸🇦',
    minDigits: 9,
    maxDigits: 9,
    placeholder: '5xxxxxxxx',
  },
  {
    code: 'EG',
    name: 'Egypt',
    dialCode: '+20',
    flag: '🇪🇬',
    minDigits: 10,
    maxDigits: 10,
    placeholder: '10xxxxxxxx',
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    dialCode: '+971',
    flag: '🇦🇪',
    minDigits: 9,
    maxDigits: 9,
    placeholder: '5xxxxxxxx',
  },
  {
    code: 'KW',
    name: 'Kuwait',
    dialCode: '+965',
    flag: '🇰🇼',
    minDigits: 8,
    maxDigits: 8,
    placeholder: '9xxxxxxx',
  },
  {
    code: 'QA',
    name: 'Qatar',
    dialCode: '+974',
    flag: '🇶🇦',
    minDigits: 8,
    maxDigits: 8,
    placeholder: 'xxxxxxxx',
  },
  {
    code: 'BH',
    name: 'Bahrain',
    dialCode: '+973',
    flag: '🇧🇭',
    minDigits: 8,
    maxDigits: 8,
    placeholder: 'xxxxxxxx',
  },
  {
    code: 'OM',
    name: 'Oman',
    dialCode: '+968',
    flag: '🇴🇲',
    minDigits: 8,
    maxDigits: 8,
    placeholder: 'xxxxxxxx',
  },
  {
    code: 'JO',
    name: 'Jordan',
    dialCode: '+962',
    flag: '🇯🇴',
    minDigits: 9,
    maxDigits: 9,
    placeholder: '7xxxxxxxx',
  },
  {
    code: 'LB',
    name: 'Lebanon',
    dialCode: '+961',
    flag: '🇱🇧',
    minDigits: 7,
    maxDigits: 8,
    placeholder: 'xxxxxxxx',
  },
  {
    code: 'IQ',
    name: 'Iraq',
    dialCode: '+964',
    flag: '🇮🇶',
    minDigits: 10,
    maxDigits: 10,
    placeholder: '7xxxxxxxxx',
  },
  {
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    flag: '🇺🇸',
    minDigits: 10,
    maxDigits: 10,
    placeholder: 'xxxxxxxxxx',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    flag: '🇬🇧',
    minDigits: 10,
    maxDigits: 10,
    placeholder: 'xxxxxxxxxx',
  },
  {
    code: 'IN',
    name: 'India',
    dialCode: '+91',
    flag: '🇮🇳',
    minDigits: 10,
    maxDigits: 10,
    placeholder: 'xxxxxxxxxx',
  },
  {
    code: 'PK',
    name: 'Pakistan',
    dialCode: '+92',
    flag: '🇵🇰',
    minDigits: 10,
    maxDigits: 10,
    placeholder: '3xxxxxxxxx',
  },
] as const

export interface PhoneInputProps {
  value?: string
  onChange?: (value: string, isValid: boolean) => void
  onCountryChange?: (country: typeof COUNTRIES[number]) => void
  disabled?: boolean
  className?: string
  defaultCountry?: string
}

export function PhoneInput({
  value = '',
  onChange,
  onCountryChange,
  disabled,
  className,
  defaultCountry = 'SA',
}: PhoneInputProps) {
  const [open, setOpen] = React.useState(false)

  // Parse the value to extract country code and phone number
  const parsePhoneNumber = (fullNumber: string) => {
    if (!fullNumber) return { countryCode: defaultCountry, phoneNumber: '' }

    // Find matching country by dial code
    for (const country of COUNTRIES) {
      if (fullNumber.startsWith(country.dialCode)) {
        return {
          countryCode: country.code,
          phoneNumber: fullNumber.slice(country.dialCode.length),
        }
      }
    }

    return { countryCode: defaultCountry, phoneNumber: fullNumber }
  }

  const { countryCode: initialCountryCode, phoneNumber: initialPhoneNumber } = parsePhoneNumber(value)
  const [selectedCountryCode, setSelectedCountryCode] = React.useState(initialCountryCode)
  const [phoneNumber, setPhoneNumber] = React.useState(initialPhoneNumber)

  const selectedCountry = COUNTRIES.find((c) => c.code === selectedCountryCode) || COUNTRIES[0]

  // Validate phone number
  const validatePhoneNumber = (number: string) => {
    if (!number) return false
    const digitCount = number.replace(/\D/g, '').length
    return digitCount >= selectedCountry.minDigits && digitCount <= selectedCountry.maxDigits
  }

  const handleCountryChange = (country: typeof COUNTRIES[number]) => {
    setSelectedCountryCode(country.code)
    setOpen(false)

    // Call onCountryChange callback
    if (onCountryChange) {
      onCountryChange(country)
    }

    // Revalidate and emit the new full number
    const fullNumber = phoneNumber ? `${country.dialCode}${phoneNumber}` : ''
    const isValid = validatePhoneNumber(phoneNumber)
    if (onChange) {
      onChange(fullNumber, isValid)
    }
  }

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    // Allow only digits
    const digits = input.replace(/\D/g, '')

    // Limit to max digits for country
    const limited = digits.slice(0, selectedCountry.maxDigits)
    setPhoneNumber(limited)

    // Emit the full phone number with country code
    const fullNumber = limited ? `${selectedCountry.dialCode}${limited}` : ''
    const isValid = validatePhoneNumber(limited)

    if (onChange) {
      onChange(fullNumber, isValid)
    }
  }

  return (
    <div className={cn('flex gap-2', className)}>
      {/* Country Selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[140px] justify-between px-3"
            disabled={disabled}
          >
            <span className="flex items-center gap-2 overflow-hidden">
              <span className="text-lg">{selectedCountry.flag}</span>
              <span className="font-medium">{selectedCountry.dialCode}</span>
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Search country..." />
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] overflow-auto">
              {COUNTRIES.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.dialCode}`}
                  onSelect={() => handleCountryChange(country)}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      selectedCountryCode === country.code ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="text-lg mr-2">{country.flag}</span>
                  <span className="flex-1">{country.name}</span>
                  <span className="text-muted-foreground">{country.dialCode}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Phone Number Input */}
      <div className="relative flex-1">
        <Input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          placeholder={selectedCountry.placeholder}
          disabled={disabled}
          className="text-base"
        />
      </div>
    </div>
  )
}
