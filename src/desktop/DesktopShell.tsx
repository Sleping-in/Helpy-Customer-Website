import { useEffect, useId, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  Heart,
  Home,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Search,
  Settings,
  Sparkles,
  Tag,
  UserRound,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react'

type Navigate = (screen: any, params?: any) => void

export interface DesktopNavItem {
  /** A stable identifier used for active navigation state. */
  id: string
  label: string
  icon: LucideIcon
  /** The app screen to open. Defaults to the item's id. */
  screen?: string
  /** Extra screens which should leave this item highlighted. */
  matches?: string[]
  badge?: string | number
  disabled?: boolean
}

export interface DesktopUser {
  name?: string
  email?: string
  initials?: string
  avatar?: string
}

/**
 * A layout-only desktop frame. It deliberately does not read NavContext, so it
 * can host every customer screen and stay easy to test or reuse.
 */
export interface DesktopShellProps {
  screen: string
  children: ReactNode
  navigate: Navigate
  goBack: () => void
  canGoBack: boolean
  activeTab?: string
  setActiveTab?: (tab: string) => void
  user?: DesktopUser
  notificationCount?: number
  messageCount?: number
  /** Called with the entered search term. Defaults to navigating to all-services. */
  onSearch?: (query: string) => void
  onNotificationsClick?: () => void
  onMessagesClick?: () => void
  onProfileClick?: () => void
  navItems?: DesktopNavItem[]
  sidebarItems?: DesktopNavItem[]
  hideSidebar?: boolean
  className?: string
  contentClassName?: string
}

export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  eyebrow?: ReactNode
  icon?: LucideIcon
  iconClassName?: string
  back?: { label?: string; onClick: () => void }
  breadcrumb?: Array<{ label: ReactNode; onClick?: () => void }>
  action?: ReactNode
  className?: string
}

export interface StatProps {
  label: ReactNode
  value: ReactNode
  icon?: LucideIcon
  description?: ReactNode
  change?: ReactNode
  trend?: 'up' | 'down' | 'neutral'
  tone?: 'blue' | 'violet' | 'emerald' | 'amber' | 'rose'
  className?: string
}

export interface EmptyStateProps {
  icon?: LucideIcon
  title: ReactNode
  description?: ReactNode
  action?: { label: ReactNode; onClick: () => void; icon?: LucideIcon }
  secondaryAction?: { label: ReactNode; onClick: () => void }
  className?: string
  compact?: boolean
}

const primaryNav: DesktopNavItem[] = [
  { id: 'home', label: 'Home', icon: Home, matches: ['home'] },
  { id: 'all-services', label: 'Services', icon: LayoutGrid, matches: ['all-services', 'service-detail', 'booking-checkout', 'booking-success', 'glow-checkout'] },
  { id: 'categories', label: 'Categories', icon: Tag, matches: ['categories', 'category-services'] },
  { id: 'deals', label: 'Offers', icon: Sparkles, matches: ['deals', 'offers-events'] },
]

const accountNav: DesktopNavItem[] = [
  { id: 'orders', label: 'My bookings', icon: ClipboardList, matches: ['orders', 'order-detail'] },
  { id: 'chat', label: 'Messages', icon: MessageCircle, matches: ['chat', 'chat-thread'], badge: 3 },
  { id: 'favorites', label: 'Saved', icon: Heart },
  { id: 'wallet', label: 'Wallet', icon: WalletCards },
]

const topLinks = primaryNav.slice(1)

const toneClasses = {
  blue: 'bg-blue-50 text-[#1466e8] ring-blue-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
}

const trendClasses = {
  up: 'bg-emerald-50 text-emerald-700',
  down: 'bg-rose-50 text-rose-700',
  neutral: 'bg-slate-100 text-slate-600',
}

