const DEFAULT_API_BASE = 'https://admin.helpyapp.tech/api/v1'
const TOKEN_KEY = 'helpy_session_token'
const SESSION_KIND_KEY = 'helpy_session_kind'
const FIREBASE_CUSTOM_TOKEN_KEY = 'helpy_firebase_custom_token'

type RequestMethod = 'GET' | 'POST' | 'DELETE'
type QueryValue = string | number | boolean | null | undefined

export type HelpyEnvelope<T> = {
  status: boolean
  message: string
  data: T
  code: number
  token?: string
}

export type HelpyCategory = {
  category_id: number
  name: string
  name_ar: string
  description: string | null
  description_ar: string | null
  category_image: string | null
  category_image_url: string | null
}

export type HelpyBanner = {
  banner_id: number
  name: string
  service_id: number | null
  target_type: string | null
  target_id: number | null
  banner_images: unknown
}

export type HelpyRegion = {
  id: number
  name: string
  name_ar: string
}

export type HelpyCity = HelpyRegion & {
  state_id: number
  state_code: string | null
  country_id: number | null
  country_code: string | null
  latitude: string | null
  longitude: string | null
}

export type HelpyService = Record<string, unknown> & {
  service_vendor_mapp_id: number
  category_id: number
  service_id: number
  name: string
  name_ar: string
  price: number | string
  rating: number | string | null
  service_image: string | null
  service_image_small: string | null
}

export type HelpyProvider = Record<string, unknown> & {
  id: number
  name: string
  name_ar: string
  profile_photo: string | null
  user_profile_image_url: string | null
  vendor_profile_image_url: string | null
  rateing: number | string | null
  weekly_bookings_count: number | null
  service_setup: unknown
}

export type Paginated<T> = {
  total_records: number
  page: number
  limit: number
  data: T[]
}

export type HelpyAvailabilitySlot = {
  day: string
  slot: string
  date: string
  isAvailable: boolean | number
}

export type HelpyAddressInput = {
  id?: string
  isDefault?: boolean
  addressType?: 1 | 2 | 3
  title: string
  address: string
  countryId?: number
  stateId: number
  cityId: number
  buildingNumber?: string
  zone?: string
  street?: string
  floor?: string
  apartment?: string
  landmark?: string
  latitude?: number
  longitude?: number
  notes?: string
}

export type HelpyCatalogFilters = {
  categoryId?: number
  serviceId?: number
  minPrice?: number
  maxPrice?: number
  distance?: number
  sortBy?: 'recently_added' | 'price_low_high' | 'price_high_low'
  page?: number
  limit?: number
}

export type HelpyPreflight = {
  wallet_balance: string
  final_price: string
  wallet_cover_amount: string
  shortage_amount: string
  can_wallet_fully_cover: number
  can_proceed: number
  payment_type: string
  next_step: string
}

export type HelpyPromo = { promo_code_id: number; promo_code: string; discount_percentage: number | string }

export class HelpyApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly response?: unknown,
  ) {
    super(message)
    this.name = 'HelpyApiError'
  }
}

const runtimeEnv = import.meta.env as Record<string, string | boolean | undefined>

function readToken() {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(TOKEN_KEY)
}

export function getHelpyAccessToken() {
  return readToken()
}

export function getHelpyFirebaseCustomToken() {
  if (typeof window === 'undefined') return null
  return window.sessionStorage.getItem(FIREBASE_CUSTOM_TOKEN_KEY)
}

export function clearHelpyFirebaseCustomToken() {
  if (typeof window !== 'undefined') window.sessionStorage.removeItem(FIREBASE_CUSTOM_TOKEN_KEY)
}

export function hasHelpySession() {
  return Boolean(readToken())
}

export function hasHelpyUserSession() {
  return Boolean(readToken()) && window.sessionStorage.getItem(SESSION_KIND_KEY) === 'user'
}

function writeToken(token: string, kind: 'guest' | 'user') {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(TOKEN_KEY, token)
    window.sessionStorage.setItem(SESSION_KIND_KEY, kind)
  }
}

function writeFirebaseCustomToken(value: unknown) {
  if (typeof window !== 'undefined' && typeof value === 'string' && value.trim()) {
    window.sessionStorage.setItem(FIREBASE_CUSTOM_TOKEN_KEY, value)
  }
}

function toSearchParams(values: Record<string, QueryValue>) {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== null && value !== undefined) params.set(key, String(value))
  })
  return params
}

