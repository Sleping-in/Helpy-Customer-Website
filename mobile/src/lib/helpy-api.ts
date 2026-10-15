import { readAccessToken } from './session'

const DEFAULT_API_BASE = 'https://admin.helpyapp.tech/api/v1'
const API_BASE = (process.env.EXPO_PUBLIC_HELPY_API_BASE || DEFAULT_API_BASE).replace(/\/$/, '')
/** Required by store-address; the backend scopes this customer app to Qatar. */
export const QATAR_COUNTRY_ID = 179

type Envelope<T> = { status?: boolean; message?: string; data?: T }
type ServicePage = { data?: Record<string, unknown>[] }

export type HomeBanner = {
  id: string
  name: string
  image: string
  serviceId: number
  targetId: number
  targetType: string
}

export type HomeCategory = { id: number; name: string; image: string; count: number }

export type HomeService = {
  id: string
  serviceVendorMapId: number
  serviceId: number
  vendorId: number
  categoryId: number
  name: string
  provider: string
  category: string
  price: number
  rating: number
  reviews: number
  image: string
  description: string
  raw: Record<string, unknown>
}

export type HomeBusiness = {
  id: number
  name: string
  image: string
  coverImage: string
  rating: number
  category: string
  services: HomeService[]
  raw: Record<string, unknown>
}

export type HomeAddress = {
  id: string
  title: string
  address: string
  isDefault: boolean
  raw: Record<string, unknown>
}

export type HelpyState = { id: number; name: string; nameAr: string }

export type HelpyCity = {
  id: number
  name: string
  stateId: number
  latitude?: number
  longitude?: number
}

export type HelpyAddressInput = {
  addressType: 1 | 2 | 3
  title: string
  address: string
  stateId: number
  cityId: number
  countryId?: number
  buildingNumber?: string
  zone?: string
  street?: string
  floor?: string
  apartment?: string
  landmark?: string
  latitude?: number
  longitude?: number
  notes?: string
  isDefault?: boolean
}

export type HelpyProfile = {
  id: number
  name: string
  email: string
  phone: string
  about: string
  image: string
  walletBalance: number
  raw: Record<string, unknown>
}

export type HelpyBooking = {
  id: string
  service: string
  provider: string
  date: string
  time: string
  status: string
  price: number
  image: string
  address: string
  raw: Record<string, unknown>
}

export type HelpyNotification = {
  id: string
  title: string
  message: string
  createdAt: string
  unread: boolean
  bookingId?: string
  raw: Record<string, unknown>
}

const DOHA = { latitude: 25.2854, longitude: 51.5310 }
let requestLocation = DOHA
const cityCache = new Map<number, HelpyCity[]>()

// Sent as the `lan`/`long` headers. The backend uses them to compute each service's `distance`.
export function setRequestLocation(point?: { latitude: number; longitude: number }) {
  requestLocation = point || DOHA
}

export function addressCoordinates(address?: HomeAddress) {
  if (!address) return undefined
  const read = (raw: Record<string, unknown>) => {
    const pick = (keys: string[]) => keys.map(key => raw[key]).find(item => item !== null && item !== undefined && item !== '')
    const latitude = Number(pick(['latitude', 'latitute', 'lat']))
    const longitude = Number(pick(['longitude', 'longtitude', 'lng', 'lon']))
    const valid = Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 && !(latitude === 0 && longitude === 0)
    return valid ? { latitude, longitude } : undefined
  }
  const nested = address.raw.location && typeof address.raw.location === 'object' ? address.raw.location as Record<string, unknown> : undefined
  return read(address.raw) || (nested ? read(nested) : undefined)
}

const value = (record: Record<string, unknown>, ...keys: string[]) => keys.map(key => record[key]).find(item => item !== null && item !== undefined && item !== '')
const stringValue = (item: unknown, fallback = '') => item === null || item === undefined ? fallback : String(item)
const numberValue = (item: unknown, fallback = 0) => Number.isFinite(Number(item)) ? Number(item) : fallback
const clean = (item: unknown) => stringValue(item).replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

