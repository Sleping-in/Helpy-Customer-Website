import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { helpyApi, hasHelpyUserSession, type HelpyAddressInput, type HelpyAvailabilitySlot, type HelpyBanner, type HelpyCategory, type HelpyProvider, type HelpyService } from '../api/helpy'
import { useNav } from './NavContext'

const pick = (value: Record<string, unknown>, ...keys: string[]) => keys.map(key => value[key]).find(item => item !== null && item !== undefined && item !== '')
const text = (value: unknown, fallback = '') => value === null || value === undefined ? fallback : String(value)
const number = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback
const cleanText = (value: unknown) => text(value).replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()

export type LiveCategory = { id: number; name: string; image: string; count: number }
export type LiveBanner = { id: number; name: string; image: string; serviceId: number; targetType: string; targetId: number; raw: Record<string, unknown> }
export type LiveService = {
  id: string; serviceVendorMapId: number; serviceId: number; categoryId: number; vendorId: number
  name: string; provider: string; category: string; price: number; rating: number; reviews: number
  image: string; description: string; duration: string; raw: Record<string, unknown>
}
export type LiveProvider = { id: number; name: string; image: string; rating: number; service?: LiveService; raw: Record<string, unknown> }
export type LiveBusiness = { id: number; name: string; image: string; rating: number; about: string; services: LiveService[]; raw: Record<string, unknown> }
export type LiveProfile = { name: string; email: string; phone: string; about: string; image: string; memberSince: string; wallet: number; raw: Record<string, unknown> }
export type LiveAddress = { id: string; title: string; address: string; stateId: number; cityId: number; raw: Record<string, unknown> }
export type LiveBooking = {
  id: string; reference: string; service: string; provider: string; category: string
  date: string; time: string; price: number; subtotal: number; discount: number
  status: string; paymentStatus: string; paymentMethod: string
  image: string; address: string; requirements: string; createdAt: string
  items: Array<{ name: string; price: number }>; raw: Record<string, unknown>
}

const categoryImageOverrides: Record<number, string> = {
  1: '/assets/ai-homecat-home_services.png',
  2: '/assets/cat-uniform-health-wellness.png',
  3: '/assets/ai-homecat-education.png',
  4: '/assets/cat-uniform-digital.png',
  8: '/assets/cat-uniform-marketplace.png',
  13: '/assets/cat-car-services-user-exact.png',
  14: '/assets/cat-pets-dog-cat-food.png',
}

function mapCategory(item: HelpyCategory): LiveCategory {
  const raw = item as Record<string, unknown>
  const id = number(item.category_id)
  return { id, name: text(pick(raw, 'name_english', 'name'), 'Category'), image: categoryImageOverrides[id] || text(pick(raw, 'category_image_url', 'category_image')), count: number(pick(raw, 'service_count', 'services_count', 'total_services')) }
}

function mapBanner(item: HelpyBanner): LiveBanner {
  const raw = item as Record<string, unknown>
  const images = raw.banner_images
  const image = Array.isArray(images)
    ? text(images.find(value => typeof value === 'string' || (value && typeof value === 'object')))
    : images && typeof images === 'object'
      ? text(pick(images as Record<string, unknown>, 'url', 'image_url', 'image', 'path'))
      : text(images)
  return {
    id: number(item.banner_id),
    name: text(item.name, 'Featured service'),
    image,
    serviceId: number(item.service_id),
    targetType: text(item.target_type),
    targetId: number(item.target_id),
    raw,
  }
}

