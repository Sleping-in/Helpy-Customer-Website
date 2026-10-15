import type { AddressDraft } from './address-draft'
import { matchNamedItem, nearestByCoordinates, type NormalizedGeocode } from './geocoding'
import { getCities, getStates, type HelpyCity, type HelpyState } from './helpy-api'

function looksLikeStreet(value: string) {
  const text = value.trim()
  if (!text) return false
  if (/^\d{1,4}[A-Za-z]?$/.test(text)) return true
  return /\b(street|st\.?|road|rd\.?|ave\.?|avenue|way|blvd|boulevard|lane|ln\.?|drive|dr\.?)\b/i.test(text)
}

function looksLikeAreaName(value: string) {
  const text = value.trim()
  return Boolean(text) && !looksLikeStreet(text)
}

/** Qatar street fields are a number or a named street — not a neighbourhood like Wadi Msheireb. */
function streetValueFromGeocode(geocode: NormalizedGeocode) {
  const numeric = geocode.street.match(/^\d{1,4}[A-Za-z]?$/)?.[0]
    || geocode.street.match(/(?:street|st|road)\s*[-#:]?\s*(\d{1,4})/i)?.[1]
    || ''
  if (numeric) return numeric
  if (looksLikeStreet(geocode.street)) return geocode.street
  return ''
}

let statesCache: HelpyState[] | null = null

export async function loadStatesCached() {
  if (!statesCache) statesCache = await getStates()
  return statesCache
}

export async function resolveStateAndCity(
  geocode: NormalizedGeocode,
  point: { latitude: number; longitude: number },
  states?: HelpyState[],
) {
  const list = states || await loadStatesCached()
  const state = matchNamedItem(list, geocode.region, geocode.subregion, geocode.city, geocode.district)
  let cities: HelpyCity[] = []
  if (state) cities = await getCities(state.id)
  const namedCity = matchNamedItem(cities, geocode.city, geocode.district, geocode.subregion, geocode.name)
  const city = namedCity || nearestByCoordinates(cities, point)
  return { state, city, cities }
}

/** Apply map geocode onto draft, preserving fields the user already edited. */
export function applyGeocodeToDraft(
  draft: AddressDraft,
  geocode: NormalizedGeocode,
  match: { stateId: number | null; cityId: number | null },
): AddressDraft {
  const next = { ...draft, autofilled: { ...draft.autofilled } }
  const canFill = (key: keyof AddressDraft['autofilled']) => draft.autofilled[key] !== false

  // Floating-card lines always describe the pin, so they are not subject to dirty-field tracking.
  const headline = geocode.district || geocode.street || geocode.name || geocode.city || 'Selected Location'
  const subline = [geocode.city, geocode.subregion, geocode.region, geocode.zoneHint ? `Zone ${geocode.zoneHint}` : '']
    .filter(part => part && part.toLowerCase() !== headline.toLowerCase())
    .filter((part, index, all) => all.findIndex(other => other.toLowerCase() === part.toLowerCase()) === index)
    .join(', ') || geocode.country
  next.headline = headline
  next.subline = subline

  if (canFill('formatted')) {
    next.formatted = geocode.formatted
    next.autofilled.formatted = true
  }

  // Fields the user has NOT edited always follow the pin. If the new spot has no value for a field,
  // the field is cleared (otherwise a value from a previous pin position would stick around).
  if (canFill('building')) {
    next.building = geocode.streetNumber || ''
    next.autofilled.building = Boolean(next.building)
  }

  if (canFill('street')) {
    next.street = streetValueFromGeocode(geocode)
    next.autofilled.street = Boolean(next.street)
  }

  if (canFill('zone')) {
    next.zone = geocode.zoneHint || ''
    next.autofilled.zone = Boolean(next.zone)
  }

  if (canFill('landmark')) {
    const rejectedStreet = !streetValueFromGeocode(geocode) && looksLikeAreaName(geocode.street) ? geocode.street : ''
    const landmark = [geocode.district, geocode.name, rejectedStreet].find(value => value && value !== geocode.streetNumber && !looksLikeStreet(value)) || ''
    next.landmark = landmark && !/^zone\s*\d+/i.test(landmark) ? landmark : ''
    next.autofilled.landmark = Boolean(next.landmark)
  }

  if (canFill('stateId') && match.stateId) {
    next.stateId = match.stateId
    next.autofilled.stateId = true
  }
  if (canFill('cityId') && match.cityId) {
    next.cityId = match.cityId
    next.autofilled.cityId = true
  }

  return next
}

export function markFieldEdited<K extends keyof AddressDraft['autofilled']>(draft: AddressDraft, field: K): AddressDraft {
  return {
    ...draft,
    autofilled: { ...draft.autofilled, [field]: false },
  }
}
