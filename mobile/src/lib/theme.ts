/** Shared Helpy Customer mobile design tokens. Visual-only — no data/API logic. */

export const colors = {
  blue: '#0967ff',
  ink: '#102044',
  muted: '#6d7c96',
  background: '#f4f8ff',
  card: '#ffffff',
  cardBorder: '#deebf8',
  cardBorderSoft: '#dce8f7',
  searchBorder: '#dce8f7',
  notificationBorder: '#e0eaf7',
  skeleton: '#e1e9f4',
  tagBackground: '#e9edf3',
  saveButtonBackground: '#f2f7ff',
  categoryTint: '#eaf3ff',
  imageFallback: '#f0f5fc',
  imageFallbackBorder: '#e6eef9',
  serviceImageBackground: '#edf5ff',
  bannerFallback: '#163d83',
  star: '#f6a800',
  heart: '#ee4266',
  unread: '#f0445f',
  sheetHandle: '#cbd7e6',
  sheetDivider: '#e5eaf1',
  chevron: '#9aa7ba',
  searchIcon: '#7d8ba1',
  placeholder: '#8a97aa',
  categoryLabel: '#2a3b5c',
  description: '#75839d',
  fromLabel: '#93a0b5',
  scrim: 'rgba(8,20,48,0.62)',
  white: '#ffffff',
} as const

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

export const radius = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 16,
  xl: 22,
  xxl: 24,
  sheet: 28,
  pill: 28,
  circle: 38,
} as const

/** Subtle card elevation used on Home service cards and Explore surfaces. */
export const cardShadow = {
  shadowColor: colors.ink,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 10,
  elevation: 2,
} as const

export const touch = {
  min: 44,
} as const
