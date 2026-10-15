import { useRef, useState } from 'react'
import { ArrowLeft, Bell, BriefcaseBusiness, Building2, Check, CheckCircle2, ChevronDown, DoorOpen, Home, LocateFixed, MapPin, MessageCircle, Navigation, Pencil, Phone, Plus, School, Search, X } from 'lucide-react'
import { useNav } from '../context/NavContext'
import { StatusBar } from '../components/shared'

type AddressKind = 'home' | 'work' | 'school' | 'building'
type SavedAddress = { id: number; kind: AddressKind; label: string; address: string; details: string }

const INITIAL_ADDRESSES: SavedAddress[] = [
  { id: 1, kind: 'home', label: 'Home', address: 'Viva Bahriya 10, The Pearl-Qatar', details: 'Tower 10, Floor 13, Apartment 18' },
  { id: 2, kind: 'work', label: 'Work', address: 'West Bay Tower, Doha', details: 'Floor 12, Reception' },
  { id: 3, kind: 'school', label: 'School', address: 'Education City, Al Rayyan', details: 'Gate 2, Main reception' },
  { id: 4, kind: 'building', label: 'Apartment', address: 'Lusail Marina, Lusail City', details: 'Marina Promenade, Building 7' },
]

const MAP_AREAS = [
  { label: 'Lusail', address: 'Lusail Marina, Lusail City', x: 55, y: 27 },
  { label: 'The Pearl', address: 'Viva Bahriya 10, The Pearl-Qatar', x: 59, y: 37 },
  { label: 'West Bay', address: 'West Bay Tower, Doha', x: 56, y: 46 },
  { label: 'Doha', address: 'Msheireb Downtown Doha', x: 55, y: 55 },
  { label: 'Al Rayyan', address: 'Education City, Al Rayyan', x: 48, y: 57 },
  { label: 'Airport', address: 'Hamad International Airport', x: 61, y: 67 },
  { label: 'Al Wakrah', address: 'Al Wakrah, Qatar', x: 57, y: 80 },
]

const kindIcons = { home: Home, work: BriefcaseBusiness, school: School, building: Building2 }
const blankForm = { label: '', address: '', details: '', kind: 'home' as AddressKind }