class HelpyApiClient {
  private readonly baseUrl = String(runtimeEnv.VITE_HELPY_API_BASE || DEFAULT_API_BASE).replace(/\/$/, '')
  private guestPromise: Promise<string> | null = null

  private async request<T>(
    path: string,
    options: {
      method?: RequestMethod
      query?: Record<string, QueryValue>
      form?: Record<string, QueryValue>
      multipart?: Record<string, QueryValue>
      authenticated?: boolean
      coordinates?: { latitude: number; longitude: number }
    } = {},
  ): Promise<HelpyEnvelope<T>> {
    const { method = 'GET', query, form, multipart, authenticated = true, coordinates } = options
    const queryString = query ? `?${toSearchParams(query).toString()}` : ''
    const headers = new Headers({
      Accept: 'application/json',
      language: 'en',
      lan: String(coordinates?.latitude ?? 25.2854),
      long: String(coordinates?.longitude ?? 51.5310),
    })

    if (authenticated) {
      const token = readToken() || await this.ensureGuestSession()
      headers.set('Authorization', `Bearer ${token}`)
    } else {
      // This matches the APK's guest bootstrap request.
      headers.set('Authorization', 'Bearer')
    }

    let body: BodyInit | undefined
    if (form) {
      body = toSearchParams(form)
      headers.set('Content-Type', 'application/x-www-form-urlencoded')
    }
    if (multipart) {
      const multipartBody = new FormData()
      Object.entries(multipart).forEach(([key, value]) => {
        if (value !== null && value !== undefined) multipartBody.set(key, String(value))
      })
      body = multipartBody
    }

    const response = await fetch(`${this.baseUrl}/${path.replace(/^\//, '')}${queryString}`, {
      method,
      headers,
      body,
    })

    const payload = await response.json().catch(() => null) as HelpyEnvelope<T> | null
    if (!response.ok || !payload?.status) {
      if ((response.status === 401 || payload?.code === 401) && hasHelpyUserSession()) {
        this.clearSession()
        window.dispatchEvent(new Event('helpy:session-expired'))
      }
      throw new HelpyApiError(payload?.message || `Helpy API request failed (${response.status})`, response.status, payload)
    }
    return payload
  }

  async ensureGuestSession() {
    const existing = readToken()
    if (existing) return existing
    if (this.guestPromise) return this.guestPromise

    this.guestPromise = this.request<Record<string, unknown>>('guest-user', { authenticated: false })
      .then(response => {
        if (!response.token) throw new HelpyApiError('Guest session response did not include a token', 200, response)
        writeToken(response.token, 'guest')
        return response.token
      })
      .finally(() => { this.guestPromise = null })

    return this.guestPromise
  }

  clearSession() {
    if (typeof window !== 'undefined') {
      window.sessionStorage.removeItem(TOKEN_KEY)
      window.sessionStorage.removeItem(SESSION_KIND_KEY)
      window.sessionStorage.removeItem(FIREBASE_CUSTOM_TOKEN_KEY)
      window.sessionStorage.removeItem('helpy_firebase_session')
    }
  }

  async getOtpType() {
    return (await this.request<unknown>('get-otp-type')).data
  }

  async sendLoginOtp(email: string) {
    return (await this.request<unknown>('otp-send', {
      method: 'POST',
      multipart: {
        phone_number: '',
        email,
        user_type: 'user',
        otp_type: 'email',
        type: 'login',
      },
    })).data
  }

  async sendRegistrationOtp(input: { email: string; phoneNumber: string }) {
    return (await this.request<unknown>('otp-send', {
      method: 'POST',
      multipart: { email: input.email, phone_number: input.phoneNumber, user_type: 'user', otp_type: 'email', type: 'register' },
    })).data
  }

  async registerWithOtp(input: { name: string; email: string; phoneNumber: string; code: string }) {
    const response = await this.request<Record<string, unknown>>('user-register', {
      method: 'POST',
      multipart: { name: input.name, email: input.email, phone_number: input.phoneNumber, otp_code: input.code, otp_type: 'email' },
      authenticated: false,
    })
    if (!response.token) throw new HelpyApiError('Registration response did not include a session token', 200, response)
    writeToken(response.token, 'user')
    clearHelpyFirebaseCustomToken()
    writeFirebaseCustomToken(response.data.firebaseToken)
    return response.data
  }

