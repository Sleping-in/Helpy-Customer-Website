import * as Location from 'expo-location'
import type { LocationGeocodedAddress } from 'expo-location'
import { Platform } from 'react-native'
import HelpyPlaces from '../../modules/helpy-places'

export const QATAR_BOUNDS = {
  minLat: 24.4,
  maxLat: 26.3,
  minLng: 50.6,
  maxLng: 51.7,
} as const

export type NormalizedGeocode = {
  title: string
  name: string
  street: string
  streetNumber: string
  district: string
  city: string
  region: string
  subregion: string
  postalCode: string
  country: string
  formatted: string
  zoneHint: string
}

export type SearchResult = {
  id: string
  label: string
  secondary: string
  category?: string
  latitude: number
  longitude: number
}

export type PermissionOutcome =
  | { status: 'granted' }
  | { status: 'denied'; canAskAgain: boolean }
  | { status: 'unavailable'; message: string }

export function isInQatar(latitude: number, longitude: number) {
  return latitude >= QATAR_BOUNDS.minLat && latitude <= QATAR_BOUNDS.maxLat
    && longitude >= QATAR_BOUNDS.minLng && longitude <= QATAR_BOUNDS.maxLng
}

function cleanPart(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function parseZoneHint(...candidates: (string | null | undefined)[]) {
  for (const candidate of candidates) {
    const match = cleanPart(candidate).match(/\bzone\s*[-#:]?\s*(\d{1,3})\b/i)
    if (match) return match[1]
  }
  return ''
}

function numericFromName(name: string) {
  const trimmed = cleanPart(name)
  if (/^\d{1,4}[A-Za-z]?$/.test(trimmed)) return trimmed
  const match = trimmed.match(/\b(\d{1,4}[A-Za-z]?)\b/)
  return match?.[1] || ''
}

export function formatGeocodedAddress(row: LocationGeocodedAddress) {
  const parts = [
    [cleanPart(row.streetNumber), cleanPart(row.street)].filter(Boolean).join(' '),
    cleanPart(row.name) && cleanPart(row.name) !== cleanPart(row.street) ? cleanPart(row.name) : '',
    cleanPart(row.district),
    cleanPart(row.city),
    cleanPart(row.subregion),
    cleanPart(row.region),
    cleanPart(row.postalCode),
    cleanPart(row.country),
  ].filter(Boolean)
  const unique = parts.filter((part, index) => parts.findIndex(item => item.toLowerCase() === part.toLowerCase()) === index)
  return unique.join(', ')
}

export function normalizeGeocode(row: LocationGeocodedAddress): NormalizedGeocode {
  const name = cleanPart(row.name)
  const street = cleanPart(row.street)
  const streetNumber = cleanPart(row.streetNumber) || numericFromName(name)
  const district = cleanPart(row.district)
  const city = cleanPart(row.city)
  const region = cleanPart(row.region)
  const subregion = cleanPart(row.subregion)
  const postalCode = cleanPart(row.postalCode)
  const country = cleanPart(row.country)
  const zoneHint = parseZoneHint(district, name, street, city, subregion)
  const formatted = formatGeocodedAddress(row) || [streetNumber, street, district, city, region, country].filter(Boolean).join(', ')
  return {
    title: name || street || district || city || 'Selected Location',
    name,
    street,
    streetNumber,
    district,
    city,
    region,
    subregion,
    postalCode,
    country,
    formatted,
    zoneHint,
  }
}

export async function ensureForegroundPermission(): Promise<PermissionOutcome> {
  try {
    const current = await Location.getForegroundPermissionsAsync()
    if (current.granted) return { status: 'granted' }
    if (!current.canAskAgain && current.status === Location.PermissionStatus.DENIED) {
      return { status: 'denied', canAskAgain: false }
    }
    const requested = await Location.requestForegroundPermissionsAsync()
    if (requested.granted) return { status: 'granted' }
    return { status: 'denied', canAskAgain: requested.canAskAgain }
  } catch (reason) {
    return { status: 'unavailable', message: reason instanceof Error ? reason.message : 'Location services are unavailable.' }
  }
}

export type PositionFix = {
  latitude: number
  longitude: number
  /** Horizontal accuracy radius in metres (lower is better). */
  accuracy: number
}

const REFINE_MAX_MS = 6000
const REFINE_TARGET_M = 15

function toFix(position: Location.LocationObject): PositionFix {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy ?? Number.POSITIVE_INFINITY,
  }
}

/**
 * Fast first fix, then a short high-accuracy refinement.
 * - Emits a quick fix immediately (last-known if fresh enough, else one BestForNavigation read).
 * - Then watches at BestForNavigation (1 m / 500 ms) for up to ~6 s or until accuracy <= 15 m,
 *   emitting every improvement and keeping the best (lowest accuracy value).
 * - The watcher is always removed: on finish, on `cancel()`, and if cancelled before it subscribed.
 * Caller must have foreground permission already.
 */
export function refineCurrentPosition(onUpdate: (fix: PositionFix, final: boolean) => void) {
  let cancelled = false
  let finished = false
  let best: PositionFix | null = null
  let subscription: Location.LocationSubscription | null = null
  let timer: ReturnType<typeof setTimeout> | null = null

  const stop = () => {
    if (timer) { clearTimeout(timer); timer = null }
    if (subscription) { subscription.remove(); subscription = null }
  }

  const consider = (fix: PositionFix) => {
    if (cancelled || finished) return
    if (!best || fix.accuracy < best.accuracy) {
      best = fix
      onUpdate(fix, false)
    }
    if (best.accuracy <= REFINE_TARGET_M) finish()
  }

  const finish = () => {
    if (cancelled || finished) return
    finished = true
    stop()
    if (best) onUpdate(best, true)
  }

  const done = (async () => {
    try {
      const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000, requiredAccuracy: 100 }).catch(() => null)
      if (cancelled) return null
      if (last) consider(toFix(last))
      if (!best) {
        const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.BestForNavigation })
        if (cancelled) return null
        consider(toFix(first))
      }
      if (finished) return best
      const watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, distanceInterval: 1, timeInterval: 500 },
        position => consider(toFix(position)),
      )
      if (cancelled || finished) { watcher.remove(); return best }
      subscription = watcher
      timer = setTimeout(finish, REFINE_MAX_MS)
      return best
    } catch (reason) {
      stop()
      if (!best && !cancelled) throw reason
      if (best && !cancelled && !finished) { finished = true; onUpdate(best, true) }
      return best
    }
  })()

  return {
    done,
    cancel: () => { cancelled = true; stop() },
  }
}

