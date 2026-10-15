import * as SecureStore from 'expo-secure-store'

const ACCESS_TOKEN_KEY = 'helpy_access_token'
const SESSION_KIND_KEY = 'helpy_session_kind'
const DEVICE_ID_KEY = 'helpy_device_id'
const SELECTED_ADDRESS_KEY = 'helpy_selected_address_id'
const SAVED_BUSINESSES_KEY = 'helpy_local_saved_business_ids'
const FIREBASE_CUSTOM_TOKEN_KEY = 'helpy_firebase_custom_token'
const FIREBASE_SESSION_KEY = 'helpy_firebase_session'

export type SessionKind = 'guest' | 'user'

export async function readAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY)
}

export async function hasUserSession() {
  const [token, kind] = await Promise.all([
    readAccessToken(),
    SecureStore.getItemAsync(SESSION_KIND_KEY),
  ])
  return Boolean(token && kind === 'user')
}

export async function writeSession(token: string, kind: SessionKind) {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token),
    SecureStore.setItemAsync(SESSION_KIND_KEY, kind),
  ])
}

export async function getOrCreateDeviceId() {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY)
  if (existing) return existing

  const id = `native-${Date.now()}-${Math.random().toString(36).slice(2)}`
  await SecureStore.setItemAsync(DEVICE_ID_KEY, id)
  return id
}

export async function clearSession() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(SESSION_KIND_KEY),
    SecureStore.deleteItemAsync(SAVED_BUSINESSES_KEY),
    SecureStore.deleteItemAsync(FIREBASE_CUSTOM_TOKEN_KEY),
    SecureStore.deleteItemAsync(FIREBASE_SESSION_KEY),
  ])
}

export async function writeFirebaseCustomToken(token: string) {
  if (token.trim()) await SecureStore.setItemAsync(FIREBASE_CUSTOM_TOKEN_KEY, token)
}

export async function readFirebaseCustomToken() {
  return SecureStore.getItemAsync(FIREBASE_CUSTOM_TOKEN_KEY)
}

export async function clearFirebaseCustomToken() {
  return SecureStore.deleteItemAsync(FIREBASE_CUSTOM_TOKEN_KEY)
}

export async function writeFirebaseSession(value: string) {
  return SecureStore.setItemAsync(FIREBASE_SESSION_KEY, value)
}

export async function readFirebaseSession() {
  return SecureStore.getItemAsync(FIREBASE_SESSION_KEY)
}

export async function readSelectedAddressId() {
  return SecureStore.getItemAsync(SELECTED_ADDRESS_KEY)
}

export async function writeSelectedAddressId(id: string) {
  await SecureStore.setItemAsync(SELECTED_ADDRESS_KEY, id)
}

export async function readSavedBusinessIds(): Promise<string[]> {
  try {
    const stored = await SecureStore.getItemAsync(SAVED_BUSINESSES_KEY)
    const parsed: unknown = stored ? JSON.parse(stored) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export async function writeSavedBusinessIds(ids: string[]) {
  await SecureStore.setItemAsync(SAVED_BUSINESSES_KEY, JSON.stringify(ids))
}