function imageFrom(item: unknown) {
  if (typeof item === 'string') return /^https?:\/\//i.test(item) ? item : ''
  if (item && typeof item === 'object') return imageFrom(value(item as Record<string, unknown>, 'url', 'image_url', 'image', 'path'))
  return ''
}

function imageFromList(item: unknown) {
  if (Array.isArray(item)) return imageFrom(item.find(entry => Boolean(imageFrom(entry))))
  return imageFrom(item)
}

function providerImage(item: Record<string, unknown>) {
  const candidates = ['vendor_profile_image_url', 'user_profile_image_url', 'image_url', 'image', 'profile_photo']
    .map(key => imageFrom(item[key]))
  const realImage = candidates.find(candidate => candidate && !/\/(?:default-image|deafult_user|default_user)\./i.test(candidate))
  if (realImage) return realImage
  const filename = stringValue(item.profile_photo)
  if (/^[a-z0-9_-]+\.(?:png|jpe?g|webp)$/i.test(filename)) return `https://helpy-users-image.s3.me-central-1.amazonaws.com/user/main/${filename}`
  return ''
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE'
  query?: Record<string, string | number>
  form?: Record<string, string | number>
  multipart?: Record<string, string | number | undefined | null>
}

function formatApiError(payload: Envelope<unknown> | null, status: number) {
  const message = payload?.message || `Unable to load Helpy data (${status}).`
  const errors = payload && typeof payload === 'object' && 'errors' in payload
    ? (payload as { errors?: unknown }).errors
    : undefined
  if (errors && typeof errors === 'object' && errors !== null) {
    const details = Object.values(errors as Record<string, unknown>)
      .flatMap(value => Array.isArray(value) ? value : [value])
      .map(item => String(item || '').trim())
      .filter(Boolean)
    if (details.length) return `${message} ${details.join(' ')}`.trim()
  }
  return message
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const token = await readAccessToken()
  if (!token) throw new Error('Your session has expired. Please sign in again.')
  const query = options.query ? `?${new URLSearchParams(Object.entries(options.query).map(([key, item]) => [key, String(item)])).toString()}` : ''
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    language: 'en',
    lan: String(requestLocation.latitude),
    long: String(requestLocation.longitude),
  }
  let body: string | FormData | undefined
  if (options.multipart) {
    const multipartBody = new FormData()
    Object.entries(options.multipart).forEach(([key, item]) => {
      if (item !== null && item !== undefined) multipartBody.append(key, String(item))
    })
    body = multipartBody
  } else if (options.form) {
    body = new URLSearchParams(Object.entries(options.form).map(([key, item]) => [key, String(item)])).toString()
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }
  const response = await fetch(`${API_BASE}/${path}${query}`, { method: options.method || (body ? 'POST' : 'GET'), headers, body })
  const payload = await response.json().catch(() => null) as Envelope<T> | null
  if (!response.ok || !payload?.status) throw new Error(formatApiError(payload, response.status))
  return payload.data as T
}

async function catalogRequest<T>(path: string, options: { method?: 'GET' | 'POST'; query?: Record<string, string | number>; form?: Record<string, string | number> } = {}) {
  return request<T>(path, options)
}

export function mapBanner(item: Record<string, unknown>): HomeBanner {
  return {
    id: stringValue(value(item, 'banner_id', 'id')),
    name: stringValue(value(item, 'name', 'title'), 'Featured service'),
    image: imageFromList(value(item, 'banner_images', 'image_url', 'image')),
    serviceId: numberValue(value(item, 'service_id')),
    targetId: numberValue(value(item, 'target_id')),
    targetType: stringValue(value(item, 'target_type')),
  }
}

export function mapCategory(item: Record<string, unknown>): HomeCategory {
  return { id: numberValue(value(item, 'category_id', 'id')), name: stringValue(value(item, 'name_english', 'name'), 'Category'), image: imageFromList(value(item, 'category_image_url', 'category_image')), count: numberValue(value(item, 'service_count', 'services_count', 'total_services')) }
}

