import { clearFirebaseCustomToken, readAccessToken, readFirebaseCustomToken, readFirebaseSession, writeFirebaseSession } from './session'

const projectId = process.env.EXPO_PUBLIC_HELPY_FIREBASE_PROJECT_ID || 'helpy-61026'
const apiKey = process.env.EXPO_PUBLIC_HELPY_FIREBASE_API_KEY || ''

export type ChatUser = { id: string; name: string; email: string; image: string; about: string; online: boolean }
export type ChatMessage = { id: string; fromId: string; toId: string; body: string; sent: string }
type FirebaseSession = { idToken: string; localId: string; refreshToken: string; expiresAt: number }
type FirestoreValue = { stringValue?: string; integerValue?: string; booleanValue?: boolean }
type FirestoreDocument = { name: string; fields?: Record<string, FirestoreValue> }

const field = (document: FirestoreDocument, key: string) => document.fields?.[key]
const stringField = (document: FirestoreDocument, key: string) => String(field(document, key)?.stringValue ?? field(document, key)?.integerValue ?? '')

async function storedSession() {
  try { const value = await readFirebaseSession(); const parsed = value ? JSON.parse(value) as FirebaseSession : undefined; return parsed?.idToken && parsed.localId ? parsed : undefined } catch { return undefined }
}
async function saveSession(value: FirebaseSession) { await writeFirebaseSession(JSON.stringify(value)); return value }
async function refreshSession(value: FirebaseSession) {
  if (!value.refreshToken || !apiKey) return undefined
  const response = await fetch(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: value.refreshToken }).toString() })
  const payload = await response.json().catch(() => null) as { id_token?: string; user_id?: string; refresh_token?: string; expires_in?: string } | null
  if (!response.ok || !payload?.id_token || !payload.user_id) return undefined
  return saveSession({ idToken: payload.id_token, localId: payload.user_id, refreshToken: payload.refresh_token || value.refreshToken, expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000 })
}
async function connect() {
  if (!apiKey) throw new Error('Firebase API configuration is missing from this build.')
  const stored = await storedSession()
  if (stored && stored.expiresAt > Date.now() + 60000) return stored
  if (stored) { const refreshed = await refreshSession(stored); if (refreshed) return refreshed }
  if (!await readAccessToken()) throw new Error('Sign in to Helpy before opening messages.')
  const customToken = await readFirebaseCustomToken()
  if (!customToken) throw new Error('Sign in again to connect your Helpy messages.')
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) })
  const auth = await response.json().catch(() => null) as { idToken?: string; localId?: string; refreshToken?: string; expiresIn?: string; error?: { message?: string } } | null
  if (!response.ok || !auth?.idToken || !auth.localId) throw new Error(auth?.error?.message || 'Firebase chat sign-in failed.')
  await clearFirebaseCustomToken()
  return saveSession({ idToken: auth.idToken, localId: auth.localId, refreshToken: auth.refreshToken || '', expiresAt: Date.now() + Number(auth.expiresIn || 3600) * 1000 })
}
async function firestore(path: string, init?: RequestInit) {
  const auth = await connect()
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${path}`, { ...init, headers: { Accept: 'application/json', Authorization: `Bearer ${auth.idToken}`, ...(init?.headers || {}) } })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error((payload as { error?: { message?: string } })?.error?.message || 'Unable to load messages.')
  return payload
}

export async function getChatUsers() {
  const auth = await connect()
  const payload = await firestore('users?pageSize=100') as { documents?: FirestoreDocument[] }
  return (payload.documents || []).map(document => ({ id: stringField(document, 'id') || document.name.split('/').pop() || '', name: stringField(document, 'name') || stringField(document, 'email'), email: stringField(document, 'email'), image: stringField(document, 'image'), about: stringField(document, 'about'), online: Boolean(field(document, 'is_online')?.booleanValue) })).filter(user => user.id && user.id !== auth.localId)
}
export async function getChatMessages(peerId: string) {
  const auth = await connect(); const conversationId = [auth.localId, peerId].sort().join('_')
  const payload = await firestore(`chats/${conversationId}/messages?pageSize=100&orderBy=sent%20desc`) as { documents?: FirestoreDocument[] }
  return (payload.documents || []).map(document => ({ id: document.name.split('/').pop() || '', fromId: stringField(document, 'fromId'), toId: stringField(document, 'toId'), body: stringField(document, 'msg'), sent: stringField(document, 'sent') })).reverse()
}
export async function sendChatMessage(peerId: string, body: string) {
  const auth = await connect(); const sent = String(Date.now()); const conversationId = [auth.localId, peerId].sort().join('_')
  await firestore(`chats/${conversationId}/messages?documentId=${sent}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { fromId: { stringValue: auth.localId }, toId: { stringValue: peerId }, msg: { stringValue: body }, read: { stringValue: '' }, sent: { stringValue: sent }, type: { stringValue: 'text' } } }) })
}
export async function currentChatUserId() { return (await connect()).localId }