export function mapService(item: HelpyService, categories: LiveCategory[] = []): LiveService {
  const raw = item as Record<string, unknown>
  const category = raw.category && typeof raw.category === 'object' ? raw.category as Record<string, unknown> : {}
  const vendor = raw.vendor && typeof raw.vendor === 'object' ? raw.vendor as Record<string, unknown> : {}
  const creator = raw.created_by && typeof raw.created_by === 'object' ? raw.created_by as Record<string, unknown> : {}
  const nestedService = raw.service && typeof raw.service === 'object' ? raw.service as Record<string, unknown> : {}
  const images = Array.isArray(raw.all_service_images) ? raw.all_service_images : []
  const id = number(pick(raw, 'service_vendor_mapp_id', 'id'))
  const categoryId = number(pick(raw, 'category_id', 'service_category_id'))
  const imageValue = pick(raw, 'service_image_url', 'service_setup_image_url', 'image_url', 'image') || images[0] || pick(nestedService, 'service_image_url')
  const durationData = raw['duration-data'] && typeof raw['duration-data'] === 'object' ? raw['duration-data'] as Record<string, unknown> : {}
  const durationAmount = number(raw.duration ?? durationData.duration)
  const durationUnit = text(raw.duration_unit_text ?? durationData.duration_unit_text)
  const durationFallback = text(pick(raw, 'duration_text', 'service_duration'))
  return {
    id: String(id || pick(raw, 'service_id', 'name') || crypto.randomUUID()),
    serviceVendorMapId: id,
    serviceId: number(pick(raw, 'service_id')),
    categoryId,
    vendorId: number(pick(raw, 'vendor_id', 'user_id', 'service_vendor_id') || pick(creator, 'id')),
    name: text(pick(raw, 'name_english', 'name', 'service_name'), 'Unnamed service'),
    provider: text(pick(raw, 'created_by_name', 'vendor_name', 'provider_name') || pick(creator, 'name_english', 'name') || pick(vendor, 'name_english', 'name'), 'Service provider'),
    category: text(pick(category, 'name_english', 'name') || categories.find(value => value.id === categoryId)?.name, 'Services'),
    price: number(pick(raw, 'price', 'service_price', 'amount')),
    rating: number(pick(raw, 'rating', 'rateing', 'average_rating')),
    reviews: number(pick(raw, 'review_count', 'reviews_count', 'total_reviews')),
    image: text(imageValue),
    description: cleanText(pick(raw, 'description_english', 'description', 'service_description')),
    duration: durationAmount > 0 && durationUnit && durationUnit !== 'Unknown' ? `${durationAmount} ${durationUnit}` : durationFallback && durationFallback !== 'Unknown' ? durationFallback : '',
    raw,
  }
}

function mapProvider(item: HelpyProvider, categories: LiveCategory[]): LiveProvider {
  const raw = item as Record<string, unknown>
  const setup = Array.isArray(item.service_setup) ? item.service_setup[0] : item.service_setup
  const mapped = setup && typeof setup === 'object' ? mapService(setup as HelpyService, categories) : undefined
  const service = mapped ? { ...mapped, vendorId: number(pick(raw, 'id', 'vendor_id')), provider: text(pick(raw, 'name_english', 'name')), image: mapped.image || text((setup as Record<string, unknown>).service_image_url) } : undefined
  return { id: number(pick(raw, 'id', 'vendor_id')), name: text(pick(raw, 'name_english', 'name'), 'Service provider'), image: text(pick(raw, 'vendor_profile_image_url', 'user_profile_image_url', 'profile_photo')), rating: number(pick(raw, 'rateing', 'rating')), service, raw }
}

function mapAddress(value: unknown): LiveAddress {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const addressType = number(raw.address_type)
  const backendLabel = addressType === 1 ? 'Home' : addressType === 2 ? 'Work' : addressType === 3 ? 'Other' : ''
  const title = ['address_type_text', 'address_type_english', 'label', 'title', 'name']
    .map(key => text(raw[key]).trim())
    .find(candidate => candidate && !/^\d+$/.test(candidate)) || backendLabel || 'Saved address'
  return { id: text(pick(raw, 'user_address_id', 'id', 'address_id'), crypto.randomUUID()), title, address: text(pick(raw, 'full_address_english', 'full_address', 'address_english', 'address_en', 'address', 'street_address')), stateId: number(pick(raw, 'state_id')), cityId: number(pick(raw, 'city_id')), raw }
}

