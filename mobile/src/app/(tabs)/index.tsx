import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons'
import { router, useFocusEffect } from 'expo-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Animated, Easing, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { BusinessCard } from '../../components/BusinessCard'
import { beginAddAddressDraft, beginEditAddressDraft, consumePendingAddressSelection } from '../../lib/address-draft'
import { businessDistanceKm } from '../../lib/distance'
import { addressCoordinates, loadAddresses, loadHomeData, setRequestLocation, type HomeAddress, type HomeBanner, type HomeBusiness, type HomeCategory, type HomeService } from '../../lib/helpy-api'
import { readSelectedAddressId, writeSelectedAddressId } from '../../lib/session'
import { cardShadow, colors, radius, space, touch } from '../../lib/theme'
import { useSavedBusinesses } from '../../lib/use-saved-businesses'

const BLUE = colors.blue
const INK = colors.ink
const MUTED = colors.muted

const SHEET_OPEN_MS = 420
const SHEET_CLOSE_MS = 260
const SCRIM_OPEN_MS = 320
const SCRIM_CLOSE_MS = 200
const SHEET_OPEN_EASING = Easing.bezier(0.22, 1, 0.36, 1)
const SHEET_CLOSE_EASING = Easing.bezier(0.4, 0, 1, 1)

function Initials({ name }: { name: string }) {
  const letters = name.split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase() || 'H'
  return <Text style={styles.initials}>{letters}</Text>
}

function BannerCard({ banner, width, height }: { banner: HomeBanner; width: number; height: number }) {
  const [failed, setFailed] = useState(false)
  return <View accessibilityLabel={banner.name} accessibilityRole="image" style={[styles.banner, { height, width }]}>
    {banner.image && !failed ? <Image source={{ uri: banner.image }} style={styles.bannerImage} resizeMode="cover" onError={() => setFailed(true)} /> : <View style={styles.bannerFallback}><Text numberOfLines={2} style={styles.bannerFallbackTitle}>{banner.name}</Text></View>}
  </View>
}

function CategoryPill({ category, onPress }: { category: HomeCategory; onPress: () => void }) {
  const [failed, setFailed] = useState(false)
  return <Pressable accessibilityRole="button" accessibilityLabel={`Browse ${category.name}`} onPress={onPress} style={({ pressed }) => [styles.categoryItem, pressed && styles.pressed]}>
    <View style={styles.categoryImageWrap}>{category.image && !failed ? <Image source={{ uri: category.image }} style={styles.categoryImage} resizeMode="contain" onError={() => setFailed(true)} /> : <Initials name={category.name} />}</View>
    <Text numberOfLines={2} ellipsizeMode="tail" style={styles.categoryName}>{category.name}</Text>
  </Pressable>
}

function ServiceCard({ service, onPress, width }: { service: HomeService; onPress: () => void; width?: number }) {
  const [failed, setFailed] = useState(false)
  return <Pressable accessibilityRole="button" accessibilityLabel={`Open ${service.name}`} onPress={onPress} style={({ pressed }) => [styles.serviceCard, width ? { width } : null, pressed && styles.cardPressed]}>
    <View style={styles.serviceImageWrap}>{service.image && !failed ? <Image source={{ uri: service.image }} style={styles.serviceImage} resizeMode="cover" onError={() => setFailed(true)} /> : <View style={styles.serviceFallback}><Initials name={service.name} /></View>}</View>
    <View style={styles.serviceBody}>
      <Text numberOfLines={1} ellipsizeMode="tail" style={styles.serviceProvider}>{service.provider}</Text>
      <Text numberOfLines={2} ellipsizeMode="tail" style={styles.serviceName}>{service.name}</Text>
      <Text numberOfLines={2} ellipsizeMode="tail" style={styles.serviceDescription}>{service.description || service.category}</Text>
      <View style={styles.serviceMeta}>
        <View>
          <Text style={styles.fromLabel}>from</Text>
          <Text style={styles.servicePrice}>{service.price > 0 ? `QAR ${service.price.toFixed(2)}` : 'Price on Request'}</Text>
        </View>
        <View style={styles.ratingRow} accessibilityLabel={service.rating > 0 ? `Rated ${service.rating.toFixed(1)}` : 'New'}>
          <Ionicons name="star" size={12} color={colors.star} />
          <Text style={styles.rating}>{service.rating > 0 ? service.rating.toFixed(1) : 'New'}</Text>
        </View>
      </View>
    </View>
  </Pressable>
}

