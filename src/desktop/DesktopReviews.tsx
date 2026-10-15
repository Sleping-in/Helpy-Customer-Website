import { useEffect, useState } from 'react'
import { Star } from 'lucide-react'
import { helpyApi } from '../api/helpy'
import type { LiveService } from '../context/HelpyDataContext'

const label = (value: unknown) => value === null || value === undefined ? '' : String(value)

export default function DesktopReviews({ params }: { params: any }) {
  const service = params?.service as LiveService | undefined
  const serviceId = Number(params?.serviceVendorMapId || service?.serviceVendorMapId || 0)
  const [serviceName, setServiceName] = useState(service?.name || '')
  const [rating, setRating] = useState(0)
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<Array<Record<string, unknown>>>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  useEffect(() => {
    if (!serviceId) return
    if (service?.name) { setServiceName(service.name); return }
    let active = true
    void helpyApi.getVendorDetails(serviceId).then(row => {
      if (active) setServiceName(label(row.name_english || row.name))
    }).catch(() => { /* The reviews remain readable if the title cannot load. */ })
    return () => { active = false }
  }, [serviceId, service?.name])
  useEffect(() => { setPage(1); setItems([]) }, [serviceId, rating])
  useEffect(() => {
    if (!serviceId) return
    let active = true
    setLoading(true); setError('')
    void helpyApi.getReviewsPage(serviceId, rating, page)
      .then(result => {
        if (!active) return
        setItems(current => page === 1 ? result.data || [] : [...current, ...(result.data || [])])
        setTotal(Number(result.total_records) || 0)
      }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Unable to load reviews.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [serviceId, rating, page, reload])

  if (!serviceId) return <div className="rounded-2xl bg-white p-8 text-center">Choose a service to read its reviews.</div>
  return <div className="mx-auto max-w-4xl">
    <h1 className="text-3xl font-black">{serviceName ? `Reviews for ${serviceName}` : 'Customer reviews'}</h1>
    <p className="mt-2 text-sm text-[#64738e]">{`${total} ${total === 1 ? 'review' : 'reviews'} from Helpy customers`}</p>
    <div className="mt-6 flex flex-wrap gap-2">{[0, 5, 4, 3, 2, 1].map(value => <button key={value} onClick={() => setRating(value)} aria-pressed={rating === value} className={`rounded-xl px-4 py-2 text-sm font-bold ${rating === value ? 'bg-[#0967ff] text-white' : 'bg-white text-[#52617d] ring-1 ring-blue-100'}`}>{value ? `${value} ${value === 1 ? 'star' : 'stars'}` : 'All ratings'}</button>)}</div>
    {error && <div role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error} <button onClick={() => setReload(value => value + 1)} className="ml-2 font-bold underline">Try again</button></div>}
    {loading && !items.length && <div role="status" className="mt-6 rounded-xl bg-white p-6">Loading reviews…</div>}
    {!loading && !error && !items.length && <div className="mt-6 rounded-xl bg-white p-6">No reviews have been published for this selection.</div>}
    <div className="mt-6 space-y-3">{items.map((item, index) => {
      const score = Number(item.rating) || 0
      const image = Array.isArray(item.review_image_url) ? item.review_image_url[0] : item.review_image_url
      return <article key={label(item.review_id) || index} className="rounded-2xl border border-blue-100 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-black">{label(item.user_name) || 'Helpy customer'}</p><p className="mt-1 flex items-center gap-1 text-sm font-bold text-[#64738e]"><Star size={16} className="fill-amber-400 text-amber-400"/>{score.toFixed(1)}</p></div><time className="text-xs text-[#8290a9]">{label(item.created_at).slice(0, 10)}</time></div>
        {Boolean(item.review) && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-[#52617d]">{label(item.review)}</p>}
        {typeof image === 'string' && image && <img src={image} alt="Customer review" className="mt-4 max-h-56 rounded-xl object-contain"/>}
      </article>
    })}</div>
    {items.length < total && <button onClick={() => setPage(value => value + 1)} disabled={loading} className="mx-auto mt-6 block rounded-xl bg-[#0967ff] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? 'Loading…' : 'Load more reviews'}</button>}
  </div>
}