  async loginWithOtp(input: {
    email: string
    code: string
    deviceId: string
    deviceType: 'web' | 'android' | 'ios'
    deviceToken?: string
  }) {
    const response = await this.request<Record<string, unknown>>('login', {
      method: 'POST',
      form: {
        phone_number: '',
        email: input.email,
        user_type: 'user',
        otp_type: 'email',
        otp_code: input.code,
        device_id: input.deviceId,
        device_type: input.deviceType,
        device_token: input.deviceToken || '',
      },
    })
    if (!response.token) throw new HelpyApiError('Login response did not include a token', 200, response)
    writeToken(response.token, 'user')
    clearHelpyFirebaseCustomToken()
    window.sessionStorage.removeItem('helpy_firebase_session')
    writeFirebaseCustomToken(response.data.firebaseToken)
    return response.data
  }

  async setLanguage(language = 'en') {
    return (await this.request<unknown[]>('user-language', { method: 'POST', form: { language } })).data
  }

  async getBanners() {
    return (await this.request<HelpyBanner[]>('get-banner-list')).data
  }

  async getCategories(categoryImageSize = '64_64') {
    return (await this.request<HelpyCategory[]>('get-category-list', { query: { categoryImageSize } })).data
  }

  async getFeaturedServices(categoryId = 0) {
    return (await this.request<HelpyService[]>('get-featured-services-List', { query: { category_id: categoryId } })).data
  }

  async getTopProviders() {
    return (await this.request<HelpyProvider[]>('get-top-service-provider-list', {
      query: { userImageSize: '100_100', serviceSetupImageSize: '164_164' },
    })).data
  }

  async getServices(categoryId: number, page = 1, limit = 100, filters: HelpyCatalogFilters = {}, coordinates?: { latitude: number; longitude: number }) {
    const values = {
      page, category_id: categoryId, service_id: filters.serviceId ?? 0,
      sort_by: filters.sortBy ?? 'recently_added', limit,
      min_price: filters.minPrice, max_price: filters.maxPrice, distance: filters.distance,
    }
    return (await this.request<Paginated<HelpyService>>('featured-services-List', {
      method: 'POST', query: values, form: values, coordinates,
    })).data
  }

  async getServiceTypes(categoryId: number) {
    return (await this.request<Array<Record<string, unknown>>>('get-services-list', { query: { category_id: categoryId } })).data
  }

  async searchServices(search: string, coordinates?: { latitude: number; longitude: number }) {
    return (await this.request<HelpyService[]>('global-search', {
      method: 'POST', form: { search }, coordinates,
    })).data
  }

  async getVendorDetails(serviceVendorMapId: number) {
    const values = { service_vendor_mapp_id: serviceVendorMapId, serviceSetupImageSize: '100_100', userImageSize: '100_100' }
    return (await this.request<HelpyService>('vendor-details', { method: 'POST', query: values, form: values })).data
  }

  async getReviews(serviceVendorMapId: number, rating = 0) {
    return (await this.request<unknown[]>('get-reviews-list', {
      method: 'POST',
      form: { service_vendor_mapp_id: serviceVendorMapId, rating, revieImageSize: '100_100', userImageSize: '100_100' },
    })).data
  }

  async getReviewsPage(serviceVendorMapId: number, rating = 0, page = 1) {
    return (await this.request<Paginated<Record<string, unknown>>>('get-reviews-list', {
      method: 'POST',
      form: { service_vendor_mapp_id: serviceVendorMapId, rating, page, revieImageSize: '100_100', userImageSize: '100_100' },
    })).data
  }

  async getVendorServices(vendorId: number, categoryId: number) {
    const values = { vendor_id: vendorId, category_id: categoryId }
    return (await this.request<HelpyService[]>('vendor-service-offered', {
      method: 'POST', query: values, form: values,
    })).data
  }

  async getVendorAvailability(vendorId: number, date: string, serviceVendorMapId?: number) {
    return (await this.request<HelpyAvailabilitySlot[]>('vendor-availability', {
      method: 'POST', form: { vendor_id: vendorId, date, service_vendor_mapp_id: serviceVendorMapId },
    })).data
  }

  async checkSlotAvailability(input: { vendorId: number; serviceVendorMapId: number; date: string; startTime: string }) {
    return (await this.request<unknown>('slot-availability', {
      method: 'POST', form: { vendor_id: input.vendorId, service_vendor_mapp_id: input.serviceVendorMapId, date: input.date, start_time: input.startTime },
    })).data
  }

  async bookingPreflight(finalPrice: number, paymentType = '') {
    return (await this.request<HelpyPreflight>('booking-preflight', {
      method: 'POST', form: { final_price: finalPrice, payment_type: paymentType },
    })).data
  }

