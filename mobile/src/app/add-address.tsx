import { Ionicons } from '@expo/vector-icons'
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Alert, Animated, BackHandler, Easing, Keyboard, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native'
import MapView, { type Region } from 'react-native-maps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { AddressDetailsStep } from '../components/address/AddressDetailsStep'
import { AddressTypeStep } from '../components/address/AddressTypeStep'
import { MapPin } from '../components/address/MapPin'
import { applyGeocodeToDraft, loadStatesCached, resolveStateAndCity } from '../lib/address-autofill'
import { DOHA_CENTER, defaultNameForKind, getAddressDraft, notifyAddressSaved, patchAddressDraft, resolveDraftTitle, setAddressDraft, type AddressDraft, type AddressLabelKind } from '../lib/address-draft'
import { ensureForegroundPermission, haversineKm, isInQatar, refineCurrentPosition, reverseGeocodePoint, searchPlaces, type PositionFix, type SearchResult } from '../lib/geocoding'
import { loadAddresses, QATAR_COUNTRY_ID, storeAddress, updateAddress } from '../lib/helpy-api'
import { cardShadow, colors, radius, space, touch } from '../lib/theme'

/*
 * GEOMETRY (why the pin tip is exactly on the picked coordinate)
 * --------------------------------------------------------------
 * There is ONE pick point: the exact centre of the MapView frame. MapView reports
 * `onRegionChangeComplete` for the centre of ITS OWN frame, and animateToRegion() targets that same
 * centre. So the pin is a child of the same container as the MapView, anchored (zero-size anchor)
 * at `left: 50%, top: 50%` of that container, with the pin's TIP at the anchor.
 *
 * The container is sized so it ends under the sheet's rounded corners (no gap), and its frame NEVER
 * changes size. For the details/type steps we do not resize or re-centre the map: we translate the
 * whole container up with a native-driven transform (map + pin move together), so geometry cannot drift.
 * The sheet only overlays the map; search mode / keyboard change the sheet, never the map frame.
 *
 * (Previous bug: the pin overlay was a separate full-screen layer with `paddingBottom: 200`, centring
 * the pin ~100pt above the full-screen MapView's centre, and its tip sat below its own centre —
 * so the tip was ~70–80pt north of the coordinate that was geocoded / saved.)
 */

const SHEET_OPEN_EASING = Easing.bezier(0.22, 1, 0.36, 1)
const SHEET_CLOSE_EASING = Easing.bezier(0.4, 0, 1, 1)
const SHEET_OPEN_MS = 380
const SHEET_CLOSE_MS = 260
const ZOOM_USER = 0.0025
const ZOOM_DEFAULT = 0.01
const PICK_BODY = 212
const CARD_HEIGHT = 64
const LOCATE_SIZE = 48
const GEOCODE_DEBOUNCE_MS = 350

type Step = 'pick' | 'search' | 'type' | 'details'
type Point = { latitude: number; longitude: number }

const sameSpot = (a: Point, b: Point, metres: number) => haversineKm(a, b) * 1000 < metres
const isDetailStep = (step: Step) => step === 'type' || step === 'details'