export function mapBooking(value: unknown, status: string): LiveBooking {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  const bookingItems = Array.isArray(raw.booking_items) ? raw.booking_items.map(item => item && typeof item === 'object' ? item as Record<string, unknown> : {}) : []
  const firstItem = bookingItems[0] || {}
  const objectAt = (...keys: string[]) => { const found = pick(raw, ...keys); return found && typeof found === 'object' ? found as Record<string, unknown> : {} }
  const nestedSetup = firstItem.service_setup && typeof firstItem.service_setup === 'object' ? firstItem.service_setup as Record<string, unknown> : {}
  const setup = Object.keys(nestedSetup).length ? nestedSetup : objectAt('service_setup', 'service_vendor_map', 'service_vendor_mapp', 'service_details')
  const nestedService = firstItem.service_details && typeof firstItem.service_details === 'object' ? firstItem.service_details as Record<string, unknown> : {}
  const service = Object.keys(nestedService).length ? nestedService : (Object.keys(objectAt('service')).length ? objectAt('service') : (setup.service && typeof setup.service === 'object' ? setup.service as Record<string, unknown> : setup))
  const nestedVendor = setup.created_by && typeof setup.created_by === 'object' ? setup.created_by as Record<string, unknown> : {}
  const vendor = Object.keys(nestedVendor).length ? nestedVendor : objectAt('vendor', 'provider', 'created_by')
  const details = objectAt('booking_detail', 'booking_details')
  const address = objectAt('booking_address', 'address_data')
  const payment = objectAt('payment', 'payment_details')
  const imageList = Array.isArray(setup.all_service_images) ? setup.all_service_images : []
  const scheduled = text(pick(raw, 'booking_date_time', 'selected_date', 'booking_date', 'date') || pick(details, 'booking_date_time')).trim()
  const end = text(pick(raw, 'booking_end_datetime')).trim()
  const date = /^\d{4}-\d{2}-\d{2}/.exec(scheduled)?.[0] || ''
  const clock = (input: string) => {
    if (/\b(?:AM|PM)\b/i.test(input)) return input.replace(/^0(\d:)/, '$1')
    const match = /(?:^|[ T])(\d{1,2}):(\d{2})/.exec(input)
    if (!match) return input || ''
    const hour = Number(match[1])
    return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`
  }
  const startTime = clock(scheduled)
  const endTime = clock(end)
  const statusMap: Record<string, string> = { '0': 'Upcoming', '1': 'In progress', '2': 'Completed', '3': 'Cancelled', '4': 'Rejected', '5': 'Awaiting payment' }
  const statusCode = text(raw.booking_status)
  const itemRows = bookingItems.map(item => ({ name: text(pick(item, 'service_name', 'name'), 'Service'), price: number(pick(item, 'final_price', 'total_price')) }))
  return {
    id: text(pick(raw, 'booking_id', 'id', 'order_id'), crypto.randomUUID()),
    reference: text(pick(raw, 'unique_booking_id', 'booking_id', 'id')),
    service: text(pick(firstItem, 'service_name', 'name') || pick(raw, 'service_name') || pick(service, 'name_english', 'name', 'service_name') || pick(setup, 'name_english', 'name'), 'Booked service'),
    provider: text(pick(firstItem, 'provider_name', 'vendor_name') || pick(raw, 'vendor_name', 'provider_name', 'created_by_name') || pick(vendor, 'name_english', 'name'), 'Service provider'),
    category: text(pick(firstItem, 'category_name')),
    date,
    time: [startTime, endTime].filter(Boolean).join(' – '),
    price: number(pick(raw, 'final_price', 'total_price', 'total_amount', 'amount') ?? pick(firstItem, 'final_price', 'total_price') ?? pick(payment, 'amount')),
    subtotal: number(pick(raw, 'total_price')),
    discount: number(pick(raw, 'discount_amount')),
    status: statusMap[statusCode] || text(pick(raw, 'booking_status_text', 'status_text'), status),
    paymentStatus: text(pick(raw, 'payment_status') || pick(payment, 'payment_status', 'status')),
    paymentMethod: text(pick(raw, 'payment_type') || pick(payment, 'payment_method')),
    image: text(pick(raw, 'service_image', 'service_setup_image_url', 'image_url') || pick(setup, 'service_image_url', 'image_url') || imageList[0]),
    address: text(pick(raw, 'user_address', 'service_address', 'address_english') || pick(details, 'booking_address', 'location') || pick(address, 'address_english', 'address_en', 'address', 'full_address')),
    requirements: text(pick(details, 'requirements')),
    createdAt: text(pick(raw, 'created_at_formatted', 'created_at')),
    items: itemRows,
    raw,
  }
}

type DataContext = {
  loading: boolean; accountLoading: boolean; error: string; accountError: string; banners: LiveBanner[]; categories: LiveCategory[]; services: LiveService[]; featured: LiveService[]; providers: LiveProvider[]; businesses: LiveBusiness[]
  profile: LiveProfile | null; addresses: LiveAddress[]; bookings: LiveBooking[]; favorites: unknown[]; walletHistory: unknown[]; notifications: unknown[]
  selectedAddress: LiveAddress | null; selectAddress: (id: string) => void; catalogCoordinates?: { latitude: number; longitude: number }
  refreshCatalog: () => Promise<void>; refreshAccount: () => Promise<void>; getAvailability: (vendorId: number, date: string, serviceVendorMapId?: number) => Promise<HelpyAvailabilitySlot[]>
  updateProfile: (input: { name: string; email: string; phoneNumber: string; aboutMe?: string }) => Promise<void>
  addAddress: (input: HelpyAddressInput) => Promise<void>
  deleteAddress: (id: string) => Promise<void>
  toggleFavorite: (service: LiveService) => Promise<void>
}

const Context = createContext<DataContext>(null as never)

export function HelpyDataProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn } = useNav()
  const [loading, setLoading] = useState(true)
  const [accountLoading, setAccountLoading] = useState(false)
  const [error, setError] = useState('')
  const [accountError, setAccountError] = useState('')
  const [banners, setBanners] = useState<LiveBanner[]>([])
  const [categories, setCategories] = useState<LiveCategory[]>([])
  const [services, setServices] = useState<LiveService[]>([])
  const [featured, setFeatured] = useState<LiveService[]>([])
  const [providers, setProviders] = useState<LiveProvider[]>([])
  const [profile, setProfile] = useState<LiveProfile | null>(null)
  const [addresses, setAddresses] = useState<LiveAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState(() => window.sessionStorage.getItem('helpy_selected_address_id') || '')
  const [bookings, setBookings] = useState<LiveBooking[]>([])
  const [favorites, setFavorites] = useState<unknown[]>([])
  const [walletHistory, setWalletHistory] = useState<unknown[]>([])
  const [notifications, setNotifications] = useState<unknown[]>([])
  const selectedAddress = addresses.find(address => address.id === selectedAddressId) || addresses.find(address => Boolean(address.raw.is_default)) || addresses[0] || null
  const latitude = Number(selectedAddress?.raw.latitute ?? selectedAddress?.raw.latitude)
  const longitude = Number(selectedAddress?.raw.longitude)
  const catalogCoordinates = selectedAddress && Number.isFinite(latitude) && Number.isFinite(longitude)
    ? { latitude, longitude } : undefined
  const selectAddress = (id: string) => {
    setSelectedAddressId(id)
    window.sessionStorage.setItem('helpy_selected_address_id', id)
  }

  const businesses = useMemo<LiveBusiness[]>(() => {
    const grouped = new Map<number, LiveBusiness>()
    services.forEach(service => {
      const creator = service.raw.created_by && typeof service.raw.created_by === 'object' ? service.raw.created_by as Record<string, unknown> : {}
      const id = service.vendorId
      if (!id) return
      const current = grouped.get(id)
      if (current) { current.services.push(service); return }
      grouped.set(id, {
        id,
        name: service.provider,
        image: text(pick(creator, 'vendor_profile_image_url', 'user_profile_image_url', 'profile_photo')),
        rating: number(pick(creator, 'rateing', 'rating')),
        about: cleanText(pick(creator, 'about_me_english', 'about_me')),
        services: [service],
        raw: creator,
      })
    })
    return [...grouped.values()].sort((a, b) => b.services.length - a.services.length || b.rating - a.rating || a.name.localeCompare(b.name) || a.id - b.id)
  }, [services])

  const refreshCatalog = useCallback(async () => {
    setLoading(true); setError('')
    try {
      await helpyApi.ensureGuestSession()
      const categoryRows = await helpyApi.getCategories()
      const mappedCategories = categoryRows.map(mapCategory)
      setCategories(mappedCategories)
      const [bannerResult, featuredResult, providerResult, ...pageResults] = await Promise.allSettled([
        helpyApi.getBanners(), helpyApi.getFeaturedServices(), helpyApi.getTopProviders(),
        ...mappedCategories.map(category => helpyApi.getServices(category.id, 1, 100, {}, catalogCoordinates)),
      ])
      const bannerRows = bannerResult.status === 'fulfilled' ? bannerResult.value : []
      const featuredRows = featuredResult.status === 'fulfilled' ? featuredResult.value : []
      const providerRows = providerResult.status === 'fulfilled' ? providerResult.value : []
      const servicePages = pageResults.flatMap(result => result.status === 'fulfilled' ? [result.value] : [])
      setBanners(bannerRows.map(mapBanner).filter(banner => Boolean(banner.image)))
      const deduped = new Map<string, LiveService>()
      servicePages.flatMap(page => page.data || []).map(item => mapService(item, mappedCategories)).forEach(item => deduped.set(item.id, item))
      setServices([...deduped.values()])
      setFeatured(featuredRows.map(item => mapService(item, mappedCategories)))
      setProviders(providerRows.map(item => mapProvider(item, mappedCategories)))
      const failures = [bannerResult, featuredResult, providerResult, ...pageResults].filter(result => result.status === 'rejected').length
      if (failures) setError(`Some services could not be loaded (${failures} request${failures === 1 ? '' : 's'} failed). Try again to refresh them.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load Helpy services.') }
    finally { setLoading(false) }
  }, [catalogCoordinates?.latitude, catalogCoordinates?.longitude])

  const refreshAccount = useCallback(async () => {
    if (!hasHelpyUserSession()) { setProfile(null); setAddresses([]); setSelectedAddressId(''); window.sessionStorage.removeItem('helpy_selected_address_id'); setBookings([]); setFavorites([]); setWalletHistory([]); setNotifications([]); setAccountError(''); return }
    setAccountLoading(true); setAccountError('')
    try {
      const [profileResult, addressResult, bookingResult, favoriteResult, walletResult, notificationResult] = await Promise.allSettled([
        helpyApi.getUserProfile(), helpyApi.getAddresses(), helpyApi.getBookings(), helpyApi.getFavorites(), helpyApi.getWalletHistory(), helpyApi.getNotifications(),
      ])
      const rows = (result: PromiseSettledResult<unknown[]>) => result.status === 'fulfilled' && Array.isArray(result.value) ? result.value : []
      if (profileResult.status === 'fulfilled') {
        const profileRaw = profileResult.value
        const wallet = profileRaw.wallet && typeof profileRaw.wallet === 'object' ? profileRaw.wallet as Record<string, unknown> : {}
        setProfile({ name: text(pick(profileRaw, 'name_english', 'name')), email: text(profileRaw.email), phone: text(profileRaw.phone_number), about: text(pick(profileRaw, 'about_me_english', 'about_me')), image: text(pick(profileRaw, 'user_profile_image_url', 'profile_photo')), memberSince: text(pick(profileRaw, 'member_since', 'created_at_formatted')), wallet: number(pick(wallet, 'balance', 'wallet_balance', 'amount') ?? profileRaw.wallet), raw: profileRaw })
      } else setProfile(null)
      const nextAddresses = rows(addressResult).map(mapAddress)
      setAddresses(nextAddresses)
      if (!nextAddresses.some(address => address.id === selectedAddressId)) {
        const initial = nextAddresses.find(address => Boolean(address.raw.is_default)) || nextAddresses[0]
        if (initial) selectAddress(initial.id)
      }
      const uniqueBookings = new Map<string, LiveBooking>()
      rows(bookingResult).map(row => mapBooking(row, 'Booking')).forEach(booking => {
        const key = booking.reference || booking.id
        if (!uniqueBookings.has(key)) uniqueBookings.set(key, booking)
      })
      setBookings([...uniqueBookings.values()])
      setFavorites(rows(favoriteResult)); setWalletHistory(rows(walletResult)); setNotifications(rows(notificationResult))
      const failures = [profileResult, addressResult, bookingResult, favoriteResult, walletResult, notificationResult].filter(result => result.status === 'rejected').length
      if (failures) setAccountError(`${failures} account section${failures === 1 ? '' : 's'} could not be loaded. Try refreshing.`)
    } catch (cause) { setAccountError(cause instanceof Error ? cause.message : 'Unable to load account data.') }
    finally { setAccountLoading(false) }
  }, [selectedAddressId])

  useEffect(() => { void refreshCatalog() }, [refreshCatalog])
  useEffect(() => { void refreshAccount() }, [refreshAccount, isLoggedIn])

  const value = useMemo<DataContext>(() => ({
    loading, accountLoading, error, accountError, banners, categories, services, featured, providers, businesses, profile, addresses, bookings, favorites, walletHistory, notifications, selectedAddress, selectAddress, catalogCoordinates,
    refreshCatalog, refreshAccount,
    getAvailability: (vendorId, date, serviceVendorMapId) => helpyApi.getVendorAvailability(vendorId, date, serviceVendorMapId),
    updateProfile: async input => { await helpyApi.updateUserProfile(input); await refreshAccount() },
    addAddress: async input => {
      await helpyApi.storeAddress(input)
      if (input.isDefault) {
        const updated = (await helpyApi.getAddresses()).map(mapAddress)
        const newDefault = updated.find(address => Boolean(address.raw.is_default))
        if (newDefault) selectAddress(newDefault.id)
      }
      await refreshAccount()
    },
    deleteAddress: async id => { await helpyApi.deleteAddress(id); await refreshAccount() },
    toggleFavorite: async service => {
      const userId = number(profile?.raw.id)
      if (!userId || !service.serviceVendorMapId || !service.vendorId) throw new Error('Sign in and select a valid service to save it.')
      await helpyApi.toggleFavorite({ userId, serviceVendorMapId: service.serviceVendorMapId, providerId: service.vendorId })
      setFavorites(await helpyApi.getFavorites())
    },
  }), [loading, accountLoading, error, accountError, banners, categories, services, featured, providers, businesses, profile, addresses, selectedAddressId, bookings, favorites, walletHistory, notifications, refreshCatalog, refreshAccount])

  return <Context.Provider value={value}>{children}</Context.Provider>
}

export const useHelpyData = () => useContext(Context)
