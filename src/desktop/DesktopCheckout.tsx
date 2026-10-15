import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Check, MapPin } from 'lucide-react'
import { hasHelpyUserSession, helpyApi, type HelpyPreflight, type HelpyPromo } from '../api/helpy'
import { mapService, useHelpyData, type LiveService } from '../context/HelpyDataContext'
import type { Screen } from '../context/NavContext'

type Navigate = (screen: Screen, params?: any) => void
type PaymentMethod = 'wallet' | 'online' | 'wallet,online' | 'cash' | 'wallet,cash'
type DraftState = { notes: string; addressId: string; paymentMethod: PaymentMethod; promoCode: string }

const money = (amount: number) => `QAR ${amount.toFixed(2)}`
const draftKey = (id: number, date: string, slot: string) => `helpy_checkout_${id}_${date}_${slot}`
const readDraft = (key: string): DraftState => {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(key) || 'null') as DraftState | null
    if (stored && typeof stored.notes === 'string') return stored
  } catch { /* Ignore stale draft data. */ }
  return { notes: '', addressId: '', paymentMethod: 'online', promoCode: '' }
}

export default function DesktopCheckout({ params, navigate }: { params: any; navigate: Navigate }) {
  const data = useHelpyData()
  const initial = params?.booking || params || {}
  const serviceId = Number(initial?.serviceVendorMapId || initial?.service?.serviceVendorMapId || 0)
  const date = String(initial?.date || '')
  const slot = String(initial?.slot || '')
  const key = draftKey(serviceId, date, slot)
  const [service, setService] = useState<LiveService | null>(initial?.service || data.services.find(item => item.serviceVendorMapId === serviceId) || null)
  const [serviceLoading, setServiceLoading] = useState(false)
  const [serviceError, setServiceError] = useState('')
  const [serviceReload, setServiceReload] = useState(0)
  const [draft, setDraft] = useState<DraftState>(() => readDraft(key))
  const [promoInput, setPromoInput] = useState(() => readDraft(key).promoCode)
  const [promo, setPromo] = useState<HelpyPromo | null>(null)
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoError, setPromoError] = useState('')
  const [cashAvailable, setCashAvailable] = useState(false)
  const [cashLoading, setCashLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [preflight, setPreflight] = useState<HelpyPreflight | null>(null)
  const [checkError, setCheckError] = useState('')
  const selected = data.addresses.find(item => item.id === (draft.addressId || String(initial?.addressId || initial?.address?.id || ''))) || data.selectedAddress || data.addresses[0]
  const bookingType = Number(service?.raw.booking_type_id || (service?.raw.booking_type as Record<string, unknown> | undefined)?.booking_type_id || (service?.raw.bookingType as Record<string, unknown> | undefined)?.booking_type_id || 0)
  const locationKind = bookingType === 1 ? 'on-premise' : bookingType === 3 ? 'doorstep' : bookingType === 2 ? 'digital' : 'service'
  const subtotal = service?.price || 0
  const discount = promo ? Math.min(subtotal, Math.round(subtotal * Number(promo.discount_percentage || 0)) / 100) : 0
  const total = Math.max(0, subtotal - discount)
  const providerLocation = String(service?.raw.address_english || service?.raw.address || '')

  useEffect(() => {
    if (!serviceId) return
    let active = true
    setServiceLoading(true); setServiceError('')
    void helpyApi.getVendorDetails(serviceId)
      .then(row => { if (active) setService(mapService(row, data.categories)) })
      .catch(cause => { if (active) setServiceError(cause instanceof Error ? cause.message : 'Unable to load this service.') })
      .finally(() => { if (active) setServiceLoading(false) })
    return () => { active = false }
  }, [serviceId, serviceReload, data.categories])

  useEffect(() => {
    setDraft(readDraft(key))
    setPromoInput(readDraft(key).promoCode)
    setPreflight(null)
  }, [key])
  useEffect(() => { window.sessionStorage.setItem(key, JSON.stringify(draft)) }, [draft, key])
  useEffect(() => {
    if (!service?.vendorId || !hasHelpyUserSession()) return
    let active = true
    setCashLoading(true)
    void helpyApi.checkCashAvailable(service.vendorId)
      .then(value => { if (active) setCashAvailable(Boolean(value?.isCashEnabled)) })
      .catch(() => { if (active) setCashAvailable(false) })
      .finally(() => { if (active) setCashLoading(false) })
    return () => { active = false }
  }, [service?.vendorId])
  useEffect(() => {
    if (!draft.promoCode || !serviceId || !hasHelpyUserSession()) return
    let active = true
    void helpyApi.validatePromoCode(draft.promoCode, serviceId)
      .then(value => { if (active) setPromo(value) })
      .catch(() => { if (active) { setPromo(null); setDraft(current => ({ ...current, promoCode: '' })) } })
    return () => { active = false }
  }, [serviceId])
  useEffect(() => { setPreflight(null); setCheckError('') }, [serviceId, date, slot, selected?.id, draft.paymentMethod, promo?.promo_code_id])

  const applyPromo = async () => {
    if (!serviceId || !promoInput.trim()) return
    setPromoLoading(true); setPromoError('')
    try {
      const result = await helpyApi.validatePromoCode(promoInput.trim(), serviceId)
      setPromo(result)
      setDraft(current => ({ ...current, promoCode: result.promo_code }))
    } catch (cause) { setPromoError(cause instanceof Error ? cause.message : 'This code could not be applied.') }
    finally { setPromoLoading(false) }
  }

  const checkBooking = async () => {
    if (!service || !selected) { setCheckError('Choose a saved address before continuing.'); return }
    if (!date || !slot) { setCheckError('Choose a date and time for this service.'); return }
    const start = slot.split('-')[0]?.trim()
    const clock = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i.exec(start || '')
    if (!clock) { setCheckError('This time could not be checked. Choose another slot.'); return }
    const hour = Number(clock[1])
    const amPm = clock[3]?.toUpperCase() || (hour >= 12 ? 'PM' : 'AM')
    const startTime = `${String(hour % 12 || 12).padStart(2, '0')}:${clock[2]} ${amPm}`
    setChecking(true); setPreflight(null); setCheckError('')
    try {
      await helpyApi.checkSlotAvailability({ vendorId: service.vendorId, serviceVendorMapId: service.serviceVendorMapId, date, startTime })
      const result = await helpyApi.bookingPreflight(total, draft.paymentMethod)
      setPreflight(result)
    } catch (cause) { setCheckError(cause instanceof Error ? cause.message : 'Unable to verify this booking.') }
    finally { setChecking(false) }
  }

  const methods = useMemo<Array<{ id: PaymentMethod; title: string; detail: string }>>(() => [
    { id: 'online', title: 'Pay online', detail: 'Secure checkout with the available payment provider' },
    { id: 'wallet', title: 'Helpy wallet', detail: `Available balance: ${money(data.profile?.wallet || 0)}` },
    { id: 'wallet,online', title: 'Wallet + online', detail: 'Use your balance and pay the remainder online' },
    ...(cashAvailable ? [
      { id: 'cash' as const, title: 'Pay cash', detail: 'Pay the provider when the service is delivered' },
      { id: 'wallet,cash' as const, title: 'Wallet + cash', detail: 'Use your balance and pay the remainder in cash' },
    ] : []),
  ], [cashAvailable, data.profile?.wallet])

  useEffect(() => {
    if (cashLoading || cashAvailable) return
    setDraft(current => current.paymentMethod.includes('cash') ? { ...current, paymentMethod: 'online' } : current)
  }, [cashLoading, cashAvailable])

  if (!serviceId || !date || !slot) return <div className="rounded-2xl bg-white p-8 text-center"><h1 className="text-2xl font-black">Choose a service and time first</h1><button onClick={() => navigate('all-services')} className="mt-5 rounded-xl bg-[#0967ff] px-5 py-3 text-sm font-bold text-white">Browse services</button></div>
  if (serviceLoading || (!service && !serviceError)) return <div role="status" aria-label="Loading booking details" className="mx-auto max-w-6xl animate-pulse"><div className="h-9 w-64 rounded bg-[#e5edfa]"/><div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"><div className="space-y-5">{[0, 1, 2].map(index => <div key={index} className="h-44 rounded-[24px] bg-white ring-1 ring-blue-100"/>)}</div><div className="h-64 rounded-[24px] bg-[#dce7f7]"/></div></div>
  if (serviceError) return <div role="alert" className="rounded-2xl bg-white p-8 text-center"><p>We could not verify the latest service details. {serviceError}</p><button onClick={() => setServiceReload(value => value + 1)} className="mt-5 rounded-xl bg-[#0967ff] px-5 py-3 text-sm font-bold text-white">Try again</button></div>
  if (!service) return <div role="alert" className="rounded-2xl bg-white p-8 text-center"><p>{serviceError || 'This service is no longer available.'}</p><button onClick={() => navigate('all-services')} className="mt-5 text-sm font-bold text-[#0967ff]">Browse services</button></div>
  if (!hasHelpyUserSession()) return <div className="mx-auto max-w-xl rounded-2xl bg-white p-8"><h1 className="text-3xl font-black">Sign in to continue</h1><p className="mt-3 text-sm text-[#64738e]">Your chosen service and time will be here when you return.</p><button onClick={() => navigate('login')} className="mt-6 rounded-xl bg-[#0967ff] px-6 py-3 text-sm font-bold text-white">Sign in</button></div>

  return <div className="mx-auto max-w-6xl">
    <h1 className="text-3xl font-black tracking-tight">Review your booking</h1>
    <p className="mt-2 text-sm text-[#64738e]">Check the details and how you want to pay.</p>
    <div className="mt-7 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-5">
        <section className="rounded-[24px] border border-blue-100 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3"><h2 className="text-lg font-black">Service and time</h2><button onClick={() => navigate('service-detail', { serviceVendorMapId: serviceId })} className="text-sm font-bold text-[#0967ff]">Change</button></div>
          <p className="mt-4 font-black">{service.name}</p><p className="text-sm text-[#64738e]">{service.provider}</p>
          <p className="mt-4 text-sm font-bold">{new Date(`${date}T12:00:00`).toLocaleDateString('en-QA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {slot}</p>
          {service.duration && <p className="mt-1 text-sm text-[#64738e]">Duration: {service.duration}</p>}
          <p className="mt-3 text-xs font-bold text-[#0967ff]">{locationKind === 'doorstep' ? 'Service at your address' : locationKind === 'on-premise' ? 'Visit the business' : locationKind === 'digital' ? 'Remote service' : 'Service location'}</p>
          {locationKind === 'on-premise' && providerLocation && <p className="mt-1 text-sm text-[#64738e]">{providerLocation}</p>}
          {locationKind === 'digital' && <p className="mt-1 text-sm text-[#64738e]">The business will share the details needed for your remote appointment.</p>}
        </section>
        <section className="rounded-[24px] border border-blue-100 bg-white p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-black">{locationKind === 'doorstep' ? 'Service address' : 'Saved contact address'}</h2>{locationKind !== 'doorstep' && <p className="mt-1 text-xs text-[#64738e]">Your saved address is required to complete the booking.</p>}</div><button onClick={() => navigate('addresses')} className="text-sm font-bold text-[#0967ff]">Manage</button></div>
          {data.accountLoading && !data.addresses.length ? <p className="mt-4 text-sm">Loading addresses…</p> : data.addresses.length ? <div className="mt-4 grid gap-2">{data.addresses.map(address => <button key={address.id} onClick={() => setDraft(current => ({ ...current, addressId: address.id }))} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left ${selected?.id === address.id ? 'border-[#0967ff] bg-blue-50' : 'border-blue-100'}`}><MapPin size={18} className="text-[#0967ff]"/><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{address.title}</span><span className="block text-xs text-[#64738e]">{address.address}</span></span>{selected?.id === address.id && <Check size={17} className="text-[#0967ff]"/>}</button>)}</div> : <p className="mt-4 text-sm text-amber-700">Add a saved address to continue.</p>}
          <label className="mt-5 block text-sm font-bold">Instructions for the business<textarea value={draft.notes} onChange={event => setDraft(current => ({ ...current, notes: event.target.value }))} maxLength={1000} placeholder="Access details or anything else the business should know" className="mt-2 h-24 w-full resize-none rounded-xl border border-blue-100 p-3 text-sm outline-none focus:border-[#0967ff]"/></label>
        </section>
        <section className="rounded-[24px] border border-blue-100 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-black">Promo code</h2>
          <div className="mt-3 flex gap-2"><input value={promoInput} onChange={event => setPromoInput(event.target.value)} placeholder="Enter code" className="h-11 min-w-0 flex-1 rounded-xl border border-blue-100 px-3 text-sm outline-none focus:border-[#0967ff]"/><button onClick={() => void applyPromo()} disabled={promoLoading || !promoInput.trim()} className="rounded-xl bg-[#0967ff] px-4 text-sm font-bold text-white disabled:opacity-40">{promoLoading ? 'Checking…' : 'Apply'}</button></div>
          {promo && <p className="mt-2 text-sm text-emerald-700">{promo.promo_code} applied · {promo.discount_percentage}% off <button onClick={() => { setPromo(null); setPromoInput(''); setDraft(current => ({ ...current, promoCode: '' })) }} className="ml-2 text-[#0967ff] underline">Remove</button></p>}
          {promoError && <p role="alert" className="mt-2 text-sm text-red-600">{promoError}</p>}
        </section>
        <section className="rounded-[24px] border border-blue-100 bg-white p-5 sm:p-6">
          <h2 className="text-lg font-black">How would you like to pay?</h2>
          {cashLoading && <p className="mt-2 text-xs text-[#64738e]">Checking cash availability…</p>}
          <div className="mt-4 grid gap-2">{methods.map(method => <button key={method.id} onClick={() => setDraft(current => ({ ...current, paymentMethod: method.id }))} aria-pressed={draft.paymentMethod === method.id} className={`rounded-xl border p-4 text-left ${draft.paymentMethod === method.id ? 'border-[#0967ff] bg-blue-50' : 'border-blue-100'}`}><span className="block text-sm font-bold">{method.title}</span><span className="mt-1 block text-xs text-[#64738e]">{method.detail}</span></button>)}</div>
        </section>
      </div>
      <aside className="rounded-[24px] bg-[#071b52] p-6 text-white lg:sticky lg:top-28">
        <h2 className="text-xl font-black">Price summary</h2>
        <div className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><span>Service</span><strong>{money(subtotal)}</strong></div>{promo && <div className="flex justify-between text-emerald-200"><span>Estimated discount</span><strong>−{money(discount)}</strong></div>}<div className="flex justify-between border-t border-white/20 pt-4 text-lg"><span>Estimated total</span><strong>{money(total)}</strong></div></div>
        {preflight && <div role="status" className="mt-5 rounded-xl bg-white/10 p-4 text-sm"><p>Wallet available: {money(Number(preflight.wallet_balance))}</p><p className="mt-1">Amount left after wallet: {money(Number(preflight.shortage_amount))}</p><p className="mt-3 font-bold">{Number(preflight.can_proceed) ? 'Your selected payment method can cover this amount.' : 'Your wallet needs more funds. Choose another method or add funds.'}</p></div>}
        {checkError && <p role="alert" className="mt-4 rounded-xl bg-red-500/20 p-3 text-sm">{checkError}</p>}
        <button onClick={() => void checkBooking()} disabled={checking || !selected} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 text-sm font-bold text-[#071b52] disabled:opacity-50">{checking ? 'Checking availability…' : <>Check availability and payment <ArrowRight size={15}/></>}</button>
        <p className="mt-4 text-xs leading-5 text-blue-100">Booking and payment will be enabled after the server confirms the final price and the payment route is verified.</p>
      </aside>
    </div>
  </div>
}
