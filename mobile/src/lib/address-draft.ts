import type { HomeAddress } from './helpy-api'
import { addressCoordinates, QATAR_COUNTRY_ID } from './helpy-api'

/** Shared draft for the map-first add/edit address flow (one screen, several steps). */

export type AddressLabelKind = 'Home' | 'Office' | 'Other'

export type AddressDraft = {
  mode: 'add' | 'edit'
  editId?: string
  countryId?: number
  isDefault?: boolean
  latitude: number
  longitude: number
  formatted: string
  /** Primary / secondary lines for the floating address card on the details step. */
  headline: string
  subline: string
  labelKind: AddressLabelKind
  /** The saved label (`title` in the backend). Prefilled from the chosen type; editable. */
  name: string
  building: string
  street: string
  zone: string
  stateId: number | null
  cityId: number | null
  floor: string
  apartment: string
  landmark: string
  notes: string
  /** Fields last written by map autofill and not yet manually edited (false = user edited). */
  autofilled: Partial<Record<'formatted' | 'building' | 'street' | 'zone' | 'stateId' | 'cityId' | 'landmark' | 'labelKind', boolean>>
}

export const DOHA_CENTER = { latitude: 25.2854, longitude: 51.5310 }

const emptyDraft = (): AddressDraft => ({
  mode: 'add',
  countryId: QATAR_COUNTRY_ID,
  latitude: DOHA_CENTER.latitude,
  longitude: DOHA_CENTER.longitude,
  formatted: '',
  headline: '',
  subline: '',
  labelKind: 'Home',
  name: '',
  building: '',
  street: '',
  zone: '',
  stateId: null,
  cityId: null,
  floor: '',
  apartment: '',
  landmark: '',
  notes: '',
  autofilled: {},
})

let draft: AddressDraft = emptyDraft()
let pendingSelection: { addressId: string } | null = null

function pickRaw(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = raw[key]
    if (value !== null && value !== undefined && String(value).trim() !== '') return String(value).trim()
  }
  return ''
}

function pickRawNumber(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = Number(raw[key])
    if (Number.isFinite(value) && value > 0) return value
  }
  return null
}

function labelKindFromTitle(title: string): AddressLabelKind {
  if (/^home$/i.test(title)) return 'Home'
  if (/^(work|office)$/i.test(title)) return 'Office'
  return 'Other'
}

/** Default name offered when a type is chosen. `Other` starts empty so the user names it. */
export function defaultNameForKind(kind: AddressLabelKind) {
  return kind === 'Other' ? '' : kind
}

export function getAddressDraft() {
  return draft
}

export function setAddressDraft(next: AddressDraft) {
  draft = next
}

export function patchAddressDraft(partial: Partial<AddressDraft>) {
  draft = { ...draft, ...partial }
}

export function resetAddressDraft() {
  draft = emptyDraft()
}

export function beginAddAddressDraft(existingTitles: string[] = [], center?: { latitude: number; longitude: number }) {
  const hasHome = existingTitles.some(title => /^home$/i.test(title.trim()))
  draft = {
    ...emptyDraft(),
    mode: 'add',
    latitude: center?.latitude ?? DOHA_CENTER.latitude,
    longitude: center?.longitude ?? DOHA_CENTER.longitude,
    labelKind: hasHome ? 'Other' : 'Home',
  }
  return draft
}

export function beginEditAddressDraft(address: HomeAddress) {
  const coords = addressCoordinates(address) || DOHA_CENTER
  const formatted = address.address || pickRaw(address.raw, 'full_address_english', 'full_address', 'address_en', 'address')
  const [headline = '', ...rest] = formatted.split(',').map(part => part.trim()).filter(Boolean)
  draft = {
    mode: 'edit',
    editId: address.id,
    countryId: pickRawNumber(address.raw, 'country_id', 'countryId') || QATAR_COUNTRY_ID,
    isDefault: address.isDefault,
    latitude: coords.latitude,
    longitude: coords.longitude,
    formatted,
    headline,
    subline: rest.slice(0, 3).join(', '),
    labelKind: labelKindFromTitle(address.title),
    name: address.title,
    building: pickRaw(address.raw, 'flat_or_building_english', 'flat_or_building', 'building_number', 'building_no', 'building', 'building_name'),
    street: pickRaw(address.raw, 'locality_or_street_english', 'locality_or_street', 'street_name', 'street', 'street_number', 'street_no'),
    zone: pickRaw(address.raw, 'postal_code', 'zone_number', 'zone'),
    stateId: pickRawNumber(address.raw, 'state_id', 'stateId'),
    cityId: pickRawNumber(address.raw, 'city_id', 'cityId'),
    floor: pickRaw(address.raw, 'floor'),
    apartment: pickRaw(address.raw, 'apartment', 'flat', 'flat_no'),
    landmark: pickRaw(address.raw, 'landmark'),
    notes: pickRaw(address.raw, 'notes', 'note'),
    autofilled: {},
  }
  // Saved values count as "user-set": map autofill must not overwrite them. Empty fields can still autofill.
  const protectedKeys = ['building', 'street', 'zone', 'landmark'] as const
  protectedKeys.forEach(key => { if (draft[key]) draft.autofilled[key] = false })
  if (draft.stateId) draft.autofilled.stateId = false
  if (draft.cityId) draft.autofilled.cityId = false
  return draft
}

export function resolveDraftTitle(value: AddressDraft) {
  return value.name.trim()
}

export function notifyAddressSaved(addressId: string) {
  pendingSelection = { addressId }
}

export function consumePendingAddressSelection() {
  const value = pendingSelection
  pendingSelection = null
  return value
}