export function mapService(item: Record<string, unknown>, categories: HomeCategory[] = []): HomeService {
  const rawCategory = item.category && typeof item.category === 'object' ? item.category as Record<string, unknown> : {}
  const vendor = item.vendor && typeof item.vendor === 'object' ? item.vendor as Record<string, unknown> : {}
  const creator = item.created_by && typeof item.created_by === 'object' ? item.created_by as Record<string, unknown> : {}
  const nestedService = item.service && typeof item.service === 'object' ? item.service as Record<string, unknown> : {}
  const categoryId = numberValue(value(item, 'category_id', 'service_category_id'))
  const image = imageFrom(value(item, 'service_image_url', 'service_setup_image_url', 'image_url', 'image')) || imageFromList(item.all_service_images) || imageFrom(value(nestedService, 'service_image_url', 'image_url', 'image')) || imageFromList(item.all_service_images_small)
  const vendorId = numberValue(value(item, 'vendor_id', 'user_id', 'service_vendor_id') || value(creator, 'id') || value(vendor, 'id'))
  return {
    id: stringValue(value(item, 'service_vendor_mapp_id', 'id', 'service_id', 'name')),
    serviceVendorMapId: numberValue(value(item, 'service_vendor_mapp_id', 'id')),
    serviceId: numberValue(value(item, 'service_id')),
    vendorId,
    categoryId,
    name: stringValue(value(item, 'name_english', 'name', 'service_name'), 'Unnamed service'),
    provider: stringValue(value(item, 'created_by_name', 'vendor_name', 'provider_name') || value(creator, 'name_english', 'name') || value(vendor, 'name_english', 'name'), 'Service provider'),
    category: stringValue(value(rawCategory, 'name_english', 'name') || categories.find(category => category.id === categoryId)?.name, 'Services'),
    price: numberValue(value(item, 'price', 'service_price', 'amount')),
    rating: numberValue(value(item, 'rating', 'rateing', 'average_rating')),
    reviews: numberValue(value(item, 'review_count', 'reviews_count', 'total_reviews')),
    image,
    description: clean(value(item, 'description_english', 'description', 'service_description')),
    raw: item,
  }
}

export function groupBusinesses(services: HomeService[]) {
  const grouped = new Map<number, HomeBusiness>()
  services.forEach(service => {
    if (!service.vendorId) return
    const current = grouped.get(service.vendorId)
    if (current) {
      current.services.push(service)
      if (!current.coverImage && service.image) current.coverImage = service.image
      if (current.category === 'Services' && service.category) current.category = service.category
      return
    }
    const creator = service.raw.created_by && typeof service.raw.created_by === 'object' ? service.raw.created_by as Record<string, unknown> : {}
    const serviceVendor = service.raw.vendor && typeof service.raw.vendor === 'object' ? service.raw.vendor as Record<string, unknown> : {}
    grouped.set(service.vendorId, { id: service.vendorId, name: service.provider, image: providerImage(creator) || providerImage(serviceVendor), coverImage: service.image, rating: numberValue(value(creator, 'rateing', 'rating', 'average_rating'), service.rating), category: service.category, services: [service], raw: creator })
  })
  return [...grouped.values()].filter(business => Boolean(business.name) && Boolean(business.id)).sort((a, b) => b.services.length - a.services.length || b.rating - a.rating || a.name.localeCompare(b.name) || a.id - b.id)
}

export function mapAddress(item: Record<string, unknown>): HomeAddress {
  const rawType = numberValue(item.address_type)
  const backendType = rawType === 1 ? 'Home' : rawType === 2 ? 'Work' : rawType === 3 ? 'Other' : ''
  const title = ['address_type_text', 'address_type_english', 'label', 'title', 'name']
    .map(key => stringValue(item[key]).trim())
    .find(candidate => candidate && !/^\d+$/.test(candidate)) || backendType || 'Saved address'
  return {
    id: stringValue(value(item, 'user_address_id', 'id', 'address_id'), 'address'),
    title,
    address: stringValue(value(item, 'full_address_english', 'full_address', 'address_english', 'address_en', 'address', 'street_address')),
    isDefault: ['1', 'true', 'yes'].includes(stringValue(value(item, 'is_default', 'default', 'isDefault')).trim().toLowerCase()),
    raw: item,
  }
}

type HomeData = { banners: HomeBanner[]; categories: HomeCategory[]; services: HomeService[]; businesses: HomeBusiness[]; addresses: HomeAddress[]; hasUnreadNotifications: boolean }
let homeDataCache: { value: HomeData; at: number } | undefined
let homeDataPromise: Promise<HomeData> | undefined

