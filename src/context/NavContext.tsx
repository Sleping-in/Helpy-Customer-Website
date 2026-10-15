import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { hasHelpyUserSession } from '../api/helpy'

export type Screen =
  | 'splash' | 'login' | 'verify' | 'register' | 'home' | 'orders' | 'chat' | 'profile'
  | 'categories' | 'location' | 'service-detail' | 'booking-confirm' | 'booking-checkout'
  | 'booking-success' | 'glow-checkout' | 'chat-thread' | 'wallet' | 'favorites'
  | 'addresses' | 'contact-us' | 'terms' | 'privacy' | 'notifications'
  | 'order-detail' | 'category-services' | 'deals' | 'offers-events'
  | 'providers' | 'all-services' | 'reviews'

type Route = { screen: Screen; params?: any }
interface NavState extends Route { history: Route[] }
interface NavCtx {
  screen: Screen; params: any
  navigate: (s: Screen, p?: any) => void
  goBack: () => void
  canGoBack: boolean
  activeTab: string
  setActiveTab: (t: string) => void
  isLoggedIn: boolean
  login: () => void
  bookedServices: BookedService[]
  addBooking: (b: BookedService) => void
  pendingReview: BookedService | null
  clearPendingReview: () => void
}

export interface BookedService {
  id: string; provider: string; service: string
  date: string; time: string; price: string
  status: 'Confirmed'|'In Progress'|'Completed'
  providerBg: string; providerEmoji: string
  providerImage?: string
  addressLabel?: string; address?: string; addressDetails?: string
}

const Ctx = createContext<NavCtx>(null as any)
const INTENDED_ROUTE_KEY = 'helpy_intended_route'
const SCREENS: Screen[] = [
  'splash', 'login', 'verify', 'register', 'home', 'orders', 'chat', 'profile', 'categories',
  'location', 'service-detail', 'booking-confirm', 'booking-checkout', 'booking-success',
  'glow-checkout', 'chat-thread', 'wallet', 'favorites', 'addresses', 'contact-us',
  'terms', 'privacy', 'notifications', 'order-detail', 'category-services', 'deals',
  'offers-events', 'providers', 'all-services', 'reviews',
]

function serializableParams(screen: Screen, params: any): Record<string, string> {
  const values: Record<string, unknown> = {}
  if (screen === 'service-detail' || screen === 'reviews') {
    values.serviceVendorMapId = params?.serviceVendorMapId ?? params?.service?.serviceVendorMapId ?? params?.business?.services?.[0]?.serviceVendorMapId
  } else if (['booking-checkout', 'booking-confirm', 'glow-checkout'].includes(screen)) {
    const booking = params?.booking || params
    values.serviceVendorMapId = booking?.serviceVendorMapId ?? booking?.service?.serviceVendorMapId
    values.date = booking?.date
    values.slot = booking?.slot
    values.addressId = params?.addressId ?? params?.address?.id ?? booking?.address?.id
  } else if (screen === 'order-detail') {
    values.id = params?.id ?? params?.booking?.id
  } else if (screen === 'category-services') {
    values.categoryId = params?.categoryId
  } else if (screen === 'all-services' || screen === 'providers') {
    values.query = params?.query
  } else if (screen === 'verify') {
    values.email = params?.email
    values.mode = params?.mode
  }
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== '').map(([key, value]) => [key, String(value)]))
}

function routeFromUrl(): Route {
  if (typeof window === 'undefined') return { screen: 'splash' }
  const [candidate, query = ''] = window.location.hash.slice(1).split('?')
  const screen = SCREENS.includes(candidate as Screen) ? candidate as Screen : 'splash'
  const params = Object.fromEntries(new URLSearchParams(query))
  return { screen, params: Object.keys(params).length ? params : undefined }
}

function writeRoute(route: Route, replace = false, index = 0) {
  const query = new URLSearchParams(serializableParams(route.screen, route.params)).toString()
  const url = `${window.location.pathname}${window.location.search}#${route.screen}${query ? `?${query}` : ''}`
  window.history[replace ? 'replaceState' : 'pushState']({ helpyNavIndex: index, route: { screen: route.screen, params: serializableParams(route.screen, route.params) } }, '', url)
}