export default function LocationPickerPage() {
  const { goBack } = useNav()
  const [addresses, setAddresses] = useState(INITIAL_ADDRESSES)
  const [selected, setSelected] = useState(INITIAL_ADDRESSES[0].address)
  const [confirmed, setConfirmed] = useState(false)
  const [mapZoom, setMapZoom] = useState(1)
  const [editorOpen, setEditorOpen] = useState(false)
  const [addingLocation, setAddingLocation] = useState(false)
  const [draftLocation, setDraftLocation] = useState('Msheireb Downtown Doha')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(blankForm)
  const pinchDistanceRef = useRef<number | null>(null)
  const pinchZoomRef = useRef(1)
  const selectedSaved = addresses.find(item => item.address === selected)

  const getTouchDistance = (touches: React.TouchList) => {
    const a = touches[0]
    const b = touches[1]
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
  }

  const handleMapTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2) return
    pinchDistanceRef.current = getTouchDistance(event.touches)
    pinchZoomRef.current = mapZoom
  }

  const handleMapTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 2 || !pinchDistanceRef.current) return
    event.preventDefault()
    const nextDistance = getTouchDistance(event.touches)
    setMapZoom(Math.min(1.75, Math.max(1, pinchZoomRef.current * (nextDistance / pinchDistanceRef.current))))
  }

  const handleMapTouchEnd = () => {
    pinchDistanceRef.current = null
    pinchZoomRef.current = mapZoom
  }

  const openAdd = () => {
    setEditingId(null)
    setDraftLocation('Msheireb Downtown Doha')
    setAddingLocation(true)
  }

  const openEdit = (item: SavedAddress) => {
    setEditingId(item.id)
    setForm({ label: item.label, address: item.address, details: item.details, kind: item.kind })
    setEditorOpen(true)
  }

  const saveAddress = (nextForm = form) => {
    if (!nextForm.label.trim() || !nextForm.address.trim()) return
    if (editingId !== null) {
      const previous = addresses.find(item => item.id === editingId)
      setAddresses(items => items.map(item => item.id === editingId ? { ...item, ...nextForm } : item))
      if (previous?.address === selected) setSelected(nextForm.address)
    } else {
      setAddresses(items => [...items, { id: Date.now(), ...nextForm }])
      setSelected(nextForm.address)
    }
    setEditorOpen(false)
  }

  const confirmNewLocation = () => {
    setForm({ ...blankForm, address: draftLocation })
    setEditingId(null)
    setAddingLocation(false)
    setEditorOpen(true)
  }

  if (addingLocation) return (
    <NewLocationPicker
      value={draftLocation}
      onChange={setDraftLocation}
      onBack={() => setAddingLocation(false)}
      onConfirm={confirmNewLocation}
    />
  )

  if (editorOpen) return (
    <AddressDetailsPage
      initial={form}
      isEditing={editingId !== null}
      onBack={() => {
        setEditorOpen(false)
        if (editingId === null) setAddingLocation(true)
      }}
      onSave={saveAddress}
    />
  )

  if (confirmed) return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[#eaf5ff]">
      <img src="/assets/home-wave-background-extra-light-preview.png" alt="" className="absolute inset-0 h-full w-full object-cover object-top" />
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-7">
        <div className="flex h-20 w-20 items-center justify-center rounded-[26px] bg-white shadow-[0_16px_40px_rgba(9,103,255,0.14)]"><CheckCircle2 size={42} className="text-[#0967ff]" strokeWidth={2.3} /></div>
        <p className="mt-6 text-[23px] font-black text-[#11182d]">Location updated</p>
        <p className="mt-2 max-w-[290px] text-center text-[14px] font-semibold leading-6 text-[#69758d]">{selected}</p>
        <button onClick={goBack} className="mt-8 w-full rounded-[18px] bg-[#0967ff] py-4 text-[14px] font-black text-white shadow-[0_12px_25px_rgba(9,103,255,0.24)]">Back to Home</button>
      </div>
    </div>
  )

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[#dceeff]">
      <StatusBar />
      <div className="relative h-[292px] shrink-0 overflow-hidden bg-[#dceeff]">
        <div className="absolute inset-0" style={{ touchAction: 'none' }} onTouchStart={handleMapTouchStart} onTouchMove={handleMapTouchMove} onTouchEnd={handleMapTouchEnd} onTouchCancel={handleMapTouchEnd} onDoubleClick={() => setMapZoom(zoom => zoom > 1.2 ? 1 : 1.5)}>
          <div className="absolute inset-0 origin-center transition-transform duration-500 ease-out" style={{ transform: `scale(${mapZoom})` }}>
            <img src="/assets/qatar-map-helpy-theme.png?v=2" alt="" aria-hidden="true" className="h-full w-full object-cover" style={{ filter: 'contrast(1.13) saturate(1.12)' }} />
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-[#dceeff]/30" />
            {MAP_AREAS.map(area => {
              const active = selected === area.address
              return (
                <button key={area.address} onClick={() => setSelected(area.address)} className="absolute z-20 -translate-x-1/2 -translate-y-1/2" style={{ left: `${area.x}%`, top: `${area.y}%` }} aria-label={`Select ${area.label}`}>
                  <span className={`flex items-center justify-center rounded-full shadow-[0_5px_14px_rgba(9,103,255,0.25)] ring-[3px] ring-white transition-all ${active ? 'h-10 w-10 bg-[#0967ff] text-white' : 'h-7 w-7 bg-white text-[#0967ff]'}`} style={{ transform: `scale(${1 / mapZoom})` }}><MapPin size={active ? 19 : 14} fill={active ? 'white' : '#0967ff'} /></span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="absolute left-4 right-4 top-2 z-30 flex items-center justify-between">
          <button onClick={goBack} className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-white/95 text-[#11182d] shadow-[0_5px_18px_rgba(35,71,113,0.12)] backdrop-blur"><ArrowLeft size={20} /></button>
          <button className="flex h-11 items-center gap-2 rounded-full bg-white/95 px-4 text-[#11182d] shadow-[0_5px_18px_rgba(35,71,113,0.12)] backdrop-blur"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#8a1538] text-[11px] font-black text-white">QA</span><span className="text-[13px] font-black">Qatar</span><ChevronDown size={15} className="text-[#778298]" /></button>
        </div>
        <div className="absolute bottom-6 left-4 z-30 rounded-full bg-white/95 px-3.5 py-2 shadow-[0_5px_18px_rgba(35,71,113,0.12)] backdrop-blur"><p className="text-[11px] font-black text-[#0967ff]">Tap a pin to choose an area</p></div>
        <button onClick={() => setMapZoom(1)} className="absolute bottom-6 right-4 z-30 flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#0967ff] text-white shadow-[0_8px_18px_rgba(9,103,255,0.28)]" aria-label="Reset map view"><Navigation size={17} fill="white" /></button>
      </div>

      <section className="relative z-40 -mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-[30px] bg-[#f8fbff] shadow-[0_-10px_34px_rgba(35,71,113,0.10)]">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-[#d4dfec]" />
        <div className="flex-1 overflow-y-auto px-4 pb-3 pt-3">
          <div className="flex items-end justify-between">
            <div><p className="text-[20px] font-black tracking-[-0.35px] text-[#11182d]">Your locations</p><p className="mt-0.5 text-[11px] font-semibold text-[#7a8599]">Choose where you need the service</p></div>
            <button onClick={openAdd} className="flex items-center gap-1 rounded-full bg-[#e7f1ff] px-3 py-2 text-[11px] font-black text-[#0967ff] active:scale-95"><Plus size={14} strokeWidth={3} /> Add new</button>
          </div>

          <div className="mt-3 rounded-[20px] border border-[#dfeaf7] bg-white p-3 shadow-[0_6px_18px_rgba(35,71,113,0.06)]">
            <div className="mb-2 flex items-center justify-between"><span className="rounded-full bg-[#0967ff] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.11em] text-white">Current address</span>{selectedSaved && <button onClick={() => openEdit(selectedSaved)} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f6fc] text-[#708098]" aria-label="Edit current address"><Pencil size={14} /></button>}</div>
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] bg-[#e9f3ff] text-[#0967ff]"><MapPin size={19} fill="#0967ff" /></div>
              <div className="min-w-0 flex-1"><p className="text-[14px] font-black text-[#11182d]">{selectedSaved?.label ?? 'Selected on map'}</p><p className="mt-0.5 truncate text-[12px] font-semibold text-[#536078]">{selected}</p>{selectedSaved?.details && <p className="mt-0.5 truncate text-[11px] font-medium text-[#939caf]">{selectedSaved.details}</p>}</div>
              <CheckCircle2 size={19} className="mt-2 shrink-0 text-[#0967ff]" fill="#e7f1ff" />
            </div>
          </div>

          <p className="mb-1.5 mt-4 text-[12px] font-black uppercase tracking-[0.08em] text-[#7c879b]">Saved addresses</p>
          <div className="overflow-hidden rounded-[20px] border border-[#e2ebf5] bg-white shadow-[0_6px_18px_rgba(35,71,113,0.05)]">{addresses.map((item, index) => <AddressRow key={item.id} item={item} selected={selected === item.address} divided={index !== addresses.length - 1} onSelect={() => setSelected(item.address)} onEdit={() => openEdit(item)} />)}</div>
        </div>

        <div className="shrink-0 border-t border-[#e7eef6] bg-white/95 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur"><button onClick={() => setConfirmed(true)} className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#0967ff] py-3.5 text-[14px] font-black text-white shadow-[0_10px_22px_rgba(9,103,255,0.24)] active:scale-[0.99]">Use this location <Check size={17} strokeWidth={3} /></button></div>
      </section>

    </div>
  )
}

function AddressDetailsPage({ initial, isEditing, onBack, onSave }: { initial: typeof blankForm; isEditing: boolean; onBack: () => void; onSave: (value: typeof blankForm) => void }) {
  const [data, setData] = useState(initial)
  const [buildingNumber, setBuildingNumber] = useState('')
  const [doorNumber, setDoorNumber] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('+974 6699 3623')
  const [contactMethod, setContactMethod] = useState<'phone' | 'whatsapp'>('phone')
  const [notes, setNotes] = useState(initial.details)
  const [callOnArrival, setCallOnArrival] = useState(false)
  const [ringDoorbell, setRingDoorbell] = useState(true)

  const typeOptions: { kind: AddressKind; label: string; icon: typeof Home }[] = [
    { kind: 'home', label: 'House', icon: Home },
    { kind: 'building', label: 'Apartment', icon: Building2 },
    { kind: 'work', label: 'Office', icon: BriefcaseBusiness },
    { kind: 'school', label: 'School', icon: School },
  ]

  const handleSave = () => {
    const detailParts = [
      buildingNumber.trim() && `Building ${buildingNumber.trim()}`,
      doorNumber.trim() && `Door ${doorNumber.trim()}`,
      notes.trim(),
    ].filter(Boolean)
    onSave({ ...data, details: detailParts.join(' • ') || 'Address details provided' })
  }

  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto bg-[#f3f8ff] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <StatusBar />
      <div className="border-b border-[#e2ebf5] bg-white px-4 pb-4">
        <header className="flex items-center gap-3 pb-3 pt-1">
          <button onClick={onBack} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-[#e0e9f3] bg-[#f6f9fd] text-[#26334a] active:bg-[#edf3fa]" aria-label="Back to map"><ArrowLeft size={19} /></button>
          <div className="min-w-0 flex-1">
            <p className="text-[18px] font-black tracking-[-0.25px] text-[#11182d]">{isEditing ? 'Update this place' : 'Set Location Address'}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-[#8490a3]">Save it once and book services faster</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#edf5ff] px-2.5 py-1.5 text-[9px] font-black text-[#0967ff]">Step 2 of 2</span>
        </header>

        <div className="mb-3 flex items-center gap-2 px-1" aria-label="Location setup progress">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#dff8ed] text-[#058558]"><Check size={11} strokeWidth={3} /></span>
          <span className="text-[9px] font-bold text-[#6d7a8f]">Location selected</span>
          <span className="h-px flex-1 bg-[#dbe5f0]" />
          <span className="h-2 w-2 rounded-full bg-[#0967ff]" />
          <span className="text-[9px] font-black text-[#0967ff]">Add details</span>
        </div>

        <div className="flex items-center gap-3 rounded-[16px] border border-[#d9e7f7] bg-[#f5f9ff] p-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] bg-[#0967ff] text-white"><MapPin size={17} fill="white" /></div>
          <div className="min-w-0 flex-1"><p className="text-[8px] font-black uppercase tracking-[0.1em] text-[#7d8ba0]">Selected address</p><p className="mt-0.5 truncate text-[11px] font-black text-[#26334a]">{data.address}</p></div>
          <button onClick={onBack} className="rounded-full border border-[#cfe0f5] bg-white px-3 py-1.5 text-[9px] font-black text-[#0967ff]">Change</button>
        </div>
      </div>

      <main className="relative z-10 px-4 pb-5 pt-4">
        <section>
          <SectionTitle title="Name this place" subtitle="Create a shortcut for future bookings" />
          <div className="mt-2.5 rounded-[22px] border border-[#dfe9f4] bg-white p-3.5 shadow-[0_8px_22px_rgba(35,71,113,0.06)]">
            <label className="block">
              <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.08em] text-[#7a879b]">Place name</span>
              <input value={data.label} onChange={event => setData(current => ({ ...current, label: event.target.value }))} placeholder="My home, Studio, Mum's house..." className="w-full rounded-[14px] border border-[#dfe8f2] bg-[#f6faff] px-3.5 py-3 text-[13px] font-bold text-[#182238] outline-none focus:border-[#8fbaff] focus:ring-2 focus:ring-[#dcecff] placeholder:text-[#a0aaba]" />
            </label>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {typeOptions.map(option => {
                const Icon = option.icon
                const active = data.kind === option.kind
                return (
                  <button key={option.kind} type="button" onClick={() => setData(current => ({ ...current, kind: option.kind }))} className={`relative flex min-w-0 flex-col items-center gap-1.5 rounded-[15px] py-2.5 transition ${active ? 'bg-[#0967ff] text-white shadow-[0_7px_16px_rgba(9,103,255,0.20)]' : 'bg-[#eef5fd] text-[#66758c]'}`}>
                    {active && <span className="absolute right-1.5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[#0967ff]"><Check size={9} strokeWidth={3} /></span>}
                    <Icon size={17} /><span className="truncate text-[9px] font-black">{option.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </section>

        <section className="mt-4">
          <SectionTitle title="Help providers reach you" subtitle="Only the practical details they need on arrival" />
          <div className="mt-2.5 rounded-[22px] border border-[#dfe9f4] bg-white p-3.5 shadow-[0_8px_22px_rgba(35,71,113,0.06)]">
            <div className="grid grid-cols-2 gap-2.5">
              <CompactInput label="Building Number" value={buildingNumber} onChange={setBuildingNumber} placeholder="e.g. 18" />
              <CompactInput label="Door number" value={doorNumber} onChange={setDoorNumber} placeholder="e.g. 1204" />
            </div>
            <label className="mt-3 block">
              <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.08em] text-[#7a879b]">Access note</span>
              <textarea value={notes} onChange={event => setNotes(event.target.value)} rows={2} placeholder="Gate, landmark, parking or reception instructions" className="w-full resize-none rounded-[14px] border border-[#dfe8f2] bg-[#f6faff] px-3.5 py-3 text-[12px] font-semibold leading-5 text-[#182238] outline-none focus:border-[#8fbaff] focus:ring-2 focus:ring-[#dcecff] placeholder:text-[#a0aaba]" />
            </label>
          </div>
        </section>

        <section className="mt-4">
          <SectionTitle title="Stay reachable" subtitle="Choose how providers should contact you" />
          <div className="mt-2.5 rounded-[22px] border border-[#dfe9f4] bg-white p-3.5 shadow-[0_8px_22px_rgba(35,71,113,0.06)]">
            <label className="block">
              <span className="mb-1.5 block text-[9px] font-black uppercase tracking-[0.08em] text-[#7a879b]">Contact number</span>
              <input value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} inputMode="tel" className="w-full rounded-[14px] border border-[#dfe8f2] bg-[#f6faff] px-3.5 py-3 text-[13px] font-bold text-[#182238] outline-none focus:border-[#8fbaff] focus:ring-2 focus:ring-[#dcecff]" />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <ContactButton active={contactMethod === 'phone'} onClick={() => setContactMethod('phone')} icon={Phone} label="Phone call" />
              <ContactButton active={contactMethod === 'whatsapp'} onClick={() => setContactMethod('whatsapp')} icon={MessageCircle} label="WhatsApp" />
            </div>
          </div>
        </section>

        <section className="mt-4">
          <SectionTitle title="Arrival preferences" subtitle="Helpy will remember these for this place" />
          <div className="mt-2.5 rounded-[22px] border border-[#dfe9f4] bg-white px-3.5 shadow-[0_8px_22px_rgba(35,71,113,0.06)]">
            <PreferenceRow icon={DoorOpen} label="Call me when the provider arrives" checked={callOnArrival} onChange={setCallOnArrival} divided />
            <PreferenceRow icon={Bell} label="Ring the doorbell on arrival" checked={ringDoorbell} onChange={setRingDoorbell} />
          </div>
        </section>
      </main>

      <footer className="relative z-20 border-t border-[#dfe9f4] bg-white/95 px-4 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <button onClick={handleSave} disabled={!data.label.trim() || !data.address.trim()} className="flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#0967ff] py-3.5 text-[14px] font-black text-white shadow-[0_10px_22px_rgba(9,103,255,0.24)] active:scale-[0.99] disabled:opacity-40">{isEditing ? 'Save changes' : 'Save address'} <Check size={17} strokeWidth={3} /></button>
      </footer>
    </div>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return <div><p className="text-[15px] font-black text-[#11182d]">{title}</p><p className="mt-0.5 text-[10px] font-semibold text-[#8390a5]">{subtitle}</p></div>
}

function CompactInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="block rounded-[14px] border border-[#dfe8f2] bg-[#f6faff] px-3 py-2.5"><span className="block text-[9px] font-black text-[#748198]">{label}</span><input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="mt-1 w-full bg-transparent text-[12px] font-bold text-[#182238] outline-none placeholder:text-[#a5afbe]" /></label>
}

function ContactButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: typeof Phone; label: string }) {
  return <button type="button" onClick={onClick} className={`flex items-center justify-center gap-2 rounded-[15px] border py-3 text-[11px] font-black transition ${active ? 'border-[#0967ff] bg-[#0967ff] text-white shadow-[0_7px_16px_rgba(9,103,255,0.18)]' : 'border-[#dfe8f2] bg-[#f6faff] text-[#526078]'}`}><Icon size={16} />{label}{active && <Check size={13} strokeWidth={3} />}</button>
}

function PreferenceRow({ icon: Icon, label, checked, onChange, divided = false }: { icon: typeof Bell; label: string; checked: boolean; onChange: (value: boolean) => void; divided?: boolean }) {
  return (
    <div className={`flex items-center gap-3 py-3 ${divided ? 'border-b border-[#edf2f7]' : ''}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#edf5ff] text-[#0967ff]"><Icon size={17} /></div>
      <span className="min-w-0 flex-1 text-[11px] font-bold leading-4 text-[#354158]">{label}</span>
      <button type="button" onClick={() => onChange(!checked)} role="switch" aria-checked={checked} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${checked ? 'bg-[#0967ff]' : 'bg-[#d5deea]'}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} /></button>
    </div>
  )
}

function NewLocationPicker({ value, onChange, onBack, onConfirm }: { value: string; onChange: (value: string) => void; onBack: () => void; onConfirm: () => void }) {
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 })
  const dragStart = useRef<{ x: number; y: number; originX: number; originY: number } | null>(null)

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    dragStart.current = { x: event.clientX, y: event.clientY, originX: mapOffset.x, originY: mapOffset.y }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return
    const x = Math.max(-105, Math.min(105, dragStart.current.originX + event.clientX - dragStart.current.x))
    const y = Math.max(-145, Math.min(145, dragStart.current.originY + event.clientY - dragStart.current.y))
    setMapOffset({ x, y })
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return
    const distance = Math.hypot(event.clientX - dragStart.current.x, event.clientY - dragStart.current.y)
    dragStart.current = null
    if (distance > 12) {
      const locationIndex = Math.min(MAP_AREAS.length - 1, Math.max(0, Math.round(((mapOffset.y + 145) / 290) * (MAP_AREAS.length - 1))))
      onChange(MAP_AREAS[locationIndex].address)
    }
  }

  const useCurrentLocation = () => {
    setMapOffset({ x: 0, y: -22 })
    onChange('Viva Bahriya 10, The Pearl-Qatar')
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[#dceeff]">
      <StatusBar />
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#dceeff] touch-none" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={() => { dragStart.current = null }}>
        <img src="/assets/qatar-map-helpy-theme.png?v=2" alt="" aria-hidden="true" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover transition-transform duration-150" style={{ filter: 'contrast(1.32) saturate(1.35) brightness(.94)', transform: `translate3d(${mapOffset.x}px, ${mapOffset.y}px, 0)` }} />
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-[#cfe7fb]/20" />

        <div className="absolute left-4 right-4 top-3 z-20 flex items-center justify-between">
          <button onClick={onBack} className="flex h-11 w-11 items-center justify-center rounded-[15px] bg-white/95 text-[#11182d] shadow-[0_7px_20px_rgba(35,71,113,0.16)] backdrop-blur" aria-label="Back to saved locations"><ArrowLeft size={21} /></button>
          <div className="rounded-full bg-white/95 px-4 py-2.5 shadow-[0_7px_20px_rgba(35,71,113,0.14)] backdrop-blur">
            <p className="text-[11px] font-black text-[#0967ff]">Move the map to adjust</p>
          </div>
        </div>

        <div className="pointer-events-none absolute left-1/2 top-[45%] z-20 -translate-x-1/2 -translate-y-full">
          <div className="relative flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#0967ff] text-white shadow-[0_12px_28px_rgba(9,103,255,0.35)] ring-[6px] ring-white/95">
            <MapPin size={27} fill="white" />
            <span className="absolute -bottom-[16px] left-1/2 h-[18px] w-1.5 -translate-x-1/2 rounded-b-full bg-[#0967ff]" />
          </div>
          <div className="mx-auto mt-5 h-2.5 w-10 rounded-full bg-[#416f9d]/20 blur-[2px]" />
        </div>

        <button onPointerDown={event => event.stopPropagation()} onClick={useCurrentLocation} className="absolute bottom-5 right-4 z-20 flex h-12 w-12 items-center justify-center rounded-[17px] bg-[#0967ff] text-white shadow-[0_9px_22px_rgba(9,103,255,0.32)]" aria-label="Use current location"><LocateFixed size={21} strokeWidth={2.5} /></button>
      </div>

      <section className="relative z-30 -mt-2 shrink-0 rounded-t-[30px] bg-white px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_34px_rgba(35,71,113,0.12)]">
        <div className="mx-auto h-1 w-10 rounded-full bg-[#d6e0ec]" />
        <div className="mt-3 text-center">
          <p className="text-[22px] font-black tracking-[-0.4px] text-[#11182d]">Select location</p>
          <p className="mt-1 text-[11px] font-semibold text-[#7b869b]">Place the pin exactly where you need the service</p>
        </div>
        <label className="mt-4 flex items-center gap-2.5 rounded-[16px] border border-[#dde8f4] bg-[#f5f9ff] px-3.5 py-3.5 focus-within:border-[#8db9ff] focus-within:ring-2 focus-within:ring-[#deecff]">
          <Search size={18} className="shrink-0 text-[#7d899e]" />
          <input value={value} onChange={event => onChange(event.target.value)} placeholder="Search area, street or building" className="min-w-0 flex-1 bg-transparent text-[13px] font-bold text-[#243047] outline-none placeholder:text-[#98a2b3]" />
          {value && <button type="button" onClick={() => onChange('')} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e6edf6] text-[#79869a]" aria-label="Clear address"><X size={13} /></button>}
        </label>
        <button onClick={onConfirm} disabled={!value.trim()} className="mt-3 flex w-full items-center justify-center gap-2 rounded-[18px] bg-[#0967ff] py-3.5 text-[14px] font-black text-white shadow-[0_10px_22px_rgba(9,103,255,0.24)] active:scale-[0.99] disabled:opacity-40">Confirm location <Check size={17} strokeWidth={3} /></button>
      </section>
    </div>
  )
}

function AddressRow({ item, selected, divided, onSelect, onEdit }: { item: SavedAddress; selected: boolean; divided: boolean; onSelect: () => void; onEdit: () => void }) {
  const Icon = kindIcons[item.kind]
  return (
    <div className={`flex items-center gap-2.5 px-3 py-3 ${divided ? 'border-b border-[#edf2f7]' : ''} ${selected ? 'bg-[#f3f8ff]' : ''}`}>
      <button onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] ${selected ? 'bg-[#0967ff] text-white' : 'bg-[#eef5fd] text-[#0967ff]'}`}><Icon size={18} /></div>
        <div className="min-w-0 flex-1"><div className="flex items-center gap-1.5"><p className="text-[13px] font-black text-[#11182d]">{item.label}</p>{selected && <span className="rounded-full bg-[#dcecff] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-[#0967ff]">Selected</span>}</div><p className="mt-0.5 truncate text-[11px] font-semibold text-[#606d83]">{item.address}</p><p className="mt-0.5 truncate text-[10px] font-medium text-[#9aa3b3]">{item.details}</p></div>
      </button>
      <button onClick={onEdit} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#8b96a8] active:bg-[#edf3fa]" aria-label={`Edit ${item.label}`}><Pencil size={15} /></button>
    </div>
  )
}