async function fetchHomeData(): Promise<HomeData> {
  const categories = (await catalogRequest<Record<string, unknown>[]>('get-category-list', { query: { categoryImageSize: '64_64' } })).map(mapCategory)
  const [bannerRows, addressRows, notifications, ...servicePages] = await Promise.all([
    catalogRequest<Record<string, unknown>[]>('get-banner-list'),
    request<Record<string, unknown>[]>('get-addresses').catch(() => []),
    request<unknown[]>('get-notification-history-list').catch(() => []),
    ...categories.map(category => {
      const params = { page: 1, category_id: category.id, service_id: 0, sort_by: 'recently_added', limit: 100 }
      return catalogRequest<ServicePage>('featured-services-List', { method: 'POST', query: params, form: params })
    }),
  ])
  const deduped = new Map<string, HomeService>()
  servicePages.flatMap(page => page.data || []).map(item => mapService(item, categories)).forEach(service => {
    if (service.id) deduped.set(service.id, service)
  })
  const services = [...deduped.values()]
  const businesses = groupBusinesses(services)
  return { banners: bannerRows.map(mapBanner).filter(item => Boolean(item.image)), categories, services, businesses, addresses: addressRows.map(mapAddress), hasUnreadNotifications: notifications.some(item => { const raw = item && typeof item === 'object' ? item as Record<string, unknown> : {}; return !Boolean(value(raw, 'is_read', 'read', 'read_at')) }) }
}

export async function loadHomeData(options: { force?: boolean } = {}) {
  if (!options.force && homeDataCache && Date.now() - homeDataCache.at < 60000) return homeDataCache.value
  if (!options.force && homeDataPromise) return homeDataPromise
  homeDataPromise = fetchHomeData().then(value => { homeDataCache = { value, at: Date.now() }; return value }).finally(() => { homeDataPromise = undefined })
  return homeDataPromise
}

export async function searchServices(search: string) {
  const rows = await request<Record<string, unknown>[]>('global-search', {
    method: 'POST',
    form: { search, serviceSetupImageSize: '375_240', serviceImageSize: '100_100' },
  })
  return rows.map(item => mapService(item))
}

export async function searchBusinesses(search: string) {
  return groupBusinesses(await searchServices(search))
}

export async function loadCategoryServices(categoryId: number) {
  const categories = (await request<Record<string, unknown>[]>('get-category-list', { query: { categoryImageSize: '64_64' } })).map(mapCategory)
  const params = { page: 1, category_id: categoryId, service_id: 0, sort_by: 'recently_added', limit: 100 }
  const page = await request<ServicePage>('featured-services-List', { method: 'POST', query: params, form: params })
  return (page.data || []).map(item => mapService(item, categories))
}

export async function getServiceDetails(id: number) {
  const row = await request<Record<string, unknown>>('vendor-details', { method: 'POST', query: { service_vendor_mapp_id: id, serviceSetupImageSize: '375_240', userImageSize: '100_100' }, form: { service_vendor_mapp_id: id, serviceSetupImageSize: '375_240', userImageSize: '100_100' } })
  return mapService(row)
}

/** vendor-details identifies a service mapping; vendor-service-offered is scoped to a vendor and category. */
export async function getBusinessDetails(vendorId: number): Promise<HomeBusiness> {
  if (!Number.isInteger(vendorId) || vendorId <= 0) throw new Error('This business is unavailable.')
  const home = await loadHomeData()
  const business = home.businesses.find(item => item.id === vendorId)
  if (!business?.services[0]) throw new Error('This business is no longer available.')
  const detail = await getServiceDetails(business.services[0].serviceVendorMapId)
  if (detail.vendorId !== vendorId) throw new Error('Unable to load this business.')
  const profile = detail.raw.created_by && typeof detail.raw.created_by === 'object' ? detail.raw.created_by as Record<string, unknown> : business.raw
  const rows = await Promise.all(home.categories.map(category => request<Record<string, unknown>[]>('vendor-service-offered', {
    method: 'POST',
    form: { vendor_id: vendorId, category_id: category.id, serviceSetupImageSize: '375_240', userImageSize: '100_100' },
  })))
  const services = rows.flat().map(row => mapService({ ...row, vendor_id: vendorId, created_by: profile }, home.categories))
  return { ...business, name: stringValue(value(profile, 'name_english', 'name'), business.name), image: providerImage(profile) || business.image, raw: profile, services }
}

