import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, ChevronLeft, ChevronRight, Heart, ImageOff, LayoutGrid, LoaderCircle, MapPin, MessageCircle, PackageCheck, Search, Send, Star, UserRound, X } from 'lucide-react'
import type { Screen } from '../context/NavContext'
import { useNav } from '../context/NavContext'
import { helpyApi, hasHelpyUserSession, type HelpyAvailabilitySlot } from '../api/helpy'
import { helpyChat, type ChatMessage, type ChatUser } from '../api/chat'
import { mapBooking, mapService, useHelpyData, type LiveAddress, type LiveBooking, type LiveBusiness, type LiveService } from '../context/HelpyDataContext'
import DesktopBannerCarousel from './DesktopBannerCarousel'
import ResilientImage from './ResilientImage'

type Navigate = (screen: Screen, params?: any) => void
type BookingDraft = { service: LiveService; date: string; slot: string; address?: LiveAddress }

const initials = (name: string) => name.split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase() || 'H'
const money = (value: number) => `QAR ${value.toFixed(2)}`
const readableDate = (value: string) => { if (!value) return 'Not selected'; const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value); return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('en-QA', { weekday: 'short', day: 'numeric', month: 'short' }).format(parsed) }
const bookingDate = (value: string) => { if (!value) return 'Not provided'; const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value); return Number.isNaN(parsed.getTime()) ? value : new Intl.DateTimeFormat('en-QA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(parsed) }
const nextDates = Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() + index); return date.toISOString().slice(0, 10) })

function Heading({ title }: { eyebrow?: string; title: string; copy?: string }) {
  return <h1 className="text-3xl font-black tracking-[-.045em] text-[#102044] sm:text-4xl">{title}</h1>
}

function State({ loading, error, empty, retry }: { loading?: boolean; error?: string; empty?: string; retry?: () => void }) {
  if (loading) return <div role="status" aria-label="Loading services" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map(index => <div key={index} className="animate-pulse overflow-hidden rounded-[24px] border border-blue-100 bg-white"><div className="h-32 bg-[#eaf1fb]"/><div className="space-y-3 p-5"><div className="h-4 w-2/3 rounded bg-[#eaf1fb]"/><div className="h-3 w-1/2 rounded bg-[#eaf1fb]"/></div></div>)}</div>
  return <div className="rounded-[24px] border border-blue-100 bg-white px-6 py-14 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-[#0967ff]"><PackageCheck/></div><p className="mt-4 font-black">{error || empty}</p>{error && retry && <button onClick={retry} className="mt-4 rounded-xl bg-[#0967ff] px-5 py-2.5 text-sm font-black text-white">Try again</button>}</div>
}