/** Reverse geocode; when several placemarks come back, prefer the most specific one. */
function specificity(row: LocationGeocodedAddress) {
  let score = 0
  if (cleanPart(row.streetNumber)) score += 4
  if (cleanPart(row.name) && cleanPart(row.street)) score += 3
  if (cleanPart(row.street)) score += 2
  if (cleanPart(row.district)) score += 1
  if (cleanPart(row.city)) score += 1
  return score
}

export async function reverseGeocodePoint(latitude: number, longitude: number) {
  try {
    const rows = await Location.reverseGeocodeAsync({ latitude, longitude })
    if (!rows.length) return null
    const best = [...rows].sort((a, b) => specificity(b) - specificity(a))[0]
    return normalizeGeocode(best)
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Unable to look up this location.'
    if (/rate|throttl|quota|too many/i.test(message)) {
      throw new Error('Address lookup is busy. Wait a moment and try again.')
    }
    throw new Error(message)
  }
}

export async function searchPlaces(
  query: string,
  bias?: { latitude: number; longitude: number },
): Promise<SearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length < 2) return []

  if (Platform.OS === 'ios' && HelpyPlaces) {
    const rows = await HelpyPlaces.searchAsync(trimmed, bias?.latitude, bias?.longitude)
    return rows.map(row => ({
      ...row,
      secondary: [row.category, row.secondary].filter(Boolean).join(' · '),
    }))
  }

  const biased = /qatar/i.test(trimmed) ? trimmed : `${trimmed}, Qatar`
  try {
    const rows = await Location.geocodeAsync(biased)
    const inQatar = rows.filter(row => isInQatar(row.latitude, row.longitude)).slice(0, 5)
    const labelled = await Promise.all(inQatar.map(async (row, index) => {
      try {
        const reverse = await reverseGeocodePoint(row.latitude, row.longitude)
        const label = reverse?.formatted || trimmed
        const [primary, ...rest] = label.split(',')
        return {
          id: `${row.latitude},${row.longitude},${index}`,
          label: primary.trim() || trimmed,
          secondary: rest.join(',').trim() || 'Qatar',
          latitude: row.latitude,
          longitude: row.longitude,
        }
      } catch {
        return {
          id: `${row.latitude},${row.longitude},${index}`,
          label: trimmed,
          secondary: `${row.latitude.toFixed(4)}, ${row.longitude.toFixed(4)}`,
          latitude: row.latitude,
          longitude: row.longitude,
        }
      }
    }))
    return labelled
  } catch (reason) {
    const message = reason instanceof Error ? reason.message : 'Location search failed.'
    if (/rate|throttl|quota|too many/i.test(message)) {
      throw new Error('Search is busy. Wait a moment and try again.')
    }
    if (/network|offline|internet|failed to connect/i.test(message)) {
      throw new Error('You appear to be offline. Check your connection and try again.')
    }
    throw new Error(message)
  }
}

export function normalizeMatchKey(input: string) {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\b(municipality|governorate|province|city|area|zone)\b/g, '')
    .replace(/\bal[-\s]+/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim()
}

function levenshtein(left: string, right: string) {
  const values = Array.from({ length: right.length + 1 }, (_, index) => index)
  for (let i = 1; i <= left.length; i += 1) {
    let previous = values[0]
    values[0] = i
    for (let j = 1; j <= right.length; j += 1) {
      const saved = values[j]
      values[j] = Math.min(values[j] + 1, values[j - 1] + 1, previous + (left[i - 1] === right[j - 1] ? 0 : 1))
      previous = saved
    }
  }
  return values[right.length]
}

export function matchNamedItem<T extends { name: string }>(items: T[], ...candidates: string[]) {
  for (const candidate of candidates) {
    const key = normalizeMatchKey(candidate)
    if (!key) continue
    const exact = items.find(item => {
      const name = normalizeMatchKey(item.name)
      return name === key || name.includes(key) || key.includes(name)
    })
    if (exact) return exact
    const ranked = items
      .map(item => ({ item, score: levenshtein(normalizeMatchKey(item.name), key) }))
      .sort((a, b) => a.score - b.score)
    if (ranked[0] && ranked[0].score <= 3) return ranked[0].item
  }
  return undefined
}

export function haversineKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const earth = 6371
  const dLat = toRad(b.latitude - a.latitude)
  const dLng = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * earth * Math.asin(Math.sqrt(h))
}

export function nearestByCoordinates<T extends { latitude?: number; longitude?: number }>(
  items: T[],
  point: { latitude: number; longitude: number },
) {
  const ranked = items
    .filter(item => Number.isFinite(item.latitude) && Number.isFinite(item.longitude))
    .map(item => ({
      item,
      distance: haversineKm(point, { latitude: item.latitude as number, longitude: item.longitude as number }),
    }))
    .sort((a, b) => a.distance - b.distance)
  return ranked[0]?.item
}