export async function loadAddresses() {
  const rows = await request<Record<string, unknown>[]>('get-addresses')
  return rows.map(mapAddress)
}

export async function getStates(): Promise<HelpyState[]> {
  const rows = await request<Record<string, unknown>[]>('get-state')
  return rows.map(item => ({
    id: numberValue(value(item, 'id', 'state_id')),
    name: stringValue(value(item, 'name', 'name_english'), 'Municipality'),
    nameAr: stringValue(value(item, 'name_ar', 'name_arabic')),
  })).filter(item => item.id > 0)
}

export async function getCities(stateId: number, options: { force?: boolean } = {}): Promise<HelpyCity[]> {
  if (!options.force && cityCache.has(stateId)) return cityCache.get(stateId) || []
  const rows = await request<Record<string, unknown>[]>('get-city', { method: 'POST', form: { state_id: stateId } })
  const cities = rows.map(item => {
    const latitude = Number(value(item, 'latitude', 'latitute', 'lat'))
    const longitude = Number(value(item, 'longitude', 'longtitude', 'lng', 'lon'))
    return {
      id: numberValue(value(item, 'id', 'city_id')),
      name: stringValue(value(item, 'name', 'name_english'), 'Area'),
      stateId: numberValue(value(item, 'state_id'), stateId),
      latitude: Number.isFinite(latitude) ? latitude : undefined,
      longitude: Number.isFinite(longitude) ? longitude : undefined,
    }
  }).filter(item => item.id > 0)
  cityCache.set(stateId, cities)
  return cities
}

export async function storeAddress(input: HelpyAddressInput) {
  return persistAddress(input)
}

function persistAddress(input: HelpyAddressInput, userAddressId?: string) {
  return request<Record<string, unknown>>('store-address', {
    method: 'POST',
    multipart: {
      user_address_id: userAddressId,
      address: input.address,
      address_ar: '',
      flat_or_building: input.buildingNumber,
      flat_or_building_ar: '',
      locality_or_street: input.street,
      locality_or_street_ar: '',
      landmark: input.landmark || '',
      landmark_ar: '',
      postal_code: input.zone,
      city_id: input.cityId,
      state_id: input.stateId,
      country_id: input.countryId ?? QATAR_COUNTRY_ID,
      address_type: input.addressType,
      is_default: input.isDefault ? 1 : 0,
      // The model exposes these canonical columns. The checked backend source
      // currently omits them from store(); keeping them here avoids another
      // client change when the server starts persisting map coordinates.
      latitude: input.latitude ?? DOHA.latitude,
      latitute: input.latitude ?? DOHA.latitude,
      longitude: input.longitude ?? DOHA.longitude,
    },
  })
}

/** The backend exposes no separate update route; store-address is its add/update upsert. */
export async function updateAddress(input: HelpyAddressInput & { id: string }) {
  return persistAddress(input, input.id)
}

