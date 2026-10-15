import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Screen } from '../context/NavContext'
import { useHelpyData, type LiveBanner } from '../context/HelpyDataContext'
import ResilientImage from './ResilientImage'

type Navigate = (screen: Screen, params?: any) => void

const bannerFallbacks: Record<string, string> = {
  'trendy media': '/assets/banner-trendy-media-no-cta.png',
  football: '/assets/banner-foot-champz-no-cta.png',
  'bubble it': '/assets/banner-bubbleit-car-care-no-cta.png',
  heritage: '/assets/banner-heritage-luxury-no-cta.png',
}

const fallbackFor = (name: string) => bannerFallbacks[name.trim().toLowerCase()]

export default function DesktopBannerCarousel({ navigate }: { navigate: Navigate }) {
  const { banners, services, loading } = useHelpyData()
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const animationRef = useRef<number | null>(null)
  const motionRef = useRef<number | null>(null)
  const isAnimatingRef = useRef(false)
  const activeRef = useRef(0)
  const pausedRef = useRef(false)
  const [active, setActive] = useState(0)
  const [visible, setVisible] = useState(() => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches ? 3 : typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches ? 2 : 1)
  const loopBanners = useMemo(() => [...banners, ...banners, ...banners, ...banners, ...banners], [banners])
  const normalizeIndex = (index: number) => banners.length * 2 + (((index % banners.length) + banners.length) % banners.length)

  const updateActive = (index: number) => {
    activeRef.current = index
    setActive(index)
  }

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1280px)')
    const tablet = window.matchMedia('(min-width: 1024px)')
    const sync = () => setVisible(desktop.matches ? 3 : tablet.matches ? 2 : 1)
    sync()
    desktop.addEventListener('change', sync)
    tablet.addEventListener('change', sync)
    return () => {
      desktop.removeEventListener('change', sync)
      tablet.removeEventListener('change', sync)
    }
  }, [])

  const scrollToBanner = (index: number, behavior: ScrollBehavior = 'smooth') => {
    const scroller = scrollerRef.current
    const target = scroller?.children[index] as HTMLElement | undefined
    if (!scroller || !target) return
    if (animationRef.current) window.cancelAnimationFrame(animationRef.current)
    if (behavior === 'auto') {
      scroller.scrollLeft = target.offsetLeft
      updateActive(index)
      return
    }
    const start = scroller.scrollLeft
    const end = target.offsetLeft
    const duration = 880
    const startedAt = performance.now()
    isAnimatingRef.current = true
    const animate = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration)
      const eased = progress < .5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2
      scroller.scrollLeft = start + (end - start) * eased
      if (progress < 1) {
        animationRef.current = window.requestAnimationFrame(animate)
        return
      }
      const reset = index < banners.length || index >= banners.length * 4 ? normalizeIndex(index) : index
      scroller.scrollLeft = (scroller.children[reset] as HTMLElement).offsetLeft
      updateActive(reset)
      isAnimatingRef.current = false
      animationRef.current = null
    }
    updateActive(index)
    animationRef.current = window.requestAnimationFrame(animate)
  }

  useEffect(() => {
    if (!banners.length) return
    banners.forEach(banner => { const image = new Image(); image.src = banner.image })
    scrollToBanner(banners.length * 2, 'auto')
    return () => {
      if (animationRef.current) window.cancelAnimationFrame(animationRef.current)
      if (motionRef.current) window.clearInterval(motionRef.current)
    }
  }, [banners])

  useEffect(() => {
    if (!banners.length) return
    window.requestAnimationFrame(() => scrollToBanner(normalizeIndex(activeRef.current), 'auto'))
  }, [visible, banners.length])

  useEffect(() => {
    if (!banners.length) return
    motionRef.current = window.setInterval(() => {
      if (!pausedRef.current && !isAnimatingRef.current) scrollToBanner(activeRef.current + 1)
    }, 4200)
    return () => {
      if (motionRef.current) window.clearInterval(motionRef.current)
      motionRef.current = null
    }
  }, [banners.length, visible])

  const move = (direction: number) => {
    if (!isAnimatingRef.current) scrollToBanner(activeRef.current + direction)
  }

  const targetFor = (banner: LiveBanner) => {
    if (banner.targetType !== 'service') return undefined
    const bannerName = banner.name.toLowerCase().replace(/[^a-z0-9]/g, '')
    return services.find(item => {
      const targetMatches = item.serviceId === banner.serviceId || item.serviceId === banner.targetId || item.serviceVendorMapId === banner.targetId
      const serviceName = `${item.name}${item.provider}`.toLowerCase().replace(/[^a-z0-9]/g, '')
      return targetMatches && Boolean(bannerName) && (serviceName.includes(bannerName) || bannerName.includes(serviceName))
    })
  }

  if (loading && !banners.length) return <section role="status" aria-label="Loading featured offers" className="h-[160px] animate-pulse rounded-[24px] bg-[#e5edfa] sm:h-[210px] lg:h-[230px] xl:h-[236px]"/>
  if (!banners.length) return null

  return <section
    className="group/carousel relative h-[160px] overflow-hidden sm:h-[210px] lg:h-[230px] xl:h-[236px]"
    aria-roledescription="carousel"
    aria-label="Featured services and offers"
    onMouseEnter={() => { pausedRef.current = true }}
    onMouseLeave={() => { pausedRef.current = false }}
    onFocusCapture={() => { pausedRef.current = true }}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) pausedRef.current = false }}
    onKeyDown={event => {
      if (event.key === 'ArrowLeft') move(-1)
      if (event.key === 'ArrowRight') move(1)
    }}
  >
    <div ref={scrollerRef} className="banner-carousel-scroller grid h-full grid-flow-col auto-cols-[100%] gap-4 overflow-x-hidden bg-transparent lg:auto-cols-[calc((100%-1rem)/2)] xl:auto-cols-[calc((100%-2rem)/3)]">
      {loopBanners.map((banner, index) => {
        const target = targetFor(banner)
        return <button
          key={`${banner.id}-${index}`}
          disabled={!target}
          onClick={() => target && navigate('service-detail', { service: target })}
          className="relative h-full min-w-0 overflow-hidden rounded-[24px] bg-[#071b52] text-left shadow-lg shadow-blue-200/50 disabled:cursor-default"
          aria-label={target ? `${banner.name}. Open offer.` : banner.name}
          aria-current={index === active ? 'true' : undefined}
          tabIndex={target && index >= active && index < active + visible ? 0 : -1}
        >
          <ResilientImage
            src={banner.image}
            fallbackSrc={fallbackFor(banner.name)}
            fallback={<span className="flex h-full w-full flex-col justify-end bg-gradient-to-br from-[#071b52] to-[#0967ff] p-6 text-white"><span className="text-xs font-bold uppercase tracking-[.16em] text-blue-200">Helpy</span><span className="mt-2 text-xl font-black">{banner.name}</span></span>}
            alt={banner.name}
            draggable={false}
            className="h-full w-full object-contain object-center sm:object-cover"
          />
          <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/15"/>
        </button>
      })}
    </div>
    <button onClick={() => move(-1)} className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-[#071b52]/55 text-white opacity-0 shadow-lg backdrop-blur-md transition duration-300 hover:bg-[#071b52]/80 focus:opacity-100 group-hover/carousel:opacity-100" aria-label="Previous banner"><ChevronLeft size={22}/></button>
    <button onClick={() => move(1)} className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-[#071b52]/55 text-white opacity-0 shadow-lg backdrop-blur-md transition duration-300 hover:bg-[#071b52]/80 focus:opacity-100 group-hover/carousel:opacity-100" aria-label="Next banner"><ChevronRight size={22}/></button>
  </section>
}
