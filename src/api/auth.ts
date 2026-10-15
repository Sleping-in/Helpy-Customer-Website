import { helpyApi } from './helpy'

const DEVICE_ID_KEY = 'helpy_web_device_id'

function getDeviceId() {
  const existing = window.sessionStorage.getItem(DEVICE_ID_KEY)
  if (existing) return existing
  const id = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `web-${Date.now()}-${Math.random().toString(36).slice(2)}`
  window.sessionStorage.setItem(DEVICE_ID_KEY, id)
  return id
}

export async function requestLoginOtp(email: string) {
  await helpyApi.sendLoginOtp(email.trim().toLowerCase())
}

export type RegistrationDetails = { name: string; email: string; phoneNumber: string }
const REGISTRATION_KEY = 'helpy_registration_details'

export function getRegistrationDetails(): RegistrationDetails | null {
  try {
    const value = JSON.parse(window.sessionStorage.getItem(REGISTRATION_KEY) || 'null')
    return value?.name && value?.email && value?.phoneNumber ? value as RegistrationDetails : null
  } catch { return null }
}

export async function requestRegistrationOtp(input: RegistrationDetails) {
  const details = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phoneNumber: input.phoneNumber.replace(/\D/g, '').replace(/^(?=\d{8}$)/, '974'),
  }
  await helpyApi.sendRegistrationOtp(details)
  window.sessionStorage.setItem(REGISTRATION_KEY, JSON.stringify(details))
  return details
}

export async function verifyRegistrationOtp(code: string) {
  const details = getRegistrationDetails()
  if (!details) throw new Error('Your registration details were lost. Please start again.')
  await helpyApi.registerWithOtp({ ...details, code })
  window.sessionStorage.removeItem(REGISTRATION_KEY)
}

export async function verifyLoginOtp(email: string, code: string) {
  await helpyApi.loginWithOtp({
    email: email.trim().toLowerCase(),
    code,
    deviceId: getDeviceId(),
    // The live API currently exposes only the APK's accepted device values.
    // Keep this compatibility value until the backend adds an explicit web type.
    deviceType: 'android',
  })
  return true
}