export async function deleteAddress(id: string) {
  return request<unknown>(`delete-address/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export async function getProfile(): Promise<HelpyProfile> {
  const raw = await request<Record<string, unknown>>('get-user-profile', { query: { userImageSize: '100_100' } })
  const wallet = raw.wallet && typeof raw.wallet === 'object' ? raw.wallet as Record<string, unknown> : {}
  return {
    id: numberValue(value(raw, 'id', 'user_id')),
    name: stringValue(value(raw, 'name_english', 'name')),
    email: stringValue(raw.email),
    phone: stringValue(raw.phone_number),
    about: stringValue(value(raw, 'about_me_english', 'about_me')),
    image: imageFrom(value(raw, 'user_profile_image_url', 'profile_photo')),
    walletBalance: numberValue(value(wallet, 'balance', 'wallet_balance', 'amount')),
    raw,
  }
}

export async function updateProfile(input: { name: string; email: string; phone: string; about: string }) {
  return request<Record<string, unknown>>('update-user-profile', {
    method: 'POST',
    multipart: { name: input.name, name_ar: '', email: input.email, phone_number: input.phone, about_me: input.about },
  })
}

function mapBooking(raw: Record<string, unknown>): HelpyBooking {
  const items = Array.isArray(raw.booking_items) ? raw.booking_items : []
  const item = items[0] && typeof items[0] === 'object' ? items[0] as Record<string, unknown> : {}
  const setup = item.service_setup && typeof item.service_setup === 'object' ? item.service_setup as Record<string, unknown> : {}
  const creator = setup.created_by && typeof setup.created_by === 'object' ? setup.created_by as Record<string, unknown> : {}
  const images = Array.isArray(setup.all_service_images) ? setup.all_service_images : []
  return {
    id: stringValue(value(raw, 'booking_id', 'id')),
    service: stringValue(value(item, 'service_name', 'name') || value(setup, 'name_english', 'name'), 'Booked service'),
    provider: stringValue(value(item, 'provider_name', 'vendor_name') || value(creator, 'name_english', 'name'), 'Service provider'),
    date: stringValue(value(raw, 'booking_date', 'selected_date', 'service_date') || value(raw, 'booking_date_time')),
    time: stringValue(value(raw, 'booking_time', 'selected_time', 'slot') || value(raw, 'booking_date_time')),
    status: stringValue(value(raw, 'booking_status_lable', 'booking_status_text', 'status_text')) || ({ 0: 'Pending', 1: 'Upcoming', 2: 'Completed', 3: 'Cancelled' }[numberValue(raw.booking_status)] || 'Booking'),
    price: numberValue(value(raw, 'total_amount', 'total_price', 'payable_amount') || value(item, 'final_price', 'total_price')),
    image: imageFrom(value(setup, 'service_image_url', 'image_url')) || imageFromList(images),
    address: stringValue(value(raw, 'user_address', 'service_address', 'address')),
    raw,
  }
}

export async function getBookings() {
  const rows = await request<Record<string, unknown>[]>('booking-list', { query: { serviceSetupImageSize: '375_240', userImageSize: '100_100' } })
  return rows.map(mapBooking)
}

export async function getBookingDetails(id: string) {
  const rows = await request<Record<string, unknown>[]>('get-booking-details', { query: { booking_id: id, serviceSetupImageSize: '375_240', userImageSize: '100_100' } })
  return rows[0] ? mapBooking(rows[0]) : undefined
}

export async function getNotifications(): Promise<HelpyNotification[]> {
  const rows = await request<Record<string, unknown>[]>('get-notification-history-list')
  return rows.map(raw => ({
    id: stringValue(value(raw, 'notification_history_id', 'id')),
    title: stringValue(value(raw, 'title', 'notification_title'), 'Helpy update'),
    message: stringValue(value(raw, 'message', 'body', 'description')),
    createdAt: stringValue(value(raw, 'created_at', 'created_at_formatted')),
    unread: !['1', 'true', 'read'].includes(stringValue(value(raw, 'is_read', 'status')).toLowerCase()),
    bookingId: stringValue(value(raw, 'booking_id')) || undefined,
    raw,
  }))
}

export async function markNotificationRead(id: string) {
  return request<unknown>('notification-mark-as-read', { method: 'POST', form: { notification_history_id: id } })
}

export async function markAllNotificationsRead() {
  return request<unknown>('notification-mark-all-as-read', { method: 'POST' })
}

export async function logout() {
  return request<unknown>('logout', { method: 'POST' })
}

export async function getVendorAvailability(vendorId: number, serviceVendorMapId: number, date: string) {
  return request<{ day: string; slot: string; date: string; isAvailable: number | boolean }[]>('vendor-availability', {
    method: 'POST',
    form: { vendor_id: vendorId, service_vendor_mapp_id: serviceVendorMapId, date },
  })
}

export async function bookingPreflight(finalPrice: number, paymentType = '') {
  return request<Record<string, unknown>>('booking-preflight', {
    method: 'POST',
    form: { final_price: finalPrice, payment_type: paymentType },
  })
}