export function NavProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NavState>(() => ({ ...routeFromUrl(), history: [] }))
  const [activeTab, setActiveTabState] = useState('home')
  const [isLoggedIn, setIsLoggedIn] = useState(() => hasHelpyUserSession())
  const [bookedServices, setBookedServices] = useState<BookedService[]>([])
  const [pendingReview, setPendingReview] = useState<BookedService | null>(null)
  const lastBrowserUrl = useRef(typeof window === 'undefined' ? '' : window.location.href)
  const navIndex = useRef(typeof window === 'undefined' ? 0 : Number(window.history.state?.helpyNavIndex) || 0)

  useEffect(() => {
    if (window.history.state?.helpyNavIndex === undefined) writeRoute(routeFromUrl(), true, navIndex.current)
    const syncFromBrowser = () => {
      // A hash navigation can emit both popstate and hashchange for one Back action.
      if (lastBrowserUrl.current === window.location.href) return
      lastBrowserUrl.current = window.location.href
      const nextIndex = Number(window.history.state?.helpyNavIndex) || 0
      const previousIndex = navIndex.current
      navIndex.current = nextIndex
      setState(current => ({
        ...routeFromUrl(),
        history: nextIndex > previousIndex
          ? [...current.history, { screen: current.screen, params: current.params }]
          : current.history.slice(0, -1),
      }))
    }
    const sessionExpired = () => {
      setIsLoggedIn(false)
      setState(current => {
        if (!['login', 'register', 'verify', 'splash'].includes(current.screen)) {
          window.sessionStorage.setItem(INTENDED_ROUTE_KEY, JSON.stringify({ screen: current.screen, params: serializableParams(current.screen, current.params) }))
        }
        return { screen: 'login', params: { sessionExpired: true }, history: [] }
      })
      writeRoute({ screen: 'login' }, true, navIndex.current)
      lastBrowserUrl.current = window.location.href
    }
    window.addEventListener('popstate', syncFromBrowser)
    window.addEventListener('hashchange', syncFromBrowser)
    window.addEventListener('helpy:session-expired', sessionExpired)
    return () => {
      window.removeEventListener('popstate', syncFromBrowser)
      window.removeEventListener('hashchange', syncFromBrowser)
      window.removeEventListener('helpy:session-expired', sessionExpired)
    }
  }, [])

  const navigate = (screen: Screen, params?: any) => {
    if ((screen === 'login' || screen === 'register') && !['login', 'register', 'verify', 'splash'].includes(state.screen)) {
      window.sessionStorage.setItem(INTENDED_ROUTE_KEY, JSON.stringify({ screen: state.screen, params: serializableParams(state.screen, state.params) }))
    }
    setState(current => ({ screen, params, history: [...current.history, { screen: current.screen, params: current.params }] }))
    navIndex.current += 1
    writeRoute({ screen, params }, false, navIndex.current)
    lastBrowserUrl.current = window.location.href
  }

  const goBack = () => {
    if (state.history.length || navIndex.current > 0) { window.history.back(); return }
    setState({ screen: 'home', history: [] })
    writeRoute({ screen: 'home' }, true, navIndex.current)
    lastBrowserUrl.current = window.location.href
  }

  const setActiveTab = (tab: string) => {
    if (!SCREENS.includes(tab as Screen)) return
    setActiveTabState(tab)
    navigate(tab as Screen)
  }

  const login = () => {
    setIsLoggedIn(true)
    let destination: Route = { screen: 'home' }
    try {
      const stored = JSON.parse(window.sessionStorage.getItem(INTENDED_ROUTE_KEY) || 'null') as Route | null
      if (stored && SCREENS.includes(stored.screen) && !['login', 'register', 'verify'].includes(stored.screen)) destination = stored
    } catch { /* A malformed old intent should not prevent signing in. */ }
    window.sessionStorage.removeItem(INTENDED_ROUTE_KEY)
    setState({ ...destination, history: [] })
    setActiveTabState('home')
    writeRoute(destination, true, navIndex.current)
    lastBrowserUrl.current = window.location.href
  }

  const addBooking = (booking: BookedService) => {
    setBookedServices(previous => [booking, ...previous])
    setPendingReview(booking)
  }
  return <Ctx.Provider value={{ screen: state.screen, params: state.params, navigate, goBack, canGoBack: state.history.length > 0 || !['splash', 'home'].includes(state.screen), activeTab, setActiveTab, isLoggedIn, login, bookedServices, addBooking, pendingReview, clearPendingReview: () => setPendingReview(null) }}>{children}</Ctx.Provider>
}

export const useNav = () => useContext(Ctx)