function PartialCatalogWarning({ error, retry }: { error: string; retry: () => void }) {
  return <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900"><span>{error}</span><button onClick={() => void retry()} className="font-black text-[#0967ff] underline">Retry</button></div>
}

function ServiceCard({ service, navigate }: { service: LiveService; navigate: Navigate }) {
  return <button onClick={() => navigate('service-detail', { service })} className="overflow-hidden rounded-[24px] border border-blue-100 bg-white text-left shadow-sm"><div className="h-44 overflow-hidden bg-blue-50"><ResilientImage src={service.image} alt="" className="h-full w-full object-cover" fallback={<div className="grid h-full w-full place-items-center bg-gradient-to-br from-[#e8f1ff] to-[#f8fbff] text-2xl font-black text-[#6683b0]">{initials(service.name)}</div>}/></div><div className="p-5"><p className="text-xs font-black text-[#0967ff]">{service.provider}</p><h2 className="mt-1 truncate text-lg font-black">{service.name}</h2><p className="mt-2 line-clamp-2 min-h-10 text-xs font-semibold leading-5 text-[#75839d]">{service.description || service.category}</p><div className="mt-4 flex items-end justify-between"><div><p className="text-[10px] font-bold text-[#93a0b5]">from</p><p className="text-lg font-black">{money(service.price)}</p></div><span className="text-xs font-black text-[#66758f]"><Star size={14} className="mr-1 inline fill-amber-400 text-amber-400"/>{service.rating || 'New'}</span></div></div></button>
}

function BusinessCard({ business, navigate }: { business: LiveBusiness; navigate: Navigate }) {
  const cover = business.services.find(item => item.image)?.image
  const categories = Array.from(new Set(business.services.map(item => item.category).filter(Boolean))).slice(0, 2).join(' · ')
  return <button onClick={() => navigate('service-detail', { business })} className="overflow-hidden rounded-[24px] border border-blue-100 bg-white text-left shadow-sm"><div className="relative h-36 overflow-hidden bg-blue-50 sm:h-40"><ResilientImage src={cover} alt="" className="h-full w-full object-cover" fallback={<div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#e9f2ff] to-[#f7faff] text-[#6683b0]"><ImageOff size={30} strokeWidth={1.5}/></div>}/><ResilientImage src={business.image} alt="" className="absolute bottom-3 left-3 h-12 w-12 rounded-2xl border-2 border-white bg-white object-cover shadow" fallback={<span className="absolute bottom-3 left-3 grid h-12 w-12 place-items-center rounded-2xl border-2 border-white bg-[#0967ff] text-xs font-black text-white shadow">{initials(business.name)}</span>}/></div><div className="p-5"><h2 className="truncate text-lg font-black text-[#102044]">{business.name}</h2><div className="mt-2 flex min-w-0 items-center gap-2 text-xs font-bold text-[#64738e]">{business.rating > 0 && <span className="shrink-0"><Star size={14} className="mr-1 inline fill-amber-400 text-amber-400"/>{business.rating}</span>}{categories && <span className="truncate rounded-full bg-[#f1f6ff] px-2.5 py-1 text-[#42618f]">{categories}</span>}</div></div></button>
}

function CategoryFilterCarousel({ categories, categoryId, onSelect }: { categories: Array<{ id: number; name: string; image: string }>; categoryId: number | null; onSelect: (id: number | null) => void }) {
  const rail = useRef<HTMLDivElement>(null)
  useEffect(() => { rail.current?.scrollTo({ left: 0 }) }, [])
  const move = (direction: number) => {
    const element = rail.current
    const item = element?.querySelector<HTMLElement>('[data-category-item]')
    if (!element || !item) return
    const gap = Number.parseFloat(getComputedStyle(element).gap) || 0
    element.scrollBy({ left: direction * 4 * (item.getBoundingClientRect().width + gap), behavior: 'smooth' })
  }
  const items = [{ id: null, name: 'All', image: '' }, ...categories]
  return <section className="-mx-4 pb-0 pt-2 sm:-mx-8 sm:pt-2 xl:-mx-10">
    <div className="relative mx-auto max-w-[1440px]">
      <div className="mx-[76px] overflow-hidden sm:mx-[92px]">
        <div ref={rail} className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] sm:gap-5 xl:justify-center [&::-webkit-scrollbar]:hidden">
          {items.map(item => {
            const active = item.id === categoryId
            return <button key={item.id ?? 'all'} data-category-item onClick={() => onSelect(item.id)} aria-pressed={active} className="group flex w-[calc((100vw-216px)/5)] min-w-[78px] max-w-[112px] shrink-0 snap-start flex-col items-center gap-3 text-center sm:w-[calc((100vw-264px)/5)] sm:min-w-[86px] sm:max-w-[116px] xl:w-[104px] xl:min-w-0 xl:max-w-none">
              <span className={`grid h-[76px] w-[76px] place-items-center rounded-full transition sm:h-[88px] sm:w-[88px] ${active ? 'bg-[#0967ff] text-white shadow-[0_12px_24px_rgba(9,103,255,.32)]' : 'bg-[#f7faff] text-[#64738e] shadow-sm ring-1 ring-[#e2eaf5] group-hover:ring-2 group-hover:ring-blue-200'}`}>
                {item.id === null ? <LayoutGrid size={27}/> : <ResilientImage src={item.image} alt="" className="h-full w-full rounded-full object-contain" fallback={<span className="text-sm font-black text-blue-300">{initials(item.name)}</span>}/>}
              </span>
              <span className={`line-clamp-2 min-h-8 text-xs font-black leading-4 sm:text-sm ${active ? 'text-[#0967ff]' : 'text-[#253656]'}`}>{item.name}</span>
            </button>
          })}
        </div>
      </div>
      <button onClick={() => move(-1)} className="absolute left-3 top-4 z-10 grid h-12 w-12 place-items-center rounded-full bg-white text-[#253656] shadow-[0_10px_28px_rgba(35,53,85,.14)] sm:left-5 sm:top-5" aria-label="Show previous categories"><ChevronLeft size={24}/></button>
      <button onClick={() => move(1)} className="absolute right-3 top-4 z-10 grid h-12 w-12 place-items-center rounded-full bg-white text-[#253656] shadow-[0_10px_28px_rgba(35,53,85,.14)] sm:right-5 sm:top-5" aria-label="Show more categories"><ChevronRight size={24}/></button>
    </div>
  </section>
}

export function LiveDesktopHome({ navigate }: { navigate: Navigate }) {
  const data = useHelpyData()
  const picks = data.businesses.slice(0, 6)
  const next = data.bookings.find(item => ['Upcoming', 'In progress'].includes(item.status))
  return <div className="space-y-5 lg:space-y-6"><DesktopBannerCarousel navigate={navigate}/>{data.error && data.categories.length > 0 && <PartialCatalogWarning error={data.error} retry={data.refreshCatalog}/>}<section><div className="mb-1 flex items-center justify-between"><h2 className="text-2xl font-black tracking-[-.03em] text-[#102044]">Browse categories</h2><button onClick={() => navigate('categories')} className="shrink-0 text-sm font-black text-[#0967ff]">View all <ArrowRight size={14} className="inline"/></button></div>{data.loading ? <State loading/> : data.error && !data.categories.length ? <State error={data.error} retry={data.refreshCatalog}/> : data.categories.length ? <CategoryFilterCarousel categories={data.categories} categoryId={null} onSelect={id => { if (id === null) navigate('all-services'); else { const category = data.categories.find(item => item.id === id); navigate('category-services', { categoryId: id, label: category?.name }) } }}/> : <State empty="No categories are currently published."/>}</section><section className="grid items-start gap-5 xl:grid-cols-[1.5fr_.82fr]"><div><div className="mb-3 flex items-center justify-between"><h2 className="text-2xl font-black tracking-[-.03em] text-[#102044]">Popular businesses</h2><button onClick={() => navigate('providers')} className="shrink-0 text-sm font-black text-[#0967ff]">See all <ArrowRight size={14} className="inline"/></button></div>{picks.length ? <div className="grid gap-5 md:grid-cols-2">{picks.slice(0,4).map(business => <BusinessCard key={business.id} business={business} navigate={navigate}/>)}</div> : !data.loading && <State empty="No businesses are currently available."/>}</div><aside className="h-fit rounded-[26px] bg-white p-6 shadow-sm ring-1 ring-[#e5edf8]"><p className="text-xs font-black uppercase tracking-[.14em] text-[#0967ff]">Your next booking</p>{data.accountLoading ? <p className="mt-4 text-sm font-bold text-[#71809a]">Loading…</p> : next ? <><h2 className="mt-2 text-xl font-black">{readableDate(next.date)} · {next.time}</h2><div className="mt-5 rounded-2xl bg-[#f5f9ff] p-4"><p className="text-sm font-black">{next.provider}</p><p className="mt-1 text-xs font-bold text-[#71809a]">{next.service}</p><button onClick={() => navigate('order-detail', { booking: next })} className="mt-4 text-xs font-black text-[#0967ff]">View booking <ArrowRight size={13} className="inline"/></button></div></> : <><p className="mt-3 text-sm font-semibold leading-6 text-[#71809a]">{hasHelpyUserSession() ? 'You have no upcoming bookings.' : 'Sign in to see your upcoming bookings.'}</p><button onClick={() => navigate(hasHelpyUserSession() ? 'providers' : 'login')} className="mt-5 w-full rounded-xl border border-[#dbe8fb] py-3 text-sm font-black text-[#0967ff]">{hasHelpyUserSession() ? 'Browse businesses' : 'Sign in'}</button></>}</aside></section></div>
}

export function LiveLocationChoice({ navigate }: { navigate: Navigate }) {
  const data = useHelpyData()
  const { goBack } = useNav()
  if (!hasHelpyUserSession()) return <SignInState navigate={navigate} title="Sign in to choose a saved location"/>
  return <div className="mx-auto max-w-3xl">
    <Heading title="Choose your location"/>
    <p className="mt-2 text-sm text-[#64738e]">We use the selected saved address for nearby services and distance. Your phone’s live location is not used.</p>
    {data.accountLoading && !data.addresses.length ? <div className="mt-6"><State loading/></div> : data.addresses.length ? <div className="mt-6 space-y-3">{data.addresses.map(address => <button key={address.id} onClick={() => { data.selectAddress(address.id); goBack() }} className={`flex w-full items-center gap-4 rounded-2xl border bg-white p-5 text-left ${data.selectedAddress?.id === address.id ? 'border-[#0967ff] ring-2 ring-blue-100' : 'border-blue-100'}`}><MapPin className="shrink-0 text-[#0967ff]"/><span className="min-w-0 flex-1"><span className="block font-black">{address.title}{Boolean(address.raw.is_default) && <span className="ml-2 text-xs font-medium text-[#75839d]">Default</span>}</span><span className="mt-1 block text-sm text-[#64738e]">{address.address}</span></span>{data.selectedAddress?.id === address.id && <Check className="text-[#0967ff]"/>}</button>)}</div> : <div className="mt-6"><State empty="You have no saved addresses yet."/></div>}
    <button onClick={() => navigate('addresses')} className="mt-6 rounded-xl bg-[#0967ff] px-5 py-3 text-sm font-bold text-white">Add or edit an address</button>
  </div>
}

export function LiveDesktopExplore({ screen, params, navigate }: { screen: Screen; params: any; navigate: Navigate }) {
  const data = useHelpyData()
  const [query, setQuery] = useState(String(params?.query || ''))
  const [categoryId, setCategoryId] = useState<number | null>(Number(params?.categoryId) || null)
  const [serviceId, setServiceId] = useState(0)
  const [serviceTypes, setServiceTypes] = useState<Array<{ id: number; name: string }>>([])
  const [sortBy, setSortBy] = useState<'recently_added' | 'price_low_high' | 'price_high_low'>('recently_added')
  const [distance, setDistance] = useState(0)
  const [maxPrice, setMaxPrice] = useState('')
  const [results, setResults] = useState<LiveService[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loadingResults, setLoadingResults] = useState(true)
  const [resultError, setResultError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => { setQuery(String(params?.query || '')) }, [params?.query])
  useEffect(() => { setCategoryId(Number(params?.categoryId) || null); setServiceId(0); setPage(1) }, [params?.categoryId])
  useEffect(() => {
    let active = true
    void helpyApi.getServiceTypes(categoryId || 0).then(rows => {
      if (active) setServiceTypes(rows.map(row => ({ id: Number(row.service_id), name: String(row.name_english || row.name || 'Service') })).filter(row => row.id))
    }).catch(() => { if (active) setServiceTypes([]) })
    return () => { active = false }
  }, [categoryId])
  useEffect(() => {
    if (screen === 'categories') return
    let active = true
    const timer = window.setTimeout(() => {
      setLoadingResults(true); setResultError('')
      const search = query.trim()
      const request = search
        ? helpyApi.searchServices(search, data.catalogCoordinates).then(rows => ({ data: rows, total_records: rows.length }))
        : helpyApi.getServices(categoryId || 0, page, 20, {
          // Laravel only applies its price range when both bounds are non-empty.
          serviceId, sortBy, distance: distance || undefined, minPrice: maxPrice ? -0.01 : undefined, maxPrice: maxPrice ? Number(maxPrice) : undefined,
        }, data.catalogCoordinates)
      void request.then(result => {
        if (!active) return
        const mapped = (result.data || []).map(item => mapService(item, data.categories))
        const filtered = search ? mapped.filter(item => (!categoryId || item.categoryId === categoryId) && (!serviceId || item.serviceId === serviceId) && (!maxPrice || item.price <= Number(maxPrice)) && (!distance || Number(item.raw.distance) <= distance)) : mapped
        setResults(current => page > 1 && !search ? [...current, ...filtered] : filtered)
        // Some deployed backend versions undercount grouped rows (for example,
        // reporting 1 while returning a full page). Page size is reliable here.
        setHasMore(!search && ((result.data || []).length >= 20 || Number(result.total_records) > page * 20))
      }).catch(cause => { if (active) setResultError(cause instanceof Error ? cause.message : 'Unable to load services.') })
        .finally(() => { if (active) setLoadingResults(false) })
    }, query.trim() ? 250 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [screen, query, categoryId, serviceId, sortBy, distance, maxPrice, page, reload, data.catalogCoordinates?.latitude, data.catalogCoordinates?.longitude, data.categories])
  const shown = useMemo(() => {
    const grouped = new Map<number, LiveBusiness>()
    results.forEach(service => {
      if (!service.vendorId) return
      const existing = grouped.get(service.vendorId)
      if (existing) { if (!existing.services.some(item => item.id === service.id)) existing.services.push(service); return }
      const known = data.businesses.find(item => item.id === service.vendorId)
      const creator = service.raw.created_by && typeof service.raw.created_by === 'object' ? service.raw.created_by as Record<string, unknown> : {}
      grouped.set(service.vendorId, {
        id: service.vendorId, name: service.provider, image: known?.image || String(creator.vendor_profile_image_url || creator.user_profile_image_url || ''),
        rating: known?.rating || service.rating, about: known?.about || '', services: [service], raw: known?.raw || creator,
      })
    })
    return [...grouped.values()]
  }, [results, data.businesses])
  if (screen === 'categories') return <div><Heading title="Browse every category"/>{data.error && data.categories.length > 0 && <div className="mt-5"><PartialCatalogWarning error={data.error} retry={data.refreshCatalog}/></div>}{data.loading ? <div className="mt-8"><State loading/></div> : data.error && !data.categories.length ? <div className="mt-8"><State error={data.error} retry={data.refreshCatalog}/></div> : <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{data.categories.map(category => <button key={category.id} onClick={() => navigate('category-services', { categoryId: category.id, label: category.name })} className="rounded-[24px] border border-blue-100 bg-white p-6 text-left shadow-sm transition"><div className="h-28"><ResilientImage src={category.image} alt="" className="h-full w-full object-contain" fallback={<span className="grid h-full w-full place-items-center text-2xl font-bold text-blue-300">{initials(category.name)}</span>}/></div><h2 className="mt-4 text-xl font-black">{category.name}</h2><p className="mt-2 text-sm font-bold text-[#0967ff]">View services <ArrowRight size={14} className="inline"/></p></button>)}</div>}</div>
  const changeCategory = (id: number | null) => { setCategoryId(id); setServiceId(0); setPage(1); setResults([]) }
  return <div>
    <Heading title={screen === 'providers' ? 'Businesses' : screen === 'category-services' ? data.categories.find(item => item.id === categoryId)?.name || 'Services' : query ? `Results for “${query}”` : 'Browse services'}/>
    <div className="mt-5"><CategoryFilterCarousel categories={data.categories} categoryId={categoryId} onSelect={changeCategory}/></div>
    <div className="mt-5 grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-blue-100 sm:grid-cols-2 lg:grid-cols-[minmax(180px,1fr)_repeat(4,minmax(120px,.7fr))]">
      <label className="text-xs font-bold text-[#64738e]">Search<input value={query} onChange={event => { setQuery(event.target.value); setPage(1) }} placeholder="Service or business" className="mt-1.5 h-11 w-full rounded-xl border border-blue-100 px-3 text-sm text-[#102044] outline-none focus:border-[#0967ff]"/></label>
      <label className="text-xs font-bold text-[#64738e]">Service type<select value={serviceId} onChange={event => { setServiceId(Number(event.target.value)); setPage(1) }} className="mt-1.5 h-11 w-full rounded-xl border border-blue-100 px-2 text-sm text-[#102044]"><option value={0}>All types</option>{serviceTypes.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label className="text-xs font-bold text-[#64738e]">Sort<select value={sortBy} onChange={event => { setSortBy(event.target.value as typeof sortBy); setPage(1) }} className="mt-1.5 h-11 w-full rounded-xl border border-blue-100 px-2 text-sm text-[#102044]"><option value="recently_added">Recently added</option><option value="price_low_high">Price: low to high</option><option value="price_high_low">Price: high to low</option></select></label>
      <label className="text-xs font-bold text-[#64738e]">Within<select value={distance} onChange={event => { setDistance(Number(event.target.value)); setPage(1) }} disabled={!data.catalogCoordinates} className="mt-1.5 h-11 w-full rounded-xl border border-blue-100 px-2 text-sm text-[#102044] disabled:opacity-50"><option value={0}>Any distance</option><option value={5}>5 km</option><option value={10}>10 km</option><option value={25}>25 km</option></select></label>
      <label className="text-xs font-bold text-[#64738e]">Maximum price<input type="number" min="0" value={maxPrice} onChange={event => { setMaxPrice(event.target.value); setPage(1) }} placeholder="Any price" className="mt-1.5 h-11 w-full rounded-xl border border-blue-100 px-3 text-sm text-[#102044] outline-none focus:border-[#0967ff]"/></label>
    </div>
{loadingResults && !results.length ? <div className="mt-6"><State loading/></div> : resultError ? <div className="mt-6"><State error={resultError} retry={() => setReload(value => value + 1)}/></div> : shown.length ? <><p className="mt-5 text-sm font-semibold text-[#72819a]">{`${results.length} ${results.length === 1 ? 'service' : 'services'} shown across ${shown.length} ${shown.length === 1 ? 'business' : 'businesses'}${hasMore ? ' · More available' : ''}`}</p><div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{shown.map(business => <BusinessCard key={business.id} business={business} navigate={navigate}/>)}</div>{hasMore && <button disabled={loadingResults} onClick={() => setPage(value => value + 1)} className="mx-auto mt-7 block rounded-xl bg-[#0967ff] px-6 py-3 text-sm font-bold text-white disabled:opacity-60">{loadingResults ? 'Loading…' : 'Load more'}</button>}</> : <div className="mt-6"><State empty="No services match this search. Try another category or filter."/></div>}
  </div>
}

export function LiveDesktopService({ params, navigate }: { params: any; navigate: Navigate }) {
  const data = useHelpyData()
  const initialBusiness = (params?.business as LiveBusiness | undefined) || data.businesses.find(item => item.services.some(value => value.serviceVendorMapId === Number(params?.serviceVendorMapId)))
  const initial = (params?.service as LiveService | undefined) || initialBusiness?.services.find(item => item.serviceVendorMapId === Number(params?.serviceVendorMapId)) || initialBusiness?.services[0]
  const [service, setService] = useState<LiveService | undefined>(initial)
  const [offered, setOffered] = useState<LiveService[]>([])
  const [offeredLoading, setOfferedLoading] = useState(false)
  const [offeredError, setOfferedError] = useState('')
  const [preview, setPreview] = useState<LiveService | null>(null)
  const [date, setDate] = useState(nextDates[0])
  const [slots, setSlots] = useState<HelpyAvailabilitySlot[]>([])
  const [slot, setSlot] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [favoritePending, setFavoritePending] = useState<number | null>(null)
  const [favoriteError, setFavoriteError] = useState('')

  useEffect(() => { if (initial) setService(initial); setSlot(''); setPreview(null) }, [initial?.id, initialBusiness?.id])
  useEffect(() => {
    if (service || !params?.serviceVendorMapId) return
    let current = true
    void helpyApi.getVendorDetails(Number(params.serviceVendorMapId))
      .then(row => { if (current) setService(mapService(row, data.categories)) })
      .catch(cause => { if (current) setError(cause.message) })
    return () => { current = false }
  }, [service, params?.serviceVendorMapId, data.categories])
  useEffect(() => {
    if (!service?.vendorId || !data.categories.length) return
    let active = true
    setOfferedLoading(true); setOfferedError('')
    void Promise.allSettled(data.categories.map(category => helpyApi.getVendorServices(service.vendorId, category.id)))
      .then(results => {
        if (!active) return
        const rows = results.flatMap(result => result.status === 'fulfilled' ? result.value : [])
        const mapped = new Map(rows.map(row => { const value = mapService(row, data.categories); return [value.id, value] }))
        setOffered([...mapped.values()])
        if (results.every(result => result.status === 'rejected')) setOfferedError('Unable to load the full service list for this business.')
      }).finally(() => { if (active) setOfferedLoading(false) })
    return () => { active = false }
  }, [service?.vendorId, data.categories])
  useEffect(() => {
    if (!service) return
    let current = true
    const vendorId = service.vendorId || Number(service.raw.created_by)
    setSlot(''); setSlots([]); setError('')
    if (!vendorId) { setLoading(false); setError('Booking is unavailable for this service.'); return }
    setLoading(true)
    void data.getAvailability(vendorId, date, service.serviceVendorMapId || undefined)
      .then(values => { if (current) setSlots(values) })
      .catch(cause => { if (current) setError(cause.message) })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [service, date, data.getAvailability])
  if (!service) return <State loading={!error} error={error}/>
  const baseBusiness = initialBusiness || data.businesses.find(item => item.id === service.vendorId) || { id: service.vendorId, name: service.provider, image: '', rating: service.rating, about: '', services: [service], raw: {} }
  const business = { ...baseBusiness, services: offered.length ? offered : baseBusiness.services }
  // Laravel marks occupied or elapsed slots as 1; 0 means bookable.
  const available = slots.filter(value => Number(value.isAvailable) === 0)
  const cover = business.services.find(item => item.image)?.image || business.image
  const category = Array.from(new Set(business.services.map(item => item.category).filter(Boolean))).join(' · ')
  const chooseService = (item: LiveService) => { setSlot(''); setService(item) }
  const toggleFavorite = async (item: LiveService) => {
    if (!hasHelpyUserSession()) { navigate('login'); return }
    setFavoritePending(item.serviceVendorMapId); setFavoriteError('')
    try { await data.toggleFavorite(item) }
    catch (cause) { setFavoriteError(cause instanceof Error ? cause.message : 'Unable to update saved services.') }
    finally { setFavoritePending(null) }
  }

  return <div data-service-detail className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
    <div className="min-w-0 space-y-6">
      <section aria-label={business.name} className="relative overflow-hidden rounded-[28px] bg-[#102044]">
        <ResilientImage src={cover} alt="" className="absolute inset-0 h-full w-full bg-white object-contain" fallback={<div className="absolute inset-0 bg-gradient-to-br from-[#071b52] to-[#0967ff]"/>}/>
        <div className="absolute inset-0 bg-gradient-to-r from-[#071b52]/95 via-[#071b52]/70 to-[#071b52]/15" />
        <div className="relative flex min-h-[260px] flex-col justify-end p-7 text-white xl:min-h-[300px] xl:p-8">
          {category && <span className="w-fit max-w-full rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold [overflow-wrap:anywhere]">{category}</span>}
          <div className="mt-4 flex min-w-0 items-center gap-4">
            <ResilientImage src={business.image} alt="" className="h-16 w-16 shrink-0 rounded-full border-4 border-white bg-white object-contain" fallback={<span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border-4 border-white bg-[#0967ff] text-base font-black text-white">{initials(business.name)}</span>}/>
            <h1 className="min-w-0 text-[32px] font-black leading-tight tracking-[-.04em] [overflow-wrap:anywhere] xl:text-4xl">{business.name}</h1>
          </div>
          {business.about && <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-blue-50">{business.about}</p>}
          {business.rating > 0 && <p className="mt-4 flex items-center gap-1.5 text-sm font-bold"><Star size={16} className="fill-amber-400 text-amber-400" />{business.rating}</p>}
        </div>
      </section>

      <section aria-labelledby="service-options-title" className="rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm xl:p-6">
        <h2 id="service-options-title" className="text-xl font-black text-[#102044]">Select a service</h2>
        {offeredLoading && <p role="status" className="mt-2 text-xs text-[#73819a]">Loading all services from this business…</p>}
        {offeredError && <p role="alert" className="mt-2 text-xs text-red-600">{offeredError}</p>}
        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-3">
          {business.services.map(item => {
            const selected = service.id === item.id
            const favorite = data.favorites.some(value => value && typeof value === 'object' && Number((value as Record<string, unknown>).service_vendor_mapp_id) === item.serviceVendorMapId)
            return <article key={item.id} className={`relative min-w-0 overflow-hidden rounded-2xl border ${selected ? 'border-[#0967ff] bg-blue-50/60' : 'border-[#e5edf7] bg-white'}`}>
              <button onClick={() => chooseService(item)} aria-label={`Select ${item.name}`} aria-pressed={selected} className="w-full p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0967ff]">
                <div className="flex items-center gap-3">
                  <ResilientImage src={item.image} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-white object-contain" fallback={<span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[#e8f1ff] text-xs font-black text-[#0967ff]">{initials(item.name)}</span>}/>
                  <h3 className="min-w-0 flex-1 text-sm font-black leading-5 text-[#102044] [overflow-wrap:anywhere]">{item.name}</h3>
                  <span aria-hidden="true" className={`mr-9 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${selected ? 'border-[#0967ff] bg-[#0967ff] text-white' : 'border-slate-300 bg-white'}`}>{selected && <Check size={13} />}</span>
                </div>
                {item.description && <p className="mt-3 line-clamp-2 min-h-10 text-xs font-medium leading-5 text-[#73819a]">{item.description}</p>}
                <p className="mt-3 flex items-center justify-between text-sm font-black text-[#0967ff]"><span>{money(item.price)}</span>{item.duration && <span className="text-xs font-medium text-[#73819a]">{item.duration}</span>}</p>
              </button>
              <button onClick={() => void toggleFavorite(item)} disabled={favoritePending === item.serviceVendorMapId || !item.serviceVendorMapId || !item.vendorId} aria-label={favorite ? `Remove ${item.name} from saved services` : `Save ${item.name}`} aria-pressed={favorite} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white text-[#0967ff] shadow-sm disabled:opacity-50"><Heart size={18} className={favorite ? 'fill-current' : ''}/></button>
              {item.description && <button onClick={() => setPreview(item)} aria-label={`View details for ${item.name}`} className="w-full border-t border-blue-100/60 px-4 py-2.5 text-left text-xs font-bold text-[#0967ff]">View details <ArrowRight size={12} className="ml-1 inline" /></button>}
            </article>
          })}
        </div>
        {favoriteError && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{favoriteError}</p>}
        <button onClick={() => navigate('reviews', { service })} className="mt-5 text-sm font-bold text-[#0967ff]">Read customer reviews <ArrowRight size={14} className="inline"/></button>
      </section>
    </div>

    <aside aria-label="Booking options" className="min-w-0 rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm lg:sticky lg:top-28 xl:p-6">
      <h2 className="text-xl font-black text-[#102044]">Book a time</h2>
      <div className="mt-4 flex min-w-0 items-start justify-between gap-3 border-b border-blue-50 pb-5" aria-live="polite"><p className="min-w-0 text-sm font-bold text-[#64738e] [overflow-wrap:anywhere]">{service.name}</p><p className="shrink-0 text-sm font-black text-[#0967ff]">{money(service.price)}</p></div>
      <h3 className="mt-5 text-sm font-bold">Day</h3>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {nextDates.map(value => { const parsed = new Date(`${value}T12:00:00`); return <button key={value} aria-label={readableDate(value)} aria-pressed={date === value} onClick={() => { setSlot(''); setDate(value) }} className={`min-w-0 rounded-xl px-1 py-3 text-center ${date === value ? 'bg-[#0967ff] text-white' : 'bg-[#f4f8fe] text-[#60708c]'}`}><span className="block text-[11px] font-semibold">{new Intl.DateTimeFormat('en-QA', { weekday: 'short' }).format(parsed)}</span><span className="mt-1 block text-xs font-black">{new Intl.DateTimeFormat('en-QA', { day: 'numeric', month: 'short' }).format(parsed)}</span></button> })}
      </div>
      <h3 className="mt-5 text-sm font-bold">Available times</h3>
      {loading ? <p role="status" className="py-6 text-center text-sm font-medium text-[#73819a]">Loading times…</p> : <div className="mt-3 grid grid-cols-2 gap-2">{available.map(value => <button key={`${value.date}-${value.slot}`} aria-pressed={slot === value.slot} onClick={() => setSlot(value.slot)} className={`min-w-0 rounded-xl border px-2 py-3 text-xs font-bold [overflow-wrap:anywhere] ${slot === value.slot ? 'border-[#0967ff] bg-blue-50 text-[#0967ff]' : 'border-[#e2eaf5] text-[#60708c]'}`}>{value.slot}</button>)}</div>}
      {!loading && !error && !available.length && <p className="mt-3 rounded-xl bg-[#f4f8fe] p-3 text-sm font-medium leading-5 text-[#73819a]">No times available on this date. Try another day.</p>}
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">{error}</p>}
      <button disabled={!slot || loading} onClick={() => navigate('booking-checkout', { booking: { service, date: available.find(value => value.slot === slot)?.date || date, slot } satisfies BookingDraft })} className="mt-6 w-full rounded-xl bg-[#0967ff] px-3 py-3.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Continue to booking <ArrowRight size={15} className="ml-1 inline" /></button>
    </aside>
    {preview && <ServiceDetailsDialog service={preview} onClose={() => setPreview(null)} onSelect={() => { chooseService(preview); setPreview(null) }} />}
  </div>
}

function ServiceDetailsDialog({ service, onClose, onSelect }: { service: LiveService; onClose: () => void; onSelect: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close() }, [])
  return <dialog ref={dialog} aria-labelledby="service-preview-title" onCancel={event => { event.preventDefault(); onClose() }} onClick={event => { if (event.target === event.currentTarget) onClose() }} className="fixed max-h-[85dvh] w-[calc(100%-48px)] max-w-[600px] overflow-y-auto rounded-[24px] border-0 bg-white p-6 text-[#102044] shadow-2xl backdrop:bg-[#071b52]/45">
    <div className="flex items-start justify-between gap-4"><h2 id="service-preview-title" className="min-w-0 text-2xl font-black [overflow-wrap:anywhere]">{service.name}</h2><button autoFocus onClick={onClose} aria-label="Close service details" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f4f8fe] text-[#64738e]"><X size={19} /></button></div>
    <div className="mt-5 h-44 overflow-hidden rounded-2xl bg-[#f4f8fe]"><ResilientImage src={service.image} alt="" className="h-full w-full object-contain" fallback={<div className="grid h-full w-full place-items-center text-2xl font-black text-[#6683b0]">{initials(service.name)}</div>}/></div>
    <p className="mt-5 whitespace-pre-line text-sm font-medium leading-7 text-[#64738e] [overflow-wrap:anywhere]">{service.description}</p>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-blue-100 pt-5"><p className="text-xl font-black text-[#0967ff]">{money(service.price)}</p><button onClick={onSelect} className="rounded-xl bg-[#0967ff] px-5 py-3 text-sm font-bold text-white">Select service</button></div>
  </dialog>
}

export function LiveDesktopCheckout({ params, navigate }: { params: any; navigate: Navigate }) {
  const data = useHelpyData(); const draft = (params?.booking || params) as BookingDraft; const [selected, setSelected] = useState<LiveAddress | undefined>(params?.address || draft?.address || data.addresses.find(item => Boolean(item.raw.is_default)) || data.addresses[0]); const [notes, setNotes] = useState('')
  const [checking, setChecking] = useState(false)
  const [verified, setVerified] = useState(false)
  const [checkError, setCheckError] = useState('')
  useEffect(() => { if (!selected && data.addresses.length) setSelected(data.addresses[0]) }, [data.addresses, selected])
  useEffect(() => { setVerified(false); setCheckError('') }, [draft?.service?.serviceVendorMapId, draft?.date, draft?.slot, selected?.id])
  const checkBooking = async () => {
    if (!draft?.service || !selected) { setCheckError('Choose a saved address first.'); return }
    const slotStart = draft.slot.split('-')[0]?.trim()
    const clock = /^(\d{1,2}):(\d{2})$/.exec(slotStart || '')
    const hour = clock ? Number(clock[1]) : NaN
    const startTime = clock && hour >= 0 && hour < 24 ? `${String(hour % 12 || 12).padStart(2, '0')}:${clock[2]} ${hour >= 12 ? 'PM' : 'AM'}` : ''
    if (!startTime) { setCheckError('The selected time could not be checked. Choose another slot.'); return }
    setChecking(true); setVerified(false); setCheckError('')
    try {
      await helpyApi.checkSlotAvailability({ vendorId: draft.service.vendorId, serviceVendorMapId: draft.service.serviceVendorMapId, date: draft.date, startTime })
      await helpyApi.bookingPreflight(draft.service.price)
      setVerified(true)
    } catch (cause) { setCheckError(cause instanceof Error ? cause.message : 'Unable to verify this booking.') }
    finally { setChecking(false) }
  }
  if (!draft?.service) return <State empty="The booking draft is missing. Return to services and choose an available slot."/>
  if (!hasHelpyUserSession()) return <div><Heading eyebrow="SIGN IN REQUIRED" title="Keep your booking details safe" copy="Sign in to load your saved addresses and continue to the final review."/><button onClick={() => navigate('login')} className="mt-7 rounded-xl bg-[#0967ff] px-6 py-4 text-sm font-black text-white">Sign in to continue</button></div>
  return <div><Heading eyebrow="BOOKING REVIEW" title="Review every detail" copy="Nothing is submitted or charged on this screen."/><div className="mt-8 grid gap-7 xl:grid-cols-[1fr_420px]"><section className="space-y-6"><div className="rounded-[26px] bg-white p-6 ring-1 ring-blue-100"><h2 className="text-lg font-black">Service and availability</h2><div className="mt-5 grid gap-3 sm:grid-cols-3"><Review label="Service" value={draft.service.name}/><Review label="Date" value={readableDate(draft.date)}/><Review label="Time" value={draft.slot}/></div></div><div className="rounded-[26px] bg-white p-6 ring-1 ring-blue-100"><div className="flex items-center justify-between"><h2 className="text-lg font-black">Service address</h2><button onClick={() => navigate('addresses')} className="text-sm font-black text-[#0967ff]">Manage addresses</button></div>{data.accountLoading ? <p className="mt-4">Loading addresses…</p> : data.addresses.length ? <div className="mt-4 grid gap-3">{data.addresses.map(address => <button key={address.id} onClick={() => setSelected(address)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${selected?.id === address.id ? 'border-[#0967ff] bg-blue-50' : 'border-[#e4ebf5]'}`}><MapPin className="text-[#0967ff]"/><span className="flex-1"><span className="block text-sm font-black">{address.title}</span><span className="mt-1 block text-xs font-semibold text-[#73819a]">{address.address}</span></span>{selected?.id === address.id && <Check size={18} className="text-[#0967ff]"/>}</button>)}</div> : <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-700">No saved address was returned by the backend. Add one in Saved locations before continuing.</div>}<label className="mt-5 block text-sm font-black">Notes for the provider<textarea value={notes} onChange={event => setNotes(event.target.value)} className="mt-2 h-24 w-full resize-none rounded-xl bg-[#f5f8fd] p-4 text-sm font-semibold outline-none" placeholder="Optional access or arrival instructions"/></label></div></section><aside className="h-fit rounded-[28px] bg-[#071b52] p-7 text-white"><p className="text-xs font-black uppercase tracking-[.15em] text-blue-200">Final summary</p><h2 className="mt-3 text-2xl font-black">{draft.service.name}</h2><p className="mt-1 text-sm font-bold text-blue-100">{draft.service.provider}</p><div className="my-6 border-t border-white/15"/><div className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-blue-100">Service price</span><strong>{money(draft.service.price)}</strong></div><div className="flex justify-between"><span className="text-blue-100">Date</span><strong>{readableDate(draft.date)}</strong></div><div className="flex justify-between"><span className="text-blue-100">Time</span><strong>{draft.slot}</strong></div><div className="flex justify-between"><span className="text-blue-100">Address</span><strong className="max-w-[210px] text-right">{selected?.title || 'Required'}</strong></div></div><div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm leading-6 text-blue-100">The production booking and payment endpoints are intentionally not called. This is the complete pre-finalisation state.</div><button onClick={() => void checkBooking()} disabled={checking || !selected} className="mt-5 w-full rounded-xl bg-white px-4 py-4 text-sm font-black text-[#071b52] disabled:cursor-not-allowed disabled:opacity-50">{checking ? 'Checking…' : 'Check slot and payment readiness'}</button>{checkError && <p role="alert" className="mt-3 text-sm font-bold text-red-200">{checkError}</p>}{verified && <p role="status" className="mt-3 text-sm font-bold text-emerald-200">This slot is available. The displayed price was checked against wallet coverage, but no final total or booking was confirmed.</p>}<button disabled className="mt-3 w-full cursor-not-allowed rounded-xl bg-white/20 py-4 text-sm font-black text-white">Finalise booking (not enabled)</button></aside></div></div>
}

export function LiveDesktopBookings({ screen, params, navigate }: { screen: Screen; params: any; navigate: Navigate }) {
  const data = useHelpyData()
  const bookingId = screen === 'order-detail' ? String(params?.id || params?.booking?.id || '') : ''
  const listBooking = data.bookings.find(item => item.id === bookingId) || params?.booking as LiveBooking | undefined
  const [detail, setDetail] = useState<LiveBooking | undefined>()
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    if (!bookingId || !hasHelpyUserSession()) return
    let active = true
    setDetail(undefined)
    setDetailError('')
    setDetailLoading(true)
    void helpyApi.getBookingDetails(bookingId)
      .then(rows => { if (active) setDetail(rows[0] ? mapBooking(rows[0], listBooking?.status || 'Booking') : undefined) })
      .catch(cause => { if (active) setDetailError(cause instanceof Error ? cause.message : 'Unable to load booking details.') })
      .finally(() => { if (active) setDetailLoading(false) })
    return () => { active = false }
  }, [bookingId])

  if (!hasHelpyUserSession()) return <SignInState navigate={navigate} title="Sign in to see your bookings"/>

  if (screen === 'orders') return <div>
    <Heading title="My bookings"/>
    {data.accountLoading && !data.bookings.length ? <div className="mt-8"><State loading/></div> : data.bookings.length ?
      <div className="mt-8 grid gap-4 lg:grid-cols-2">{data.bookings.map(item =>
        <button key={item.id} onClick={() => navigate('order-detail', { id: item.id })} className="rounded-[24px] border border-blue-100 bg-white p-5 text-left transition hover:border-[#0967ff] hover:shadow-md">
          <div className="flex items-start gap-4">
            <ResilientImage src={item.image} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover" fallback={<span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-blue-50 text-sm font-black text-[#0967ff]">{initials(item.provider)}</span>}/>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-bold text-[#667894]">{item.provider}</p><h2 className="mt-1 truncate text-lg font-black">{item.service}</h2><p className="mt-1 text-xs font-semibold text-[#8190aa]">Booking #{item.reference || item.id}</p></div>
            <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-[#0967ff]">{item.status}</span>
          </div>
          <div className="mt-5 grid gap-2 border-t border-blue-50 pt-4 text-sm font-semibold text-[#60718c] sm:grid-cols-2">
            <span>{bookingDate(item.date)} · {item.time || 'Time not provided'}</span>
            <span className="truncate sm:text-right">{item.address || 'Address not provided'}</span>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm"><strong>{money(item.price)}</strong><span className="font-black text-[#0967ff]">View details <ArrowRight size={15} className="inline"/></span></div>
        </button>)}</div> : <div className="mt-8"><State empty="No bookings were returned for this account."/></div>}
  </div>

  const selected = detail || listBooking
  return <div>
    <button onClick={() => navigate('orders')} className="mb-6 inline-flex items-center gap-2 text-sm font-black text-[#5d6c8b] hover:text-[#0967ff]"><ChevronLeft size={18}/> Back to bookings</button>
    {!bookingId ? <State empty="No booking was selected. Return to My bookings and choose one."/> : !selected && detailLoading ? <State loading/> : !selected ? <State error={detailError || 'This booking could not be found.'}/> : <>
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-[#7185a5]">Booking #{selected.reference || selected.id}</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{selected.service}</h1><p className="mt-2 text-sm font-semibold text-[#61718e]">{selected.provider}</p></div><span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-[#0967ff]">{selected.status}</span></div>
      {detailError && <p className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">Latest details could not be loaded. Showing the booking from your list. {detailError}</p>}
      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)]">
        <div className="space-y-6">
          <section className="rounded-[26px] bg-white p-6 ring-1 ring-blue-100"><h2 className="text-lg font-black">Appointment</h2><div className="mt-5 grid gap-4 sm:grid-cols-2"><Review label="Date" value={bookingDate(selected.date)}/><Review label="Time" value={selected.time || 'Not provided'}/></div><div className="mt-4"><Review label="Service address" value={selected.address || 'Not provided'}/></div></section>
          <section className="rounded-[26px] bg-white p-6 ring-1 ring-blue-100"><h2 className="text-lg font-black">Services booked</h2><div className="mt-4 divide-y divide-blue-50">{(selected.items.length ? selected.items : [{ name: selected.service, price: selected.price }]).map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between gap-4 py-3 text-sm"><span className="font-semibold">{item.name}</span><strong className="shrink-0">{money(item.price)}</strong></div>)}</div>{selected.requirements && <div className="mt-4 border-t border-blue-50 pt-4"><p className="text-xs font-black uppercase tracking-wide text-[#8190aa]">Booking notes</p><p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-[#52637f]">{selected.requirements}</p></div>}</section>
        </div>
        <aside className="h-fit rounded-[26px] bg-white p-6 ring-1 ring-blue-100"><h2 className="text-lg font-black">Payment summary</h2><div className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4"><span className="text-[#71809a]">Service total</span><strong>{money(selected.subtotal || selected.price)}</strong></div>{selected.discount > 0 && <div className="flex justify-between gap-4"><span className="text-[#71809a]">Discount</span><strong>−{money(selected.discount)}</strong></div>}<div className="flex justify-between gap-4 border-t border-blue-50 pt-4 text-base"><strong>Total</strong><strong>{money(selected.price)}</strong></div></div>{selected.paymentMethod && <p className="mt-5 text-sm font-semibold text-[#60718c]">Payment method: {selected.paymentMethod}</p>}{selected.paymentStatus && <p className="mt-2 text-sm font-semibold text-[#60718c]">Payment status: {selected.paymentStatus}</p>}{selected.createdAt && <p className="mt-5 border-t border-blue-50 pt-4 text-xs font-semibold text-[#8190aa]">Booked {bookingDate(selected.createdAt)}</p>}</aside>
      </div>
    </>}
  </div>
}

export function LiveDesktopAccount({ screen, navigate }: { screen: Screen; navigate: Navigate }) {
  const data = useHelpyData(); const profile = data.profile; const [editing, setEditing] = useState(false); const [saving, setSaving] = useState(false); const [message, setMessage] = useState(''); const [form, setForm] = useState({ name: '', email: '', phoneNumber: '', aboutMe: '' })
  useEffect(() => { if (profile) setForm({ name: profile.name, email: profile.email, phoneNumber: profile.phone, aboutMe: profile.about }) }, [profile])
  if (!hasHelpyUserSession()) return <SignInState navigate={navigate} title="Sign in to manage your account"/>
  if (data.accountLoading && !profile) return <State loading/>
  if (screen === 'wallet') return <div><Heading eyebrow="HELPY WALLET" title="Pay your way" copy="Balance and transactions returned by your Helpy account."/><div className="mt-8 rounded-[28px] bg-gradient-to-r from-[#0750bf] to-[#3199ff] p-8 text-white"><p className="text-sm font-bold">Available balance</p><p className="mt-3 text-5xl font-black">{money(profile?.wallet || 0)}</p></div><RawList values={data.walletHistory} empty="No wallet activity was returned."/></div>
  if (screen === 'favorites') return <div><Heading eyebrow="SAVED" title="Saved services" copy="Your favourites returned by Helpy."/><RawList values={data.favorites} empty="You have no saved services."/></div>
  if (screen === 'notifications') return <div><Heading eyebrow="UPDATES" title="Notifications" copy="Account and booking updates from Helpy."/><RawList values={data.notifications} empty="You have no notifications."/></div>
  if (screen === 'addresses') return <LiveAddresses navigate={navigate}/>
  return <div><Heading eyebrow="ACCOUNT" title="Your profile" copy="Your account details, loaded directly from Helpy."/><div className="mt-8 grid gap-6 xl:grid-cols-[360px_1fr]"><aside className="rounded-[28px] bg-[#0967ff] p-7 text-white">{profile?.image ? <img src={profile.image} alt="" className="h-20 w-20 rounded-2xl object-cover"/> : <div className="grid h-20 w-20 place-items-center rounded-2xl bg-white/15 text-2xl font-black">{initials(profile?.name || '')}</div>}<h2 className="mt-5 text-2xl font-black">{profile?.name || 'Name unavailable'}</h2><p className="mt-1 text-sm font-bold text-blue-100">{profile?.email || 'Email unavailable'}</p>{profile?.memberSince && <p className="mt-7 border-t border-white/15 pt-5 text-xs font-bold">Member since {profile.memberSince}</p>}</aside><section className="rounded-[28px] bg-white p-7 ring-1 ring-blue-100"><div className="flex items-center justify-between"><h2 className="text-xl font-black">Personal details</h2><button onClick={() => setEditing(value => !value)} className="text-sm font-black text-[#0967ff]">{editing ? 'Cancel' : 'Edit profile'}</button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Name" value={form.name} editing={editing} onChange={value => setForm(current => ({ ...current, name: value }))}/><Field label="Email" value={form.email} editing={editing} onChange={value => setForm(current => ({ ...current, email: value }))}/><Field label="Phone" value={form.phoneNumber} editing={editing} onChange={value => setForm(current => ({ ...current, phoneNumber: value }))}/><Field label="About" value={form.aboutMe} editing={editing} onChange={value => setForm(current => ({ ...current, aboutMe: value }))}/></div>{message && <p className="mt-4 text-sm font-bold text-[#0967ff]">{message}</p>}{editing && <button disabled={saving} onClick={async () => { setSaving(true); setMessage(''); try { await data.updateProfile(form); setEditing(false); setMessage('Profile updated.') } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'Unable to update profile.') } finally { setSaving(false) } }} className="mt-6 rounded-xl bg-[#0967ff] px-6 py-3 text-sm font-black text-white">{saving ? 'Saving…' : 'Save changes'}</button>}</section></div></div>
}

export function LiveBackendView({ screen, params, navigate }: { screen: Screen; params: any; navigate: Navigate }) {
  const [values, setValues] = useState<unknown[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState('')
  const service = params?.service as LiveService | undefined
  useEffect(() => {
    if (screen !== 'reviews' || !service?.serviceVendorMapId) return
    setLoading(true); setError('')
    void helpyApi.getReviews(service.serviceVendorMapId).then(setValues).catch(cause => setError(cause.message)).finally(() => setLoading(false))
  }, [screen, service?.serviceVendorMapId])
  if (screen === 'reviews') return <div><Heading eyebrow="CUSTOMER REVIEWS" title={service ? `Reviews for ${service.name}` : 'Customer reviews'} copy="Only verified review records returned by Helpy are shown."/>{loading ? <div className="mt-7"><State loading/></div> : error ? <div className="mt-7"><State error={error}/></div> : <RawList values={values} empty="No reviews were returned for this service."/>}</div>
  if (screen === 'booking-success') return <div><Heading eyebrow="NOT SUBMITTED" title="This booking has not been finalised" copy="The website intentionally stops at the final review. No order or payment has been created."/><button onClick={() => navigate('all-services')} className="mt-7 rounded-xl bg-[#0967ff] px-6 py-4 text-sm font-black text-white">Return to services</button></div>
  return <div><Heading eyebrow={screen === 'chat' || screen === 'chat-thread' ? 'MESSAGES' : 'HELPY'} title={screen === 'chat' || screen === 'chat-thread' ? 'Your conversations' : 'Information'} copy="No fabricated records are displayed. This view will populate when its authenticated backend contract is available."/><div className="mt-7"><State empty="No backend records are available for this view."/></div></div>
}

export function LiveMessages({ params, navigate }: { params: any; navigate: Navigate }) {
  const [users, setUsers] = useState<ChatUser[]>([]); const [activeId, setActiveId] = useState(String(params?.peerId || '')); const [messages, setMessages] = useState<ChatMessage[]>([]); const [ownId, setOwnId] = useState(''); const [query, setQuery] = useState(''); const [draft, setDraft] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState('')
  const loadUsers = async () => { const [rows, id] = await Promise.all([helpyChat.getUsers(), helpyChat.currentUserId()]); setUsers(rows); setOwnId(id); setActiveId(current => current || rows[0]?.id || '') }
  useEffect(() => { if (!hasHelpyUserSession() || !helpyChat.configured) { setLoading(false); return } void loadUsers().catch(cause => setError(cause.message)).finally(() => setLoading(false)) }, [])
  useEffect(() => {
    if (!activeId || !helpyChat.configured) return
    let live = true
    const refresh = () => void helpyChat.getMessages(activeId).then(rows => { if (live) { setMessages(rows); setError('') } }).catch(cause => { if (live) setError(cause.message) })
    refresh(); const timer = window.setInterval(refresh, 5000)
    return () => { live = false; window.clearInterval(timer) }
  }, [activeId])
  const send = async () => { const body = draft.trim(); if (!body || !activeId) return; setDraft(''); try { await helpyChat.sendMessage(activeId, body); setMessages(await helpyChat.getMessages(activeId)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to send message.') } }
  const shown = users.filter(user => `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase())); const active = users.find(user => user.id === activeId)
  if (!hasHelpyUserSession()) return <SignInState navigate={navigate} title="Sign in to open your messages"/>
  return <div><Heading eyebrow="MESSAGES" title="Conversations that keep things moving" copy="The existing Helpy message design, connected through the APK's Firestore chat model."/><div className="mt-7 grid min-h-[620px] overflow-hidden rounded-[28px] border border-blue-100 bg-white shadow-sm lg:grid-cols-[390px_1fr]"><section className="border-r border-[#e8eef7]"><div className="p-4"><div className="relative"><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8290a9]"/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search conversations" className="h-11 w-full rounded-xl bg-[#f5f8fd] pl-10 pr-3 text-sm font-semibold outline-none"/></div></div><div className="border-t border-[#edf1f7]">{shown.map(user => <button key={user.id} onClick={() => setActiveId(user.id)} className={`flex w-full gap-3 border-b border-[#edf1f7] p-4 text-left transition ${activeId === user.id ? 'bg-blue-50' : 'hover:bg-blue-50/50'}`}>{user.image ? <img src={user.image} alt="" className="h-12 w-12 rounded-2xl object-cover"/> : <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0967ff] text-xs font-black text-white">{initials(user.name)}</span>}<span className="min-w-0 flex-1"><span className="flex items-center justify-between"><span className="truncate text-sm font-black">{user.name}</span>{user.online && <span className="h-2 w-2 rounded-full bg-emerald-400"/>}</span><span className="mt-1 block truncate text-xs font-semibold text-[#75839d]">{user.about || user.email}</span></span></button>)}{loading && <p className="p-6 text-sm font-bold text-[#75839d]">Connecting to messages…</p>}{!loading && !shown.length && <p className="p-6 text-sm font-bold text-[#75839d]">No conversations are available.</p>}</div></section><section className="flex min-h-[560px] flex-col bg-[#fbfcff]">{active ? <><header className="flex items-center gap-3 border-b border-[#e8eef7] bg-white p-4">{active.image ? <img src={active.image} alt="" className="h-11 w-11 rounded-xl object-cover"/> : <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#0967ff] text-xs font-black text-white">{initials(active.name)}</span>}<div><p className="text-sm font-black">{active.name}</p><p className="text-xs font-bold text-[#75839d]">{active.online ? 'Online' : 'Helpy business'}</p></div></header><div className="flex-1 space-y-4 overflow-auto p-5">{messages.map(message => <div key={message.id} className={`flex ${message.fromId === ownId ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm font-semibold leading-6 ${message.fromId === ownId ? 'rounded-br-md bg-[#0967ff] text-white' : 'rounded-bl-md bg-white text-[#465573] shadow-sm ring-1 ring-[#e7edf7]'}`}><p>{message.body}</p></div></div>)}</div><div className="border-t border-[#e8eef7] bg-white p-4"><div className="flex gap-2 rounded-2xl bg-[#f4f8fe] p-2"><input value={draft} onChange={event => setDraft(event.target.value)} onKeyDown={event => event.key === 'Enter' && void send()} placeholder="Write a message…" className="h-10 min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold outline-none"/><button onClick={() => void send()} className="grid h-10 w-10 place-items-center rounded-xl bg-[#0967ff] text-white"><Send size={16}/></button></div></div></> : <div className="m-auto text-center"><MessageCircle className="mx-auto text-blue-300" size={32}/><p className="mt-3 font-black">Choose a conversation</p></div>}</section></div>{!helpyChat.configured && <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm font-bold text-amber-700">Messaging requires a backend-issued Firebase custom token. The APK’s embedded admin key was not copied into the website; configure <code>VITE_HELPY_CHAT_TOKEN_ENDPOINT</code> after moving token issuance to a secure server.</p>}{error && <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-bold text-red-600">{error}</p>}</div>
}

function LiveAddresses({ navigate }: { navigate: Navigate }) {
  const data = useHelpyData(); const [show, setShow] = useState(false); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [states, setStates] = useState<Array<{ id: number; name: string }>>([]); const [cities, setCities] = useState<Array<{ id: number; name: string }>>([]); const [form, setForm] = useState({ title: '', address: '', stateId: 0, cityId: 0, notes: '' })
  useEffect(() => { if (show && !states.length) void helpyApi.getStates().then(rows => setStates(rows.map(row => ({ id: row.id, name: row.name })))) }, [show, states.length])
  useEffect(() => { if (form.stateId) void helpyApi.getCities(form.stateId).then(rows => setCities(rows.map(row => ({ id: row.id, name: row.name })))) }, [form.stateId])
  return <div><Heading eyebrow="YOUR PLACES" title="Saved locations" copy="Addresses returned by your account and used during booking."/><button onClick={() => setShow(value => !value)} className="mt-6 rounded-xl bg-[#0967ff] px-5 py-3 text-sm font-black text-white">{show ? 'Close form' : 'Add address'}</button>{show && <div className="mt-5 rounded-[26px] bg-white p-6 ring-1 ring-blue-100"><div className="grid gap-4 sm:grid-cols-2"><Input label="Label" value={form.title} onChange={value => setForm(current => ({ ...current, title: value }))}/><Input label="Full address" value={form.address} onChange={value => setForm(current => ({ ...current, address: value }))}/><label className="text-sm font-black">State<select value={form.stateId} onChange={event => setForm(current => ({ ...current, stateId: Number(event.target.value), cityId: 0 }))} className="mt-2 h-12 w-full rounded-xl bg-[#f5f8fd] px-3"><option value={0}>Select state</option>{states.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-black">City<select value={form.cityId} onChange={event => setForm(current => ({ ...current, cityId: Number(event.target.value) }))} className="mt-2 h-12 w-full rounded-xl bg-[#f5f8fd] px-3"><option value={0}>Select city</option>{cities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>{error && <p className="mt-4 text-sm font-bold text-red-600">{error}</p>}<button disabled={saving || !form.title || !form.address || !form.stateId || !form.cityId} onClick={async () => { setSaving(true); setError(''); try { await data.addAddress(form); setShow(false) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to save address.') } finally { setSaving(false) } }} className="mt-5 rounded-xl bg-[#0967ff] px-6 py-3 text-sm font-black text-white disabled:opacity-40">{saving ? 'Saving…' : 'Save address'}</button></div>}<div className="mt-7 grid gap-4 md:grid-cols-2">{data.addresses.map(address => <article key={address.id} className="rounded-[22px] border border-blue-100 bg-white p-5"><MapPin className="text-[#0967ff]"/><h2 className="mt-3 font-black">{address.title}</h2><p className="mt-1 text-sm font-semibold text-[#73819a]">{address.address}</p></article>)}</div>{!data.addresses.length && !show && <div className="mt-7"><State empty="No saved addresses were returned."/></div>}</div>
}

function SignInState({ navigate, title }: { navigate: Navigate; title: string }) { return <div><Heading title={title}/><button onClick={() => navigate('login')} className="mt-7 rounded-xl bg-[#0967ff] px-6 py-4 text-sm font-black text-white">Sign in</button></div> }
function Review({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-[#f5f8fd] p-4"><p className="text-[10px] font-black uppercase tracking-wide text-[#8a97ab]">{label}</p><p className="mt-2 text-sm font-black">{value}</p></div> }
function Field({ label, value, editing, onChange }: { label: string; value: string; editing: boolean; onChange: (value: string) => void }) { return <label className="text-sm font-black">{label}<input value={value} disabled={!editing} onChange={event => onChange(event.target.value)} className="mt-2 h-12 w-full rounded-xl bg-[#f5f8fd] px-4 text-sm font-semibold disabled:text-[#65738c]"/></label> }
function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-sm font-black">{label}<input value={value} onChange={event => onChange(event.target.value)} className="mt-2 h-12 w-full rounded-xl bg-[#f5f8fd] px-4 text-sm font-semibold outline-none"/></label> }
function RawList({ values, empty }: { values: unknown[]; empty: string }) { if (!values.length) return <div className="mt-7"><State empty={empty}/></div>; return <div className="mt-7 space-y-3">{values.map((value, index) => { const row = value && typeof value === 'object' ? value as Record<string, unknown> : {}; const title = String(row.title || row.name || row.service_name || row.type || `Item ${index + 1}`); const detail = String(row.message || row.description || row.amount || row.created_at_formatted || ''); return <div key={String(row.id || index)} className="rounded-2xl bg-white p-5 ring-1 ring-blue-100"><p className="font-black">{title}</p>{detail && <p className="mt-1 text-sm font-semibold text-[#73819a]">{detail}</p>}</div> })}</div> }