function SeeAllLink({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable accessibilityRole="link" accessibilityLabel={label} hitSlop={8} onPress={onPress} style={({ pressed }) => [styles.seeAllHit, pressed && styles.pressed]}>
    <Text style={styles.seeAll}>{label}</Text>
  </Pressable>
}

function HomeSkeleton({ bannerHeight, categoryColumns }: { bannerHeight: number; categoryColumns: number }) {
  const categorySlots = categoryColumns * 2
  return <View accessibilityLabel="Loading Home" accessibilityRole="progressbar" style={styles.skeletonPage}>
    <View style={[styles.skeletonBlock, styles.skeletonBanner, { height: bannerHeight }]} />
    <View style={styles.skeletonDots}>{[0, 1, 2, 3].map(index => <View key={index} style={[styles.skeletonBlock, styles.skeletonDot]} />)}</View>
    <View style={[styles.skeletonBlock, styles.skeletonTitle]} />
    <View style={styles.skeletonCategories}>{Array.from({ length: categorySlots }, (_, index) => <View key={index} style={[styles.skeletonCategory, { width: `${100 / categoryColumns}%` as `${number}%` }]}><View style={[styles.skeletonBlock, styles.skeletonCircle]} /><View style={[styles.skeletonBlock, styles.skeletonCaption]} /></View>)}</View>
    <View style={[styles.skeletonBlock, styles.skeletonTitle]} />
    {[0, 1].map(index => <View key={index} style={styles.skeletonBusiness}><View style={[styles.skeletonBlock, styles.skeletonBusinessImage]} /><View style={styles.skeletonBusinessCopy}><View style={[styles.skeletonBlock, styles.skeletonBusinessName]} /><View style={[styles.skeletonBlock, styles.skeletonBusinessMeta]} /></View></View>)}
  </View>
}

/** Opens the map-first Add Address flow. */
function onAddAddress(existing: HomeAddress[], selected: HomeAddress | undefined, closeSheet: () => void) {
  // The selected address (if it has coordinates) is the map's fallback centre when location is denied.
  beginAddAddressDraft(existing.map(item => item.title), addressCoordinates(selected))
  closeSheet()
  router.push('/add-address')
}

/** Opens the same map-first flow in edit mode. */
function onEditAddress(address: HomeAddress, closeSheet: () => void) {
  beginEditAddressDraft(address)
  closeSheet()
  router.push({ pathname: '/add-address', params: { mode: 'edit' } })
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions()
  const bannerWidth = Math.max(1, Math.min(viewportWidth - space.lg * 2, 1068))
  const bannerHeight = Math.round(Math.min(240, bannerWidth * 0.42))
  const categoryPageWidth = Math.max(1, Math.min(viewportWidth, 1100) - space.lg * 2)
  const categoryColumns = viewportWidth >= 850 ? 7 : viewportWidth >= 600 ? 6 : 4
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [banners, setBanners] = useState<HomeBanner[]>([])
  const [categories, setCategories] = useState<HomeCategory[]>([])
  const [services, setServices] = useState<HomeService[]>([])
  const [businesses, setBusinesses] = useState<HomeBusiness[]>([])
  const [addresses, setAddresses] = useState<HomeAddress[]>([])
  const [selectedAddress, setSelectedAddress] = useState<HomeAddress | undefined>()
  const [locationOpen, setLocationOpen] = useState(false)
  const [notificationUnread, setNotificationUnread] = useState(false)
  const [query, setQuery] = useState('')
  const [activeBanner, setActiveBanner] = useState(0)
  const [bannerAutoplayReset, setBannerAutoplayReset] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const savedBusinesses = useSavedBusinesses()
  const bannerRef = useRef<ScrollView | null>(null)
  const bannerScrollX = useMemo(() => new Animated.Value(0), [])
  const sheetProgress = useMemo(() => new Animated.Value(0), [])
  const scrimProgress = useMemo(() => new Animated.Value(0), [])
  const autoPlayRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) { setLoading(true); setError('') }
    try {
      const data = await loadHomeData({ force: !showSkeleton })
      setBanners(data.banners)
      setCategories(data.categories)
      setServices(data.services)
      setBusinesses(data.businesses)
      setAddresses(data.addresses)
      setNotificationUnread(data.hasUnreadNotifications)
      bannerRef.current?.scrollTo({ x: 0, animated: false })
      bannerScrollX.setValue(0)
      setActiveBanner(0)
      const storedId = await readSelectedAddressId()
      const selected = data.addresses.find(item => item.id === storedId) || data.addresses.find(item => item.isDefault) || data.addresses[0]
      setSelectedAddress(selected)
      setRequestLocation(addressCoordinates(selected))
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to load the Helpy home screen.'
      if (showSkeleton) setError(message)
      else Alert.alert('Could Not Refresh Home', message)
    } finally {
      if (showSkeleton) setLoading(false)
    }
  }, [bannerScrollX])

  useEffect(() => {
    const timer = setTimeout(() => { void load(true) }, 0)
    return () => clearTimeout(timer)
  }, [load])

  const filteredServices = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return services
    return services.filter(service => `${service.name} ${service.provider} ${service.category}`.toLowerCase().includes(value))
  }, [query, services])

  const categoryPages = useMemo(() => {
    const pages: HomeCategory[][] = []
    for (let index = 0; index < categories.length; index += categoryColumns * 2) pages.push(categories.slice(index, index + categoryColumns * 2))
    return pages
  }, [categories, categoryColumns])

  const closeLocation = useCallback(() => {
    Animated.parallel([
      Animated.timing(sheetProgress, { toValue: 0, duration: SHEET_CLOSE_MS, easing: SHEET_CLOSE_EASING, useNativeDriver: true }),
      Animated.timing(scrimProgress, { toValue: 0, duration: SCRIM_CLOSE_MS, easing: SHEET_CLOSE_EASING, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) setLocationOpen(false)
    })
  }, [scrimProgress, sheetProgress])

  useEffect(() => {
    if (!locationOpen) return
    sheetProgress.setValue(0)
    scrimProgress.setValue(0)
    Animated.parallel([
      Animated.timing(sheetProgress, { toValue: 1, duration: SHEET_OPEN_MS, easing: SHEET_OPEN_EASING, useNativeDriver: true }),
      Animated.timing(scrimProgress, { toValue: 1, duration: SCRIM_OPEN_MS, easing: SHEET_OPEN_EASING, useNativeDriver: true }),
    ]).start()
  }, [locationOpen, scrimProgress, sheetProgress])

  const selectAddress = async (address: HomeAddress) => {
    setSelectedAddress(address)
    setRequestLocation(addressCoordinates(address))
    closeLocation()
    await writeSelectedAddressId(address.id)
  }

  const dismissLocationSheet = useCallback(() => {
    setLocationOpen(false)
    sheetProgress.setValue(0)
    scrimProgress.setValue(0)
  }, [scrimProgress, sheetProgress])

  useFocusEffect(useCallback(() => {
    const pending = consumePendingAddressSelection()
    if (!pending) return
    let active = true
    void loadAddresses()
      .then(async rows => {
        if (!active) return
        setAddresses(rows)
        const selected = rows.find(item => item.id === pending.addressId) || rows.find(item => item.isDefault) || rows[0]
        if (!selected) return
        setSelectedAddress(selected)
        setRequestLocation(addressCoordinates(selected))
        await writeSelectedAddressId(selected.id)
      })
      .catch(() => undefined)
    return () => { active = false }
  }, []))

  const openService = (service: HomeService) => {
    if (!service.serviceVendorMapId) {
      Alert.alert('Service Unavailable', 'This service is currently unavailable.')
      return
    }
    router.push({ pathname: '/service-detail', params: { serviceVendorMapId: String(service.serviceVendorMapId), name: service.name, provider: service.provider } })
  }

  const openBusiness = (business: HomeBusiness) => {
    router.push({ pathname: '/business-detail', params: { vendorId: String(business.id) } })
  }

  const toggleSavedBusiness = async (business: HomeBusiness) => {
    try { await savedBusinesses.toggle(String(business.id)) }
    catch { Alert.alert('Could Not Save', 'Please try again.') }
  }

  const refreshHome = useCallback(async () => {
    setRefreshing(true)
    try { await load(false) } finally { setRefreshing(false) }
  }, [load])

  const advanceBanner = useCallback((index: number) => {
    if (!banners.length) return
    const next = (index + 1) % banners.length
    bannerRef.current?.scrollTo({ x: next * (bannerWidth + 12), animated: true })
  }, [bannerWidth, banners.length])

  useEffect(() => {
    if (autoPlayRef.current) clearTimeout(autoPlayRef.current)
    if (banners.length < 2) return
    autoPlayRef.current = setTimeout(() => advanceBanner(activeBanner), 5200)
    return () => { if (autoPlayRef.current) clearTimeout(autoPlayRef.current) }
  }, [activeBanner, advanceBanner, bannerAutoplayReset, banners.length])

  const onBannerScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const page = Math.round(event.nativeEvent.contentOffset.x / Math.max(1, bannerWidth + 12))
    const next = Math.max(0, Math.min(page, Math.max(0, banners.length - 1)))
    setActiveBanner(current => current === next ? current : next)
  }

  const onBannerSettled = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    onBannerScroll(event)
    setBannerAutoplayReset(value => value + 1)
  }

  const renderAddressRow = (address: HomeAddress, options: { icon: 'home-outline' | 'business-outline'; selectable: boolean }) => (
    <View key={address.id} style={styles.locationRow}>
      {options.selectable ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Select ${address.title}`} onPress={() => void selectAddress(address)} style={({ pressed }) => [styles.locationRowMain, pressed && styles.pressed]}>
          <View style={styles.addressIcon}><Ionicons name={options.icon} size={23} color={INK} /></View>
          <View style={styles.addressCopy}>
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.addressTitle}>{address.title}</Text>
            <Text numberOfLines={2} ellipsizeMode="tail" style={styles.addressText}>{address.address || 'Address details are unavailable.'}</Text>
          </View>
        </Pressable>
      ) : (
        <View accessibilityLabel={`Selected location ${address.title}`} style={styles.locationRowMain}>
          <View style={styles.addressIcon}><Ionicons name={options.icon} size={24} color={INK} /></View>
          <View style={styles.addressCopy}>
            <Text numberOfLines={1} ellipsizeMode="tail" style={styles.addressTitle}>{address.title}</Text>
            <Text numberOfLines={2} ellipsizeMode="tail" style={styles.addressText}>{address.address || 'Address details are unavailable.'}</Text>
          </View>
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${address.title}`}
        hitSlop={6}
        onPress={() => onEditAddress(address, dismissLocationSheet)}
        style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
      >
        <Ionicons name="create-outline" size={22} color={MUTED} />
      </Pressable>
    </View>
  )

  const renderLocationSheet = () => <Modal animationType="none" onRequestClose={closeLocation} transparent visible={locationOpen}>
    <View style={styles.modalBackdrop}>
      <Animated.View pointerEvents="none" style={[styles.modalShade, { opacity: scrimProgress }]} />
      <Pressable accessibilityRole="button" accessibilityLabel="Close Location Picker" onPress={closeLocation} style={StyleSheet.absoluteFill} />
      <Animated.View style={[styles.locationSheet, { paddingBottom: Math.max(insets.bottom, space.xl), transform: [{ translateY: sheetProgress.interpolate({ inputRange: [0, 1], outputRange: [viewportHeight, 0] }) }] }]}>
        <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.sheetHandle} />
        <ScrollView contentContainerStyle={styles.sheetScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Currently Selected</Text></View>
          {selectedAddress ? renderAddressRow(selectedAddress, { icon: 'home-outline', selectable: false }) : <Text style={styles.emptyLocation}>No saved location is available yet.</Text>}
          <Text style={styles.locationsTitle}>My Locations</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Add New Address" onPress={() => onAddAddress(addresses, selectedAddress, dismissLocationSheet)} style={({ pressed }) => [styles.addAddress, pressed && styles.pressed]}>
            <MaterialCommunityIcons name="plus-thick" size={22} color={BLUE} />
            <Text style={styles.addAddressText}>Add New Address</Text>
          </Pressable>
          {addresses.filter(address => address.id !== selectedAddress?.id).map(address => renderAddressRow(address, { icon: 'business-outline', selectable: true }))}
        </ScrollView>
      </Animated.View>
    </View>
  </Modal>

  return <SafeAreaView edges={['top']} style={styles.safe}>
    <Animated.ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl colors={[BLUE]} onRefresh={() => void refreshHome()} refreshing={refreshing} tintColor={BLUE} />} showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
      <View style={styles.topHeader}>
        <Pressable accessibilityRole="button" accessibilityLabel="Choose a Location" accessibilityHint="Opens your saved addresses" onPress={() => setLocationOpen(true)} style={({ pressed }) => [styles.locationButton, pressed && styles.pressed]}>
          <View style={styles.locationTagRow}><Text numberOfLines={1} ellipsizeMode="tail" style={styles.locationTag}>{selectedAddress?.title || 'Choose a Location'}</Text></View>
          <View style={styles.locationAddressRow}><Text numberOfLines={1} ellipsizeMode="tail" style={styles.locationAddress}>{selectedAddress?.address || 'Add your preferred address'}</Text><Ionicons name="chevron-down" size={20} color={INK} /></View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Notifications" accessibilityHint={notificationUnread ? 'You have unread notifications' : undefined} onPress={() => router.push('/notifications')} style={({ pressed }) => [styles.notificationButton, pressed && styles.pressed]}><Ionicons name="notifications-outline" size={24} color={INK} />{notificationUnread ? <View accessibilityElementsHidden style={styles.unreadDot} /> : null}</Pressable>
      </View>
      <View style={styles.stickySearch}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={22} color={colors.searchIcon} />
          <TextInput accessibilityLabel="Search Services and Providers" onChangeText={setQuery} placeholder="Search services, providers and more" placeholderTextColor={colors.placeholder} returnKeyType="search" style={styles.searchInput} value={query} />
          {query.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear Search" hitSlop={8} onPress={() => setQuery('')} style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
              <Ionicons name="close-circle" size={20} color={colors.searchIcon} />
            </Pressable>
          ) : null}
        </View>
      </View>
      <View style={styles.content}>
        {loading ? <HomeSkeleton bannerHeight={bannerHeight} categoryColumns={categoryColumns} /> : error ? <View accessibilityRole="alert" style={styles.errorCard}><Ionicons name="cloud-offline-outline" size={32} color={BLUE} /><Text style={styles.errorTitle}>We couldn’t load Home</Text><Text style={styles.errorText}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Try Again" onPress={() => void load(true)} style={({ pressed }) => [styles.retryButton, pressed && styles.retryPressed]}><Text style={styles.retryText}>Try Again</Text></Pressable></View> : <>
          {query ? <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Search Results</Text><Text style={styles.resultCount}>{filteredServices.length} found</Text></View> : null}
          {query ? <View style={styles.searchResults}>{filteredServices.map(service => <ServiceCard key={service.id} service={service} onPress={() => openService(service)} />)}{!filteredServices.length ? <View style={styles.emptyCard}><Text style={styles.emptyTitle}>No Matches</Text><Text style={styles.emptyText}>No services match that search.</Text></View> : null}</View> : <>
            {banners.length ? <><Animated.ScrollView ref={bannerRef} contentContainerStyle={styles.bannerRail} decelerationRate="fast" horizontal onMomentumScrollEnd={onBannerSettled} onScrollEndDrag={onBannerSettled} onScrollBeginDrag={() => { if (autoPlayRef.current) clearTimeout(autoPlayRef.current) }} onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: bannerScrollX } } }], { useNativeDriver: true })} pagingEnabled={false} scrollEventThrottle={16} showsHorizontalScrollIndicator={false} snapToInterval={bannerWidth + 12} snapToAlignment="start">{banners.map(banner => <BannerCard key={banner.id} banner={banner} height={bannerHeight} width={bannerWidth} />)}</Animated.ScrollView><View accessibilityLabel={`Banner ${activeBanner + 1} of ${banners.length}`} style={[styles.indicators, { width: banners.length * 32 - 8 }]}>{banners.map(banner => <View key={banner.id} style={styles.indicator} />)}{banners.length > 1 ? <Animated.View style={[styles.indicatorActive, { transform: [{ translateX: bannerScrollX.interpolate({ inputRange: banners.map((_, index) => index * (bannerWidth + 12)), outputRange: banners.map((_, index) => index * 32), extrapolate: 'clamp' }) }] }]} /> : <View style={styles.indicatorActive} />}</View></> : <View style={styles.emptyCard}><Text style={styles.emptyText}>No featured banners are currently available.</Text></View>}
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Browse Categories</Text><SeeAllLink label="View All" onPress={() => router.push({ pathname: '/catalog', params: { view: 'categories' } })} /></View>
            {categories.length ? <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.categoryPager}>{categoryPages.map((page, pageIndex) => <View key={pageIndex} style={[styles.categoryPage, { width: categoryPageWidth }]}>{page.map(category => <View key={category.id} style={[styles.categoryCell, { width: `${100 / categoryColumns}%` as `${number}%` }]}><CategoryPill category={category} onPress={() => router.push({ pathname: '/category-services', params: { categoryId: String(category.id), label: category.name } })} /></View>)}</View>)}</ScrollView> : <View style={styles.emptyCard}><Text style={styles.emptyText}>No categories are currently published.</Text></View>}
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Popular Businesses</Text><SeeAllLink label="See All" onPress={() => router.push({ pathname: '/catalog', params: { view: 'businesses' } })} /></View>
            {businesses.length ? <View style={styles.businessStack}>{businesses.slice(0, 4).map(business => <BusinessCard key={business.id} business={business} distanceKm={businessDistanceKm(selectedAddress, business)} onPress={() => openBusiness(business)} onSave={() => void toggleSavedBusiness(business)} saved={savedBusinesses.ids.includes(String(business.id))} />)}</View> : <View style={styles.emptyCard}><Text style={styles.emptyText}>No businesses are currently available.</Text></View>}
          </>}
        </>}
      </View>
    </Animated.ScrollView>
    {renderLocationSheet()}
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  scrollContent: { paddingBottom: space.xxxl },
  topHeader: { alignItems: 'center', backgroundColor: colors.background, flexDirection: 'row', justifyContent: 'space-between', paddingBottom: space.md, paddingHorizontal: space.lg, paddingTop: space.md },
  locationButton: { flex: 1, justifyContent: 'center', marginRight: space.md, minHeight: touch.min, minWidth: 0 },
  locationTagRow: { flexDirection: 'row' },
  locationTag: { backgroundColor: colors.tagBackground, borderRadius: radius.sm, color: INK, flexShrink: 1, fontSize: 12, fontWeight: '600', lineHeight: 16, overflow: 'hidden', paddingHorizontal: space.sm, paddingVertical: 3 },
  locationAddressRow: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 6 },
  locationAddress: { color: INK, flex: 1, fontSize: 18, fontWeight: '600', lineHeight: 24 },
  notificationButton: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.notificationBorder, borderRadius: radius.lg, borderWidth: 1, height: 48, justifyContent: 'center', width: 48 },
  unreadDot: { backgroundColor: colors.unread, borderColor: colors.white, borderRadius: 6, borderWidth: 2, height: 12, position: 'absolute', right: 8, top: 8, width: 12 },
  stickySearch: { backgroundColor: colors.background, paddingBottom: space.md, paddingHorizontal: space.lg, paddingTop: space.xs },
  searchBox: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.searchBorder, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', height: 52, paddingHorizontal: space.lg },
  searchInput: { color: INK, flex: 1, fontSize: 15, fontWeight: '400', lineHeight: 20, marginLeft: 10, paddingVertical: 0 },
  clearButton: { alignItems: 'center', height: touch.min, justifyContent: 'center', marginLeft: space.xs, width: touch.min },
  content: { alignSelf: 'center', maxWidth: 1100, paddingHorizontal: space.lg, width: '100%' },
  skeletonPage: { paddingTop: 0 },
  skeletonBlock: { backgroundColor: colors.skeleton },
  skeletonBanner: { borderRadius: radius.xxl, width: '100%' },
  skeletonDots: { alignSelf: 'center', flexDirection: 'row', gap: space.sm, marginTop: space.md },
  skeletonDot: { borderRadius: radius.xs, height: 6, width: 24 },
  skeletonTitle: { borderRadius: radius.sm, height: 22, marginBottom: space.md, marginTop: space.xxl, width: '56%' },
  skeletonCategories: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.lg },
  skeletonCategory: { alignItems: 'center' },
  skeletonCircle: { borderRadius: radius.circle, height: 76, width: 76 },
  skeletonCaption: { borderRadius: 6, height: 12, marginTop: space.sm, width: 56 },
  skeletonBusiness: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.skeleton, borderRadius: radius.xxl, borderWidth: 1, flexDirection: 'row', gap: space.md, marginBottom: space.lg, overflow: 'hidden', padding: space.md },
  skeletonBusinessImage: { borderRadius: radius.lg, height: 104, width: 104 },
  skeletonBusinessCopy: { flex: 1, gap: space.md },
  skeletonBusinessName: { borderRadius: radius.sm, height: 18, width: '75%' },
  skeletonBusinessMeta: { borderRadius: radius.sm, height: 14, width: '52%' },
  errorCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.cardBorderSoft, borderRadius: radius.xxl, borderWidth: 1, marginTop: space.lg, paddingHorizontal: space.xxl, paddingVertical: 28 },
  errorTitle: { color: INK, fontSize: 18, fontWeight: '800', lineHeight: 24, marginTop: space.md },
  errorText: { color: MUTED, fontSize: 14, fontWeight: '500', lineHeight: 21, marginTop: space.sm, textAlign: 'center' },
  retryButton: { alignItems: 'center', backgroundColor: BLUE, borderRadius: radius.md, justifyContent: 'center', marginTop: space.xl, minHeight: touch.min, minWidth: 120, paddingHorizontal: space.xl, paddingVertical: space.md },
  retryPressed: { opacity: 0.85 },
  retryText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.md, marginTop: space.xxl, minHeight: touch.min },
  sectionTitle: { color: INK, flexShrink: 1, fontSize: 20, fontWeight: '800', letterSpacing: -0.3, lineHeight: 26 },
  seeAllHit: { alignItems: 'center', justifyContent: 'center', minHeight: touch.min, minWidth: touch.min, paddingHorizontal: space.xs },
  seeAll: { color: BLUE, fontSize: 14, fontWeight: '700' },
  resultCount: { color: MUTED, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  bannerRail: { gap: space.md, paddingBottom: 2 },
  banner: { backgroundColor: INK, borderRadius: radius.xxl, overflow: 'hidden' },
  bannerImage: { height: '100%', width: '100%' },
  bannerFallback: { alignItems: 'flex-start', backgroundColor: colors.bannerFallback, flex: 1, justifyContent: 'flex-end', padding: space.xxl },
  bannerFallbackTitle: { color: colors.white, fontSize: 24, fontWeight: '800', lineHeight: 30 },
  indicators: { alignSelf: 'center', flexDirection: 'row', gap: space.sm, marginTop: space.md, position: 'relative' },
  indicator: { backgroundColor: '#c3d1e5', borderRadius: radius.xs, height: 6, width: 24 },
  indicatorActive: { backgroundColor: BLUE, borderRadius: radius.xs, height: 6, left: -4, position: 'absolute', width: 32 },
  categoryPager: { width: '100%' },
  categoryPage: { flexDirection: 'row', flexWrap: 'wrap', paddingBottom: space.xs, rowGap: space.lg },
  categoryCell: { alignItems: 'center', paddingHorizontal: space.xs },
  categoryItem: { alignItems: 'center', minHeight: touch.min, width: '100%' },
  categoryImageWrap: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: radius.circle, borderWidth: 1, height: 76, justifyContent: 'center', overflow: 'hidden', width: 76 },
  categoryImage: { height: 64, width: 64 },
  initials: { color: BLUE, fontSize: 18, fontWeight: '800' },
  categoryName: { color: colors.categoryLabel, fontSize: 12, fontWeight: '600', lineHeight: 16, marginTop: space.sm, textAlign: 'center' },
  businessStack: { gap: space.lg, paddingBottom: space.xs },
  serviceCard: { backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: radius.xxl, borderWidth: 1, overflow: 'hidden', width: '100%', ...cardShadow },
  cardPressed: { opacity: 0.88 },
  serviceImageWrap: { backgroundColor: colors.serviceImageBackground, height: 160, width: '100%' },
  serviceImage: { height: '100%', width: '100%' },
  serviceFallback: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  serviceBody: { padding: space.lg },
  serviceProvider: { color: BLUE, fontSize: 11, fontWeight: '800', lineHeight: 14 },
  serviceName: { color: INK, fontSize: 17, fontWeight: '800', lineHeight: 22, marginTop: space.xs },
  serviceDescription: { color: colors.description, fontSize: 13, fontWeight: '500', lineHeight: 18, marginTop: 6 },
  serviceMeta: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between', marginTop: space.md },
  fromLabel: { color: colors.fromLabel, fontSize: 10, fontWeight: '700', lineHeight: 14 },
  servicePrice: { color: INK, fontSize: 14, fontWeight: '800', lineHeight: 18 },
  ratingRow: { alignItems: 'center', flexDirection: 'row', gap: space.xs },
  rating: { color: MUTED, fontSize: 12, fontWeight: '700', lineHeight: 16 },
  searchResults: { gap: space.md },
  emptyCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: radius.xxl, borderWidth: 1, paddingHorizontal: space.xxl, paddingVertical: 28 },
  emptyTitle: { color: INK, fontSize: 16, fontWeight: '700', lineHeight: 22, marginBottom: 6 },
  emptyText: { color: MUTED, fontSize: 14, fontWeight: '500', lineHeight: 21, textAlign: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  modalShade: { backgroundColor: colors.scrim, bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  locationSheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, height: '76%', paddingHorizontal: space.xl, paddingTop: space.md },
  sheetHandle: { alignSelf: 'center', backgroundColor: colors.sheetHandle, borderRadius: radius.xs, height: 5, marginBottom: space.xl, width: 44 },
  sheetScroll: { paddingBottom: space.xxl },
  sheetHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: space.xl },
  sheetTitle: { color: INK, fontSize: 24, fontWeight: '700', letterSpacing: -0.4, lineHeight: 30 },
  locationRow: { alignItems: 'center', borderBottomColor: colors.sheetDivider, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 64, paddingVertical: space.lg },
  locationRowMain: { alignItems: 'center', flex: 1, flexDirection: 'row', minWidth: 0 },
  addressIcon: { alignItems: 'center', height: 36, justifyContent: 'center', width: 36 },
  addressCopy: { flex: 1, marginHorizontal: space.md, minWidth: 0 },
  addressTitle: { color: INK, fontSize: 16, fontWeight: '600', lineHeight: 22 },
  addressText: { color: MUTED, fontSize: 14, fontWeight: '400', lineHeight: 20, marginTop: space.xs },
  editButton: { alignItems: 'center', height: touch.min, justifyContent: 'center', width: touch.min },
  locationsTitle: { color: INK, fontSize: 22, fontWeight: '700', lineHeight: 28, marginBottom: space.lg, marginTop: space.xxxl },
  addAddress: { alignItems: 'center', borderBottomColor: colors.sheetDivider, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: space.lg, minHeight: 56, paddingBottom: space.xl, paddingTop: space.md },
  addAddressText: { color: BLUE, fontSize: 16, fontWeight: '600' },
  emptyLocation: { color: MUTED, fontSize: 14, fontWeight: '500', lineHeight: 21, paddingVertical: space.md },
  pressed: { opacity: 0.72 },
})