  async validatePromoCode(promocode: string, serviceVendorMapId: number) {
    return (await this.request<HelpyPromo>('validate-promocode', {
      method: 'POST', form: { promocode, service_vendor_mapp_id: serviceVendorMapId },
    })).data
  }

  async checkCashAvailable(vendorId: number) {
    return (await this.request<{ isCashEnabled: boolean }>('check-COD-available', { query: { vendor_id: vendorId } })).data
  }

  async getStates() {
    return (await this.request<HelpyRegion[]>('get-state')).data
  }

  async getCities(stateId: number) {
    return (await this.request<HelpyCity[]>('get-city', { method: 'POST', form: { state_id: stateId } })).data
  }

  async getPolicy() {
    return (await this.request<Record<string, string>>('policy')).data
  }

  async sendContactMessage(input: { name: string; email: string; phoneNumber?: string; message: string }) {
    return (await this.request<unknown>('contact-us', {
      method: 'POST',
      multipart: { name: input.name, email: input.email, phone_number: input.phoneNumber, message: input.message },
    })).data
  }

  async getUserProfile() {
    return (await this.request<Record<string, unknown>>('get-user-profile')).data
  }

  async getNotifications() {
    return (await this.request<unknown[]>('get-notification-history-list')).data
  }

  async markNotificationRead(notificationId: string | number) {
    return (await this.request<unknown>('notification-mark-as-read', { method: 'POST', form: { notification_history_id: notificationId } })).data
  }

  async markAllNotificationsRead() {
    return (await this.request<unknown>('notification-mark-all-as-read', { method: 'POST' })).data
  }

  async getUnseenOrderCount() {
    return (await this.request<{ count: number }>('unseen-order-count')).data
  }

  async getBookings(status?: 0 | 1 | 2 | 3 | 4 | 5) {
    return (await this.request<unknown[]>('booking-list', {
      query: { ...(status === undefined ? {} : { status }), serviceSetupImageSize: '375_240', userImageSize: '100_100' },
    })).data
  }

  async getBookingDetails(bookingId: string | number) {
    return (await this.request<Record<string, unknown>[]>('get-booking-details', {
      query: { booking_id: bookingId, serviceSetupImageSize: '375_240', userImageSize: '100_100' },
    })).data
  }

  async getWalletHistory() {
    return (await this.request<unknown[]>('wallet-history')).data
  }

  async getAddresses() {
    return (await this.request<unknown[]>('get-addresses')).data
  }

  async getFavorites() {
    return (await this.request<unknown[]>('my-favorites', {
      query: { serviceSetupImageSize: '50_50' },
    })).data
  }

  async toggleFavorite(input: { serviceVendorMapId: number; providerId: number; userId: number }) {
    return (await this.request<unknown>('favorites-add-remove', {
      method: 'POST',
      form: { service_vendor_mapp_id: input.serviceVendorMapId, provider_id: input.providerId, user_id: input.userId },
    })).data
  }

  async updateUserProfile(input: { name: string; email: string; phoneNumber: string; aboutMe?: string }) {
    return (await this.request<Record<string, unknown>>('update-user-profile', {
      method: 'POST',
      multipart: {
        name: input.name,
        name_ar: '',
        email: input.email,
        phone_number: input.phoneNumber,
        about_me: input.aboutMe || '',
      },
    })).data
  }

  async storeAddress(input: HelpyAddressInput) {
    const addressType = input.addressType ?? (/^home$/i.test(input.title.trim()) ? 1 : /^(work|office)$/i.test(input.title.trim()) ? 2 : 3)
    return (await this.request<Record<string, unknown>>('store-address', {
      method: 'POST',
      multipart: {
        user_address_id: input.id,
        address_type: addressType,
        address: input.address,
        address_ar: '',
        country_id: input.countryId ?? 179,
        state_id: input.stateId,
        city_id: input.cityId,
        flat_or_building: input.buildingNumber,
        flat_or_building_ar: '',
        postal_code: input.zone,
        locality_or_street: input.street,
        locality_or_street_ar: '',
        landmark: input.landmark || '',
        landmark_ar: '',
        latitude: input.latitude,
        latitute: input.latitude,
        longitude: input.longitude,
        is_default: input.isDefault ? 1 : 0,
      },
    })).data
  }

  async deleteAddress(id: string) {
    return (await this.request<unknown>(`delete-address/${encodeURIComponent(id)}`, { method: 'DELETE' })).data
  }
}

export const helpyApi = new HelpyApiClient()
