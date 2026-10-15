import { Platform } from 'react-native'
import { getOrCreateDeviceId, readAccessToken, writeFirebaseCustomToken, writeSession } from './session'

const DEFAULT_API_BASE = 'https://admin.helpyapp.tech/api/v1'
const API_BASE = (process.env.EXPO_PUBLIC_HELPY_API_BASE || DEFAULT_API_BASE).replace(/\/$/, '')

type HelpyEnvelope<T> = {
  status?: boolean
  message?: string
  token?: string
  data?: T
}

export class HelpyAuthError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

async function request<T>(
  path: string,
  options: { form?: Record<string, string>; authenticated?: boolean } = {},
) {
  const { form, authenticated = true } = options
  const headers: Record<string, string> = {
    Accept: 'application/json',
    language: 'en',
    lan: '25.2854',
    long: '51.5310',
  }

  if (authenticated) {
    const token = await readAccessToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  if (form) headers['Content-Type'] = 'application/x-www-form-urlencoded'

  const response = await fetch(`${API_BASE}/${path}`, {
    method: form ? 'POST' : 'GET',
    headers,
    body: form ? new URLSearchParams(form).toString() : undefined,
  })
  const payload = await response.json().catch(() => null) as HelpyEnvelope<T> | null

  if (!response.ok || !payload?.status) {
    throw new HelpyAuthError(payload?.message || `Helpy request failed (${response.status})`, response.status)
  }
  return payload
}

export async function requestLoginOtp(email: string) {
  await request('otp-send', {
    form: {
      phone_number: '',
      email: email.trim().toLowerCase(),
      user_type: 'user',
      otp_type: 'email',
      type: 'login',
    },
  })
}

export async function verifyLoginOtp(email: string, code: string) {
  const deviceId = await getOrCreateDeviceId()
  const payload = await request<Record<string, unknown>>('login', {
    form: {
      phone_number: '',
      email: email.trim().toLowerCase(),
      user_type: 'user',
      otp_type: 'email',
      otp_code: code,
      device_id: deviceId,
      device_type: Platform.OS === 'ios' ? 'ios' : 'android',
      device_token: '',
    },
  })

  if (!payload.token) throw new HelpyAuthError('Login response did not include a token.', 200)
  await writeSession(payload.token, 'user')
  const firebaseToken = payload.data?.firebaseToken
  if (typeof firebaseToken === 'string') await writeFirebaseCustomToken(firebaseToken)
}