export default function AddAddressScreen() {
  const insets = useSafeAreaInsets()
  const { height: screenH } = useWindowDimensions()
  const params = useLocalSearchParams<{ mode?: string }>()
  const mode = params.mode === 'edit' ? 'edit' : 'add'

  // ----- refs -----
  const mapRef = useRef<MapView | null>(null)
  const mapReady = useRef(false)
  const pendingMapPoint = useRef<{ point: Point; zoom: number } | null>(null)
  const searchInputRef = useRef<TextInput | null>(null)
  const stepRef = useRef<Step>('pick')
  const reverseSeq = useRef(0)
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const liftedRef = useRef(false)
  const settlingRef = useRef(false)
  const lastGeocoded = useRef<Point | null>(null)
  const userFix = useRef<PositionFix | null>(null)
  const refineSession = useRef<{ cancel: () => void } | null>(null)
  const followUser = useRef(false)
  const userDragging = useRef(false)
  const selectedPlace = useRef<{ label: string; point: Point } | null>(null)

  // ----- animated values -----
  const lift = useMemo(() => new Animated.Value(0), [])
  const detailProgress = useMemo(() => new Animated.Value(0), [])
  const contentFade = useMemo(() => new Animated.Value(1), [])
  const locateOpacity = useMemo(() => new Animated.Value(1), [])
  const kbOffset = useMemo(() => new Animated.Value(0), [])

  // ----- geometry -----
  const bottomPad = Math.max(insets.bottom, space.lg)
  const pickSheetH = PICK_BODY + bottomPad
  const mapH = screenH - pickSheetH + radius.sheet // map runs under the rounded sheet corners
  const pickY = mapH / 2 // pick point (tip of the pin) while picking
  const detailMapH = insets.top + 250
  const detailPinY = insets.top + 120 // pin tip while showing details (above the floating card)
  const detailSheetH = screenH - detailMapH + radius.sheet
  const cardTop = detailMapH - radius.sheet - 12 - CARD_HEIGHT

  // ----- state -----
  const [step, setStep] = useState<Step>('pick')
  const [form, setForm] = useState<AddressDraft>(() => getAddressDraft())
  const [initialRegion] = useState<Region>(() => ({
    latitude: getAddressDraft().latitude || DOHA_CENTER.latitude,
    longitude: getAddressDraft().longitude || DOHA_CENTER.longitude,
    latitudeDelta: mode === 'edit' ? 0.004 : ZOOM_DEFAULT,
    longitudeDelta: mode === 'edit' ? 0.004 : ZOOM_DEFAULT,
  }))
  const [center, setCenter] = useState<Point>({ latitude: initialRegion.latitude, longitude: initialRegion.longitude })
  const [geocodeLoading, setGeocodeLoading] = useState(false)
  const [settling, setSettling] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [geocodeError, setGeocodeError] = useState('')
  const [nearMe, setNearMe] = useState('')
  const [locating, setLocating] = useState(false)
  const [atUser, setAtUser] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [kb, setKb] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const busy = geocodeLoading || settling
  const inQatar = isInQatar(center.latitude, center.longitude)
  const confirmDisabled = busy || !form.formatted || !inQatar
  const inDetail = step === 'type' || step === 'details'

  useEffect(() => { stepRef.current = step }, [step])

  const syncDraft = useCallback((next: AddressDraft) => {
    setForm(next)
    setAddressDraft(next)
  }, [])

  // ===== pin lift / settle =====
  const setLifted = useCallback((up: boolean) => {
    if (up === liftedRef.current) return
    liftedRef.current = up
    if (up) {
      Animated.timing(lift, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
    } else {
      // Drops to the ground, then a small rebound — never below the ground (no overshoot past 0).
      Animated.sequence([
        Animated.timing(lift, { toValue: 0, duration: 130, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.timing(lift, { toValue: 0.18, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(lift, { toValue: 0, duration: 110, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start()
    }
  }, [lift])

  // ===== reverse geocode + autofill =====
  const applyReverse = useCallback(async (point: Point) => {
    const sequence = ++reverseSeq.current
    lastGeocoded.current = point
    settlingRef.current = false
    setSettling(false)
    setGeocodeLoading(true)
    setGeocodeError('')
    try {
      const geocode = await reverseGeocodePoint(point.latitude, point.longitude)
      if (sequence !== reverseSeq.current) return
      if (isDetailStep(stepRef.current)) return
      if (!geocode) {
        setGeocodeError('Move The Map To Set Your Location')
        syncDraft({ ...getAddressDraft(), ...point, formatted: '' })
        return
      }
      await loadStatesCached().catch(() => [])
      const match = await resolveStateAndCity(geocode, point).catch(() => ({ state: undefined, city: undefined, cities: [] }))
      if (sequence !== reverseSeq.current) return
      if (isDetailStep(stepRef.current)) return
      const next = applyGeocodeToDraft({ ...getAddressDraft(), ...point }, geocode, {
        stateId: match.state?.id ?? null,
        cityId: match.city?.id ?? null,
      })
      const place = selectedPlace.current
      if (place && sameSpot(place.point, point, 20)) {
        next.headline = place.label
        if (!next.landmark || next.landmark === geocode.district || next.landmark === geocode.name) {
          next.landmark = place.label
          next.autofilled.landmark = true
        }
        selectedPlace.current = null
      }
      syncDraft(next)
      if (userFix.current && sameSpot(userFix.current, point, 25)) setNearMe(geocode.formatted)
    } catch (reason) {
      if (sequence !== reverseSeq.current) return
      setGeocodeError(reason instanceof Error ? reason.message : 'Unable to look up this location.')
    } finally {
      if (sequence === reverseSeq.current) {
        setGeocodeLoading(false)
        setBootstrapping(false)
      }
    }
  }, [syncDraft])

  /** Debounced: only runs once the map has settled. */
  const scheduleGeocode = useCallback((point: Point) => {
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current)
    geocodeTimer.current = setTimeout(() => {
      geocodeTimer.current = null
      if (lastGeocoded.current && sameSpot(lastGeocoded.current, point, 2) && getAddressDraft().formatted) {
        settlingRef.current = false
        setSettling(false)
        return
      }
      void applyReverse(point)
    }, GEOCODE_DEBOUNCE_MS)
  }, [applyReverse])

  // ===== map events =====
  const updateAtUser = useCallback((point: Point) => {
    setAtUser(Boolean(userFix.current) && sameSpot(userFix.current as Point, point, 15))
  }, [])

  const onRegionChange = () => {
    setLifted(true)
    // Only cancel an in-flight lookup when the USER is dragging. Programmatic
    // animateToRegion (Locate Me / search) used to increment this too, which
    // dropped the destination lookup — and onRegionChangeComplete often never
    // fired on the first animation, so the capsule stayed on the old address.
    if (userDragging.current && !settlingRef.current) {
      settlingRef.current = true
      reverseSeq.current += 1
      setSettling(true)
    } else if (!settlingRef.current) {
      settlingRef.current = true
      setSettling(true)
    }
  }

  const onRegionChangeComplete = (next: Region) => {
    if (isDetailStep(stepRef.current)) return
    userDragging.current = false
    setLifted(false)
    const point = { latitude: next.latitude, longitude: next.longitude }
    setCenter(point)
    patchAddressDraft(point)
    updateAtUser(point)
    scheduleGeocode(point)
  }

  const onPanDrag = () => {
    userDragging.current = true
    pendingMapPoint.current = null
    if (followUser.current) {
      followUser.current = false
      refineSession.current?.cancel()
      refineSession.current = null
    }
  }

  const moveMapTo = useCallback((point: Point, zoom: number, duration: number) => {
    setCenter(point)
    patchAddressDraft(point)
    if (mapReady.current) mapRef.current?.animateToRegion({ ...point, latitudeDelta: zoom, longitudeDelta: zoom }, duration)
    else pendingMapPoint.current = { point, zoom }
  }, [])

  // ===== locate me (quick fix -> refine for ~6 s, always cleaned up) =====
  const startLocate = useCallback(async (silent: boolean) => {
    refineSession.current?.cancel()
    followUser.current = true
    userDragging.current = false
    reverseSeq.current += 1
    lastGeocoded.current = null
    setLocating(true)
    try {
      const permission = await ensureForegroundPermission()
      if (permission.status !== 'granted') {
        setLocating(false)
        if (silent) return
        if (permission.status === 'denied' && !permission.canAskAgain) {
          Alert.alert('Location Access Needed', 'Enable location access in Settings to use Locate Me.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
          ])
        } else {
          Alert.alert('Location Access Needed', 'Allow location access to centre the map on where you are.')
        }
        return
      }
      let first = true
      const session = refineCurrentPosition((fix, final) => {
        userFix.current = fix
        const isFirst = first
        first = false
        if (isFirst || final) setLocating(false)
        if (!followUser.current) return
        moveMapTo(fix, ZOOM_USER, isFirst ? 500 : 250)
        updateAtUser(fix)
        // Don't wait for onRegionChangeComplete — it often misses the first animateToRegion.
        void applyReverse(fix)
      })
      refineSession.current = session
      await session.done
    } catch (reason) {
      if (!silent) Alert.alert('Could Not Locate You', reason instanceof Error ? reason.message : 'Try again or move the map manually.')
    } finally {
      setLocating(false)
    }
  }, [applyReverse, moveMapTo, updateAtUser])

  // ===== bootstrap =====
  useEffect(() => {
    scheduleGeocode({ latitude: initialRegion.latitude, longitude: initialRegion.longitude })
    // Add mode: ask for permission in context and centre on the user; edit mode keeps the saved point.
    const timer = mode === 'add' ? setTimeout(() => { void startLocate(true) }, 0) : null
    return () => { if (timer) clearTimeout(timer) }
  }, [initialRegion, mode, scheduleGeocode, startLocate])

  useEffect(() => () => {
    refineSession.current?.cancel()
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current)
    if (searchTimer.current) clearTimeout(searchTimer.current)
  }, [])

  useFocusEffect(useCallback(() => () => {
    refineSession.current?.cancel()
    refineSession.current = null
  }, []))

  // ===== steps & navigation =====
  const openSearch = useCallback(() => {
    setStep('search')
    requestAnimationFrame(() => searchInputRef.current?.focus())
  }, [])

  const closeSearch = useCallback(() => {
    searchInputRef.current?.blur()
    Keyboard.dismiss()
    setStep('pick')
    setSearchQuery('')
    setSearchResults([])
    setSearchError('')
    setSearching(false)
  }, [])

  /** Steps back inside the flow. Returns false when the screen itself should be left. */
  const goBackStep = useCallback(() => {
    const current = stepRef.current
    if (current === 'search') { closeSearch(); return true }
    if (current === 'details') { setStep(getAddressDraft().mode === 'edit' ? 'pick' : 'type'); return true }
    if (current === 'type') { setStep('pick'); return true }
    return false
  }, [closeSearch])

  const handleBack = () => { if (!goBackStep()) router.back() }

  useEffect(() => {
    if (Platform.OS !== 'android') return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => goBackStep())
    return () => subscription.remove()
  }, [goBackStep])

  const confirmLocation = () => {
    if (confirmDisabled) return
    followUser.current = false
    refineSession.current?.cancel()
    refineSession.current = null
    pendingMapPoint.current = null
    syncDraft({ ...form, ...center })
    setSaveError('')
    setStep(form.mode === 'edit' ? 'details' : 'type')
  }

  const chooseType = (kind: AddressLabelKind) => {
    const keepName = form.name.trim() && !['Home', 'Office'].includes(form.name.trim())
    syncDraft({
      ...form,
      labelKind: kind,
      name: keepName ? form.name : defaultNameForKind(kind),
      autofilled: { ...form.autofilled, labelKind: false },
    })
    setStep('details')
  }

  // ===== search =====
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (step !== 'search') return
    const query = searchQuery.trim()
    if (query.length < 2) return
    searchTimer.current = setTimeout(() => {
      setSearching(true)
      setSearchError('')
      void searchPlaces(query, center)
        .then(results => {
          setSearchResults(results)
          if (!results.length) setSearchError('No matching places in Qatar.')
        })
        .catch(reason => setSearchError(reason instanceof Error ? reason.message : 'Search failed.'))
        .finally(() => setSearching(false))
    }, 400)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [center, step, searchQuery])

  // ===== save =====
  const save = async () => {
    if (!form.street.trim() || !form.zone.trim() || !form.stateId || !form.cityId) return
    setSaving(true)
    setSaveError('')
    try {
      const title = resolveDraftTitle(form) || form.labelKind
      const baseAddress = (form.headline || form.formatted.split(',')[0] || title).trim().slice(0, 255)
      const payload = {
        addressType: (form.labelKind === 'Home' ? 1 : form.labelKind === 'Office' ? 2 : 3) as 1 | 2 | 3,
        title,
        address: baseAddress,
        stateId: form.stateId,
        cityId: form.cityId,
        countryId: form.countryId ?? QATAR_COUNTRY_ID,
        buildingNumber: form.building.trim(),
        zone: form.zone.trim(),
        street: form.street.trim(),
        floor: form.floor.trim(),
        apartment: form.apartment.trim(),
        landmark: form.landmark.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        notes: form.notes.trim(),
        isDefault: form.isDefault,
      }
      if (form.mode === 'edit' && form.editId) {
        await updateAddress({ ...payload, id: form.editId })
        notifyAddressSaved(form.editId)
        router.back()
        return
      }
      const before = await loadAddresses().catch(() => [])
      await storeAddress(payload)
      const rows = await loadAddresses()
      const existingIds = new Set(before.map(item => item.id))
      const created = rows.find(item => !existingIds.has(item.id))
        || rows.find(item => item.title === (form.labelKind === 'Office' ? 'Work' : form.labelKind) && item.address.includes(form.street.trim()))
      if (created) notifyAddressSaved(created.id)
      router.back()
    } catch (reason) {
      setSaveError(reason instanceof Error ? reason.message : 'Unable to save this address.')
    } finally {
      setSaving(false)
    }
  }

  // ===== keyboard (iOS lifts the sheet; Android resizes the window itself) =====
  useEffect(() => {
    if (Platform.OS !== 'ios') return
    const show = Keyboard.addListener('keyboardWillShow', event => {
      setKb(event.endCoordinates.height)
      Animated.timing(kbOffset, { toValue: event.endCoordinates.height, duration: event.duration || 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
    })
    const hide = Keyboard.addListener('keyboardWillHide', event => {
      setKb(0)
      Animated.timing(kbOffset, { toValue: 0, duration: event.duration || 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
    })
    return () => { show.remove(); hide.remove() }
  }, [kbOffset])

  // ===== sheet height / transitions =====
  const sheetTarget = (() => {
    if (step === 'pick') return pickSheetH
    if (step === 'search') return kb > 0 ? screenH - kb - insets.top - space.md : screenH * 0.82
    if (step === 'type') return detailSheetH
    return kb > 0 ? Math.min(detailSheetH, screenH - kb - insets.top - space.sm) : detailSheetH
  })()
  const sheetHeight = useMemo(() => new Animated.Value(pickSheetH), [pickSheetH])

  useEffect(() => {
    const closing = step === 'pick'
    Animated.timing(sheetHeight, {
      toValue: sheetTarget,
      duration: closing ? SHEET_CLOSE_MS : SHEET_OPEN_MS,
      easing: closing ? SHEET_CLOSE_EASING : SHEET_OPEN_EASING,
      useNativeDriver: false,
    }).start()
  }, [sheetHeight, sheetTarget, step])

  useEffect(() => {
    const toDetail = step === 'type' || step === 'details'
    Animated.timing(detailProgress, {
      toValue: toDetail ? 1 : 0,
      duration: toDetail ? SHEET_OPEN_MS + 40 : SHEET_CLOSE_MS + 40,
      easing: toDetail ? SHEET_OPEN_EASING : SHEET_CLOSE_EASING,
      useNativeDriver: true,
    }).start()
    Animated.timing(locateOpacity, { toValue: step === 'pick' ? 1 : 0, duration: 180, useNativeDriver: true }).start()
    contentFade.setValue(0)
    Animated.timing(contentFade, { toValue: 1, duration: 240, delay: 60, easing: Easing.out(Easing.quad), useNativeDriver: true }).start()
  }, [step, detailProgress, locateOpacity, contentFade])

  const mapTranslate = detailProgress.interpolate({ inputRange: [0, 1], outputRange: [0, detailPinY - pickY] })
  const contentBottomPad = kb > 0 ? space.md : bottomPad
  const pickHint = !inQatar ? 'Helpy Is Only Available In Qatar' : geocodeError && form.formatted ? geocodeError : ''
  const capsuleText = busy || bootstrapping ? 'Finding address…' : form.formatted || geocodeError || 'Move The Map To Set Your Location'

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <Stack.Screen options={{ gestureEnabled: step === 'pick' }} />

      {/* Map + pin share one container; the container (not the map) is what moves between steps. */}
      <Animated.View pointerEvents={step === 'pick' ? 'auto' : 'none'} style={[styles.mapContainer, { height: mapH, transform: [{ translateY: mapTranslate }] }]}>
        <MapView
          ref={mapRef}
          accessibilityLabel="Location Map"
          initialRegion={initialRegion}
          onMapReady={() => {
            mapReady.current = true
            const pending = pendingMapPoint.current
            pendingMapPoint.current = null
            if (pending) mapRef.current?.animateToRegion({ ...pending.point, latitudeDelta: pending.zoom, longitudeDelta: pending.zoom }, 500)
          }}
          onPanDrag={onPanDrag}
          onRegionChange={onRegionChange}
          onRegionChangeComplete={onRegionChangeComplete}
          pitchEnabled={false}
          rotateEnabled={false}
          scrollEnabled={step === 'pick'}
          showsMyLocationButton={false}
          showsUserLocation
          style={StyleSheet.absoluteFill}
          toolbarEnabled={false}
          zoomEnabled={step === 'pick'}
        />
        <MapPin lift={lift} />
      </Animated.View>

      {/* Top controls */}
      <View pointerEvents="box-none" style={[styles.topRow, { top: insets.top + space.sm }]}>
        <Pressable accessibilityLabel="Go Back" accessibilityRole="button" hitSlop={6} onPress={handleBack} style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <Animated.View pointerEvents={inDetail ? 'auto' : 'none'} style={{ opacity: detailProgress }}>
          <Pressable accessibilityLabel="Edit Address" accessibilityHint="Returns to the map to move the pin" accessibilityRole="button" onPress={() => setStep('pick')} style={({ pressed }) => [styles.editPill, pressed && styles.pressed]}>
            <Ionicons name="map-outline" size={16} color={colors.blue} />
            <Text style={styles.editPillText}>Edit Address</Text>
          </Pressable>
        </Animated.View>
      </View>

      {/* Floating address card (details flow) */}
      <Animated.View
        pointerEvents="none"
        style={[styles.card, {
          opacity: detailProgress,
          top: cardTop,
          transform: [{ translateY: detailProgress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        }]}
      >
        <View style={styles.cardIcon}><Ionicons name="location" size={20} color={colors.blue} /></View>
        <View style={styles.cardCopy}>
          <Text numberOfLines={1} style={styles.cardTitle}>{form.headline || form.formatted.split(',')[0] || 'Selected Location'}</Text>
          <Text numberOfLines={1} style={styles.cardSubtitle}>{form.subline || form.formatted.split(',').slice(1, 3).join(',').trim() || 'Qatar'}</Text>
        </View>
      </Animated.View>

      {/* Bottom sheet (the Locate Me button is anchored to its top edge so it always follows it) */}
      <Animated.View style={[styles.sheetWrap, { bottom: kbOffset, height: sheetHeight }]}>
        <Animated.View pointerEvents={step === 'pick' ? 'auto' : 'none'} style={[styles.locateWrap, { opacity: locateOpacity }]}>
          <Pressable
            accessibilityLabel="Locate Me"
            accessibilityRole="button"
            accessibilityState={{ selected: atUser, busy: locating }}
            onPress={() => void startLocate(false)}
            style={({ pressed }) => [styles.locateButton, atUser && styles.locateActive, pressed && styles.pressed]}
          >
            {locating ? <ActivityIndicator color={atUser ? colors.white : colors.blue} /> : <Ionicons name={atUser ? 'locate' : 'locate-outline'} size={24} color={atUser ? colors.white : colors.blue} />}
          </Pressable>
        </Animated.View>

        <View style={styles.sheetClip}>
          <Animated.View style={[styles.sheetContent, { opacity: contentFade }]}>
            {step === 'pick' ? (
              <View style={styles.pickBody}>
                <Text style={styles.sheetTitle}>Select Location</Text>
                <Pressable accessibilityHint="Opens address search" accessibilityLabel={`Search Address. ${capsuleText}`} accessibilityRole="button" onPress={openSearch} style={({ pressed }) => [styles.capsule, pressed && styles.pressed]}>
                  <Ionicons name="search" size={18} color={colors.searchIcon} />
                  <Text numberOfLines={2} style={[styles.capsuleText, (busy || bootstrapping) && styles.capsuleMuted]}>{capsuleText}</Text>
                </Pressable>
                <Text accessibilityRole={!inQatar ? 'alert' : undefined} style={[styles.hintSlot, !inQatar && styles.hintAlert]}>{pickHint}</Text>
                <Pressable
                  accessibilityLabel="Confirm Location"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: confirmDisabled }}
                  disabled={confirmDisabled}
                  onPress={confirmLocation}
                  style={({ pressed }) => [styles.confirmButton, confirmDisabled && styles.confirmDisabled, pressed && !confirmDisabled && styles.pressed]}
                >
                  {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.confirmText}>Confirm Location</Text>}
                </Pressable>
              </View>
            ) : null}

            {step === 'search' ? (
              <View style={styles.flex}>
                <View style={styles.searchHeader}>
                  <Pressable accessibilityLabel="Close Search" accessibilityRole="button" hitSlop={8} onPress={closeSearch} style={styles.searchBack}>
                    <Ionicons name="chevron-back" size={22} color={colors.ink} />
                  </Pressable>
                  <Text style={styles.searchTitle}>Search Location</Text>
                </View>
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={20} color={colors.searchIcon} />
                  <TextInput
                    ref={searchInputRef}
                    accessibilityLabel="Where to Deliver"
                    autoCorrect={false}
                    onChangeText={value => {
                      setSearchQuery(value)
                      if (value.trim().length < 2) { setSearchResults([]); setSearchError(''); setSearching(false) }
                    }}
                    placeholder="Where to deliver?"
                    placeholderTextColor={colors.placeholder}
                    returnKeyType="search"
                    style={styles.searchInput}
                    value={searchQuery}
                  />
                  {searchQuery.length > 0 ? (
                    <Pressable accessibilityLabel="Clear Search" accessibilityRole="button" hitSlop={8} onPress={() => { setSearchQuery(''); setSearchResults([]); setSearchError(''); setSearching(false) }} style={styles.clearButton}>
                      <Ionicons name="close-circle" size={18} color={colors.searchIcon} />
                    </Pressable>
                  ) : null}
                </View>
                <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.searchScroll}>
                  <Pressable
                    accessibilityLabel="Use Current Location"
                    accessibilityRole="button"
                    onPress={() => { closeSearch(); void startLocate(false) }}
                    style={({ pressed }) => [styles.currentRow, pressed && styles.pressed]}
                  >
                    <View style={styles.currentIcon}><Ionicons name="navigate" size={18} color={colors.white} /></View>
                    <View style={styles.currentCopy}>
                      <Text numberOfLines={2} style={styles.currentTitle}>{nearMe || 'Use Current Location'}</Text>
                      <Text style={styles.currentSubtitle}>{nearMe ? 'We think you are here' : 'Centre the map on your GPS position'}</Text>
                    </View>
                  </Pressable>
                  <View style={styles.searchDivider} />
                  {searching ? <ActivityIndicator color={colors.blue} style={styles.searchSpinner} /> : null}
                  {searchError ? <Text style={styles.searchEmpty}>{searchError}</Text> : null}
                  {searchResults.map(result => (
                    <Pressable
                      key={result.id}
                      accessibilityLabel={`${result.label}, ${result.secondary}`}
                      accessibilityRole="button"
                      onPress={() => {
                        followUser.current = false
                        refineSession.current?.cancel()
                        closeSearch()
                        const point = { latitude: result.latitude, longitude: result.longitude }
                        selectedPlace.current = { label: result.label, point }
                        moveMapTo(point, 0.003, 450)
                        void applyReverse(point)
                      }}
                      style={({ pressed }) => [styles.resultRow, pressed && styles.pressed]}
                    >
                      <Ionicons name="location-outline" size={20} color={colors.blue} />
                      <View style={styles.resultCopy}>
                        <Text numberOfLines={1} style={styles.resultTitle}>{result.label}</Text>
                        <Text numberOfLines={1} style={styles.resultSubtitle}>{result.secondary}</Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            {step === 'type' ? <AddressTypeStep onSelect={chooseType} suggested={form.labelKind} /> : null}

            {step === 'details' ? (
              <AddressDetailsStep
                bottomPadding={contentBottomPad}
                error={saveError}
                form={form}
                onChange={syncDraft}
                onChangeType={() => setStep('type')}
                onSave={() => void save()}
                saving={saving}
              />
            ) : null}
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.background, flex: 1 },
  flex: { flex: 1 },
  pressed: { opacity: 0.72 },

  mapContainer: { left: 0, position: 'absolute', right: 0, top: 0 },

  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', left: 0, paddingHorizontal: space.lg, position: 'absolute', right: 0, zIndex: 5 },
  fab: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 24, height: 48, justifyContent: 'center', width: 48, ...cardShadow },
  editPill: { alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.pill, flexDirection: 'row', gap: 6, height: 44, paddingHorizontal: space.lg, ...cardShadow },
  editPillText: { color: colors.blue, fontSize: 14, fontWeight: '800' },

  card: { alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.xl, flexDirection: 'row', gap: space.md, height: CARD_HEIGHT, left: space.lg, paddingHorizontal: space.md, position: 'absolute', right: space.lg, zIndex: 4, ...cardShadow, shadowOpacity: 0.12 },
  cardIcon: { alignItems: 'center', backgroundColor: colors.categoryTint, borderRadius: 20, height: 40, justifyContent: 'center', width: 40 },
  cardCopy: { flex: 1, minWidth: 0 },
  cardTitle: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  cardSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '500', marginTop: 2 },

  sheetWrap: { backgroundColor: colors.card, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, left: 0, position: 'absolute', right: 0, zIndex: 6, shadowColor: colors.ink, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 14, elevation: 12 },
  sheetClip: { ...StyleSheet.absoluteFill, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, overflow: 'hidden' },
  sheetContent: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.xl },
  locateWrap: { position: 'absolute', right: space.lg, top: -(LOCATE_SIZE + 14) },
  locateButton: { alignItems: 'center', backgroundColor: colors.card, borderRadius: LOCATE_SIZE / 2, height: LOCATE_SIZE, justifyContent: 'center', width: LOCATE_SIZE, ...cardShadow, shadowOpacity: 0.16 },
  locateActive: { backgroundColor: colors.blue },

  pickBody: { flex: 1 },
  sheetTitle: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, lineHeight: 28, textAlign: 'center' },
  capsule: { alignItems: 'center', backgroundColor: colors.background, borderColor: colors.cardBorder, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', gap: space.sm, height: 60, marginTop: 14, paddingHorizontal: space.lg },
  capsuleText: { color: colors.ink, flex: 1, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  capsuleMuted: { color: colors.muted },
  hintSlot: { color: colors.muted, fontSize: 12, fontWeight: '600', height: 20, lineHeight: 20, marginTop: space.sm, textAlign: 'center' },
  hintAlert: { color: colors.heart, fontSize: 13, fontWeight: '700' },
  confirmButton: { alignItems: 'center', backgroundColor: colors.blue, borderRadius: radius.pill, height: 54, justifyContent: 'center', marginTop: space.sm },
  confirmDisabled: { opacity: 0.45 },
  confirmText: { color: colors.white, fontSize: 16, fontWeight: '800' },

  searchHeader: { alignItems: 'center', flexDirection: 'row', marginBottom: space.sm },
  searchBack: { alignItems: 'center', height: touch.min, justifyContent: 'center', marginLeft: -space.sm, width: touch.min },
  searchTitle: { color: colors.ink, flex: 1, fontSize: 20, fontWeight: '800', marginRight: touch.min },
  searchBox: { alignItems: 'center', backgroundColor: colors.background, borderColor: colors.searchBorder, borderRadius: radius.pill, borderWidth: 1, flexDirection: 'row', height: 52, paddingHorizontal: space.lg },
  searchInput: { color: colors.ink, flex: 1, fontSize: 15, marginLeft: space.sm, paddingVertical: 0 },
  clearButton: { alignItems: 'center', height: touch.min, justifyContent: 'center', width: touch.min },
  searchScroll: { flex: 1, marginTop: space.md },
  currentRow: { alignItems: 'center', flexDirection: 'row', gap: space.md, minHeight: 64, paddingVertical: space.md },
  currentIcon: { alignItems: 'center', backgroundColor: colors.blue, borderRadius: 12, height: 40, justifyContent: 'center', width: 40 },
  currentCopy: { flex: 1, minWidth: 0 },
  currentTitle: { color: colors.ink, fontSize: 15, fontWeight: '700', lineHeight: 20 },
  currentSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '500', marginTop: 2 },
  searchDivider: { backgroundColor: colors.sheetDivider, height: StyleSheet.hairlineWidth, marginVertical: space.xs },
  searchSpinner: { marginVertical: space.lg },
  searchEmpty: { color: colors.muted, fontSize: 14, fontWeight: '600', paddingVertical: space.lg, textAlign: 'center' },
  resultRow: { alignItems: 'center', borderBottomColor: colors.sheetDivider, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: space.md, paddingVertical: space.md },
  resultCopy: { flex: 1, minWidth: 0 },
  resultTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  resultSubtitle: { color: colors.muted, fontSize: 12, fontWeight: '500', marginTop: 2 },
})
