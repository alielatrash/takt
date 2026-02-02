import { useCurrentOrganization } from './use-organization'
import { getPhoneConfig, validatePhoneNumber, formatPhoneNumber } from '@/lib/phone-validation'

export function usePhoneValidation() {
  const { data: organization } = useCurrentOrganization()
  const countryCode = organization?.country

  const config = getPhoneConfig(countryCode)

  const validate = (phoneNumber: string | null | undefined) => {
    return validatePhoneNumber(phoneNumber, countryCode)
  }

  const format = (phoneNumber: string | null | undefined) => {
    return formatPhoneNumber(phoneNumber, countryCode)
  }

  return {
    config,
    validate,
    format,
    countryCode,
  }
}