function join(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function isItemActive(item: DesktopNavItem, screen: string, activeTab?: string) {
  return activeTab === item.id || screen === (item.screen ?? item.id) || item.matches?.includes(screen) === true
}

function initialsFrom(user?: DesktopUser) {
  if (user?.initials) return user.initials.slice(0, 2).toUpperCase()
  if (user?.name) return user.name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join('').toUpperCase()
  return 'HS'
}

function Avatar({ user, size = 'md' }: { user?: DesktopUser; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-9 w-9 text-xs' : 'h-10 w-10 text-sm'
  if (user?.avatar) {
    return <img src={user.avatar} alt="" className={join(sizeClass, 'rounded-full object-cover ring-2 ring-white shadow-sm')} />
  }
  return (
    <span className={join(sizeClass, 'inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#1466e8] to-[#63a2ff] font-extrabold text-white shadow-sm')}>
      {initialsFrom(user)}
    </span>
  )
}

function NavigationItem({
  item,
  active,
  compact = false,
  onClick,
}: {
  item: DesktopNavItem
  active: boolean
  compact?: boolean
  onClick: () => void
}) {
  const Icon = item.icon
  return (
    <button
      type="button"
      title={compact ? item.label : undefined}
      disabled={item.disabled}
      onClick={onClick}
      className={join(
        'group relative flex w-full items-center rounded-2xl text-left transition duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-45',
        compact ? 'h-12 justify-center px-2' : 'gap-3 px-3 py-2.5',
        active ? 'bg-[#eaf2ff] text-[#1466e8] shadow-[inset_0_0_0_1px_rgba(20,102,232,.08)]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950',
      )}
    >
      <span className={join('relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition', active ? 'bg-white text-[#1466e8] shadow-sm' : 'text-slate-500 group-hover:bg-white group-hover:text-slate-800')}>
        <Icon size={18} strokeWidth={active ? 2.5 : 2} />
        {item.badge !== undefined && item.badge !== 0 && (
          <span className="absolute -right-2 -top-2 min-w-[18px] rounded-full bg-[#1466e8] px-1 text-center text-[10px] font-extrabold leading-[18px] text-white ring-2 ring-white">
            {item.badge}
          </span>
        )}
      </span>
      {!compact && <span className="min-w-0 flex-1 truncate text-[13px] font-bold">{item.label}</span>}
      {!compact && active && <ChevronRight size={15} aria-hidden="true" />}
    </button>
  )
}

/** A flexible desktop page heading with optional breadcrumbs, back affordance and action slot. */
export function PageHeader({ title, description, eyebrow, icon: Icon, iconClassName, back, breadcrumb, action, className }: PageHeaderProps) {
  return (
    <section className={join('flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between', className)}>
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-400">
            {breadcrumb.map((item, index) => (
              <span key={`${index}-${String(item.label)}`} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight size={13} aria-hidden="true" />}
                {item.onClick ? (
                  <button type="button" onClick={item.onClick} className="rounded text-slate-500 transition hover:text-[#1466e8] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">{item.label}</button>
                ) : <span>{item.label}</span>}
              </span>
            ))}
          </nav>
        )}
        {back && (
          <button type="button" onClick={back.onClick} className="mb-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-extrabold text-slate-500 transition hover:text-[#1466e8] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200">
            <ArrowLeft size={15} /> {back.label ?? 'Back'}
          </button>
        )}
        <div className="flex items-start gap-3">
          {Icon && (
            <span className={join('mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#eaf2ff] text-[#1466e8] ring-1 ring-blue-100', iconClassName)}>
              <Icon size={21} strokeWidth={2.25} />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="mb-1 text-[11px] font-black uppercase tracking-[.16em] text-[#1466e8]">{eyebrow}</p>}
            <h1 className="text-balance text-2xl font-black tracking-[-0.045em] text-[#101b3b] sm:text-[30px]">{title}</h1>
            {description && <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
          </div>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </section>
  )
}

/** A neutral stat card for account and dashboard summaries. */
export function Stat({ label, value, icon: Icon, description, change, trend = 'neutral', tone = 'blue', className }: StatProps) {
  return (
    <article className={join('rounded-[22px] border border-slate-100 bg-white p-4 shadow-[0_8px_28px_rgba(28,56,110,0.055)] sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-extrabold uppercase tracking-[.11em] text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-black tracking-[-.04em] text-[#111c3d]">{value}</p>
        </div>
        {Icon && <span className={join('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ring-1', toneClasses[tone])}><Icon size={19} strokeWidth={2.25} /></span>}
      </div>
      {(description || change) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {change && <span className={join('rounded-full px-2 py-1 font-extrabold', trendClasses[trend])}>{change}</span>}
          {description && <span className="text-slate-500">{description}</span>}
        </div>
      )}
    </article>
  )
}

/** A calm, action-oriented placeholder for an empty list, basket, or inbox. */
export function EmptyState({ icon: Icon = Sparkles, title, description, action, secondaryAction, className, compact = false }: EmptyStateProps) {
  const ActionIcon = action?.icon ?? ChevronRight
  return (
    <section className={join('rounded-[28px] border border-dashed border-blue-100 bg-gradient-to-br from-white via-white to-[#f2f7ff] text-center shadow-[0_12px_32px_rgba(28,56,110,0.045)]', compact ? 'px-5 py-8' : 'px-6 py-12 sm:px-10 sm:py-16', className)}>
      <span className={join('mx-auto flex items-center justify-center rounded-[22px] bg-[#eaf2ff] text-[#1466e8] ring-8 ring-blue-50/70', compact ? 'h-12 w-12' : 'h-16 w-16')}>
        <Icon size={compact ? 23 : 29} strokeWidth={2.1} />
      </span>
      <h2 className={join('mt-5 font-black tracking-[-.035em] text-[#111c3d]', compact ? 'text-lg' : 'text-xl')}>{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>}
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap justify-center gap-2.5">
          {action && (
            <button type="button" onClick={action.onClick} className="inline-flex items-center gap-2 rounded-xl bg-[#1466e8] px-4 py-2.5 text-sm font-extrabold text-white shadow-[0_10px_22px_rgba(20,102,232,.22)] transition hover:bg-[#075bd6] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">
              {action.label} <ActionIcon size={16} strokeWidth={2.5} />
            </button>
          )}
          {secondaryAction && (
            <button type="button" onClick={secondaryAction.onClick} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-600 transition hover:border-blue-200 hover:text-[#1466e8] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </section>
  )
}

export function DesktopShell({
  screen,
  children,
  navigate,
  goBack,
  canGoBack,
  activeTab,
  setActiveTab,
  user,
  notificationCount = 0,
  messageCount = 0,
  onSearch,
  onNotificationsClick,
  onMessagesClick,
  onProfileClick,
  navItems = primaryNav,
  sidebarItems = accountNav,
  hideSidebar = false,
  className,
  contentClassName,
}: DesktopShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [query, setQuery] = useState('')
  const searchId = useId()

  useEffect(() => {
    setMobileMenuOpen(false)
    setProfileOpen(false)
  }, [screen])

  const navigateTo = (item: DesktopNavItem) => {
    if (item.disabled) return
    setActiveTab?.(item.id)
    navigate(item.screen ?? item.id)
  }

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const search = query.trim()
    if (!search) return
    if (onSearch) onSearch(search)
    else navigate('all-services', { query: search })
  }

  const userName = user?.name ?? 'Helpy customer'
  const allSidebarItems = [...navItems, ...sidebarItems]

  return (
    <div className={join('min-h-screen bg-[#f5f8ff] text-slate-900 selection:bg-blue-100', className)}>
      <header className="sticky top-0 z-50 border-b border-slate-200/75 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] max-w-[1680px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button type="button" onClick={() => navigate('home')} className="group flex shrink-0 items-center gap-2.5 rounded-xl pr-2 text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100" aria-label="Go to Helpy home">
            <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-[15px] bg-[#eaf2ff] shadow-sm ring-1 ring-blue-100 transition">
              <img src="/assets/helpy-logo-transparent.png" alt="" className="h-8 w-8 object-contain" />
            </span>
            <span className="hidden text-[22px] font-black tracking-[-.075em] text-[#101b3b] sm:block">helpy</span>
          </button>

          <nav aria-label="Primary navigation" className="hidden items-center gap-1 lg:flex">
            {topLinks.map((item) => {
              const Icon = item.icon
              const active = isItemActive(item, screen, activeTab)
              return (
                <button key={item.id} type="button" onClick={() => navigateTo(item)} className={join('inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] font-extrabold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100', active ? 'bg-[#eaf2ff] text-[#1466e8]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950')}>
                  <Icon size={15} strokeWidth={active ? 2.5 : 2} /> {item.label}
                </button>
              )
            })}
          </nav>

          <form onSubmit={submitSearch} className="ml-auto hidden max-w-[340px] flex-1 xl:block">
            <label htmlFor={searchId} className="sr-only">Search services</label>
            <div className="group flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 transition focus-within:border-blue-300 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-50">
              <Search size={17} className="shrink-0 text-slate-400 group-focus-within:text-[#1466e8]" />
              <input id={searchId} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for a service" className="min-w-0 flex-1 bg-transparent text-sm font-medium text-slate-700 outline-none placeholder:text-slate-400" />
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400">⌘ K</kbd>
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1.5 xl:ml-1">
            {canGoBack && (
              <button type="button" onClick={goBack} className="hidden h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-extrabold text-slate-600 transition hover:bg-slate-100 hover:text-[#1466e8] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 md:inline-flex" aria-label="Go back">
                <ArrowLeft size={16} /> Back
              </button>
            )}
            <button type="button" onClick={() => onMessagesClick ? onMessagesClick() : navigate('chat')} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-[#1466e8] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100" aria-label="Open messages">
              <MessageCircle size={19} />
              {messageCount > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#1466e8] ring-2 ring-white" />}
            </button>
            <button type="button" onClick={onNotificationsClick} className="relative flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-[#1466e8] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100" aria-label="Open notifications">
              <Bell size={19} />
              {notificationCount > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-[#1466e8] px-1 text-center text-[10px] font-black leading-[18px] text-white ring-2 ring-white">{notificationCount > 9 ? '9+' : notificationCount}</span>}
            </button>
            <div className="relative hidden sm:block">
              <button type="button" onClick={() => { setProfileOpen((value) => !value); onProfileClick?.() }} className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100" aria-expanded={profileOpen} aria-haspopup="menu">
                <Avatar user={user} size="sm" />
                <ChevronDown size={15} className="mr-1 text-slate-400" />
              </button>
              {profileOpen && (
                <div role="menu" className="absolute right-0 top-[calc(100%+10px)] w-56 overflow-hidden rounded-2xl border border-slate-100 bg-white p-1.5 shadow-[0_20px_60px_rgba(24,46,94,.18)]">
                  <div className="border-b border-slate-100 px-3 py-2.5">
                    <p className="truncate text-sm font-extrabold text-[#111c3d]">{userName}</p>
                    {user?.email && <p className="mt-0.5 truncate text-xs text-slate-400">{user.email}</p>}
                  </div>
                  <button type="button" role="menuitem" onClick={() => navigate('profile')} className="mt-1 flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-[#1466e8]"><UserRound size={16} /> Profile</button>
                  <button type="button" role="menuitem" onClick={() => navigate('settings')} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-[#1466e8]"><Settings size={16} /> Settings</button>
                  <button type="button" role="menuitem" onClick={() => navigate('login')} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-rose-600"><LogOut size={16} /> Sign out</button>
                </div>
              )}
            </div>
            {!hideSidebar && <button type="button" onClick={() => setMobileMenuOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-[#1466e8] focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 lg:hidden" aria-label="Open navigation"><Menu size={20} /></button>}
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-74px)] max-w-[1680px]">
        {!hideSidebar && (
          <aside className="sticky top-[74px] hidden h-[calc(100vh-74px)] shrink-0 border-r border-slate-200/70 bg-white/65 px-3 py-5 lg:flex lg:w-[88px] xl:w-[254px] xl:px-4" aria-label="Sidebar navigation">
            <div className="flex w-full flex-col xl:hidden">
              <nav className="space-y-1" aria-label="Service navigation">
                {navItems.map((item) => <NavigationItem key={item.id} item={item} compact onClick={() => navigateTo(item)} active={isItemActive(item, screen, activeTab)} />)}
              </nav>
              <div className="my-4 border-t border-slate-100" />
              <nav className="space-y-1" aria-label="Account navigation">
                {sidebarItems.map((item) => <NavigationItem key={item.id} item={item} compact onClick={() => navigateTo(item)} active={isItemActive(item, screen, activeTab)} />)}
              </nav>
              <div className="mt-auto hidden rounded-[22px] bg-gradient-to-br from-[#1466e8] to-[#5092ff] p-4 text-white xl:block">
                <LifeBuoy size={19} />
                <p className="mt-5 text-sm font-black leading-5">Need a hand?</p>
                <p className="mt-1 text-xs leading-5 text-blue-100">Our support team is here for you.</p>
                <button type="button" onClick={() => navigate('contact-us')} className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-white/25">Contact support</button>
              </div>
            </div>
            <div className="absolute inset-0 hidden px-4 py-5 xl:block">
              <div className="flex h-full w-full flex-col">
                <nav className="space-y-1" aria-label="Expanded service navigation">
                  {navItems.map((item) => <NavigationItem key={item.id} item={item} onClick={() => navigateTo(item)} active={isItemActive(item, screen, activeTab)} />)}
                </nav>
                <div className="my-4 border-t border-slate-100" />
                <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[.16em] text-slate-400">Your account</p>
                <nav className="space-y-1" aria-label="Expanded account navigation">
                  {sidebarItems.map((item) => <NavigationItem key={item.id} item={item} onClick={() => navigateTo(item)} active={isItemActive(item, screen, activeTab)} />)}
                </nav>
                <div className="mt-auto rounded-[22px] bg-gradient-to-br from-[#1466e8] to-[#5092ff] p-4 text-white">
                  <LifeBuoy size={19} />
                  <p className="mt-5 text-sm font-black leading-5">Need a hand?</p>
                  <p className="mt-1 text-xs leading-5 text-blue-100">Our support team is here for you.</p>
                  <button type="button" onClick={() => navigate('contact-us')} className="mt-3 rounded-xl bg-white/15 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-white/25">Contact support</button>
                </div>
              </div>
            </div>
          </aside>
        )}

        <main className="min-w-0 flex-1">
          <div className={join('mx-auto w-full max-w-[1360px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-9', contentClassName)}>{children}</div>
        </main>
      </div>

      {!hideSidebar && mobileMenuOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <button type="button" className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation" />
          <aside className="relative flex h-full w-[min(330px,calc(100%-32px))] flex-col bg-white p-5 shadow-[20px_0_60px_rgba(22,44,89,.22)]">
            <div className="mb-6 flex items-center justify-between">
              <button type="button" onClick={() => navigate('home')} className="flex items-center gap-2 text-left"><img src="/assets/helpy-logo-transparent.png" alt="Helpy" className="h-9 w-9 rounded-xl bg-[#eaf2ff] p-0.5" /><span className="text-xl font-black tracking-[-.06em] text-[#101b3b]">helpy</span></button>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Close navigation"><X size={20} /></button>
            </div>
            <form onSubmit={submitSearch} className="mb-5 xl:hidden">
              <label htmlFor={`${searchId}-mobile`} className="sr-only">Search services</label>
              <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-300 focus-within:bg-white">
                <Search size={17} className="text-slate-400" /><input id={`${searchId}-mobile`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search services" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              </div>
            </form>
            <nav className="space-y-1" aria-label="Mobile service navigation">
              {allSidebarItems.map((item, index) => (
                <div key={item.id}>
                  {index === navItems.length && <div className="my-4 border-t border-slate-100" />}
                  <NavigationItem item={item} onClick={() => navigateTo(item)} active={isItemActive(item, screen, activeTab)} />
                </div>
              ))}
            </nav>
            <button type="button" onClick={() => navigate('contact-us')} className="mt-auto flex items-center gap-2 rounded-2xl bg-[#eaf2ff] px-4 py-3 text-sm font-extrabold text-[#1466e8]"><CircleHelp size={18} /> Help & support</button>
          </aside>
        </div>
      )}
    </div>
  )
}
