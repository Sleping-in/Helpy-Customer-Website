import type { HomeAddress, HomeBusiness } from './helpy-api'

type Point = { latitude: number; longitude: number }

function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function coordinate(raw: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = raw[key]
    if (value === null || value === undefined || value === '') continue
    const number = Number(value)
    if (Number.isFinite(number)) return number
  }
  return undefined
}

function point(raw: Record<string, unknown> | undefined): Point | undefined {
  if (!raw) return undefined
  const latitude = coordinate(raw, ['latitude', 'latitute', 'lat'])
  const longitude = coordinate(raw, ['longitude', 'longtitude', 'lng', 'lon'])
  if (latitude === undefined || longitude === undefined || Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || (latitude === 0 && longitude === 0)) return undefined
  return { latitude, longitude }
}

export function businessDistanceKm(address: HomeAddress | undefined, business: HomeBusiness): number | undefined {
  const origin = point(address?.raw) || point(object(address?.raw.location))
  if (!origin) return undefined
  const candidates = [business.raw, object(business.raw.profile), object(business.raw.vendor), object(business.raw.user), object(business.raw.location), ...business.services.flatMap(service => {
    const raw = service.raw
    return [raw, object(raw.vendor), object(raw.created_by), object(raw.location)]
  })]
  const radians = Math.PI / 180
  const distances = candidates.map(point).filter((destination): destination is Point => Boolean(destination)).map(destination => {
    const latitudeDelta = (destination.latitude - origin.latitude) * radians
    const longitudeDelta = (destination.longitude - origin.longitude) * radians
    const arc = Math.sin(latitudeDelta / 2) ** 2 + Math.cos(origin.latitude * radians) * Math.cos(destination.latitude * radians) * Math.sin(longitudeDelta / 2) ** 2
    return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(Math.max(0, 1 - arc)))
  })
  return distances.length ? Math.min(...distances) : undefined
}
