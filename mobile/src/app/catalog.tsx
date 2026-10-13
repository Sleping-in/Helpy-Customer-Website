import { Ionicons } from '@expo/vector-icons'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Alert, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { BusinessCard } from '../components/BusinessCard'
import { businessDistanceKm } from '../lib/distance'
import { loadHomeData, searchBusinesses, type HomeAddress, type HomeBusiness, type HomeCategory } from '../lib/helpy-api'
import { readSelectedAddressId } from '../lib/session'
import { cardShadow, colors, radius, space } from '../lib/theme'
import { useSavedBusinesses } from '../lib/use-saved-businesses'

const BLUE = colors.blue
const INK = colors.ink

export default function CatalogScreen() {
  const params = useLocalSearchParams<{ view?: string }>()
  const view = params.view === 'categories' ? 'categories' : 'businesses'
  const [categories, setCategories] = useState<HomeCategory[]>([])
  const [businesses, setBusinesses] = useState<HomeBusiness[]>([])
  const [addresses, setAddresses] = useState<HomeAddress[]>([])
  const [selectedAddress, setSelectedAddress] = useState<HomeAddress | undefined>()
  const savedBusinesses = useSavedBusinesses()
  const [categoryId, setCategoryId] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [searchResults, setSearchResults] = useState<HomeBusiness[] | null>(null)

  const load = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    try {
      const data = await loadHomeData({ force: !initial })
      setCategories(data.categories)
      setBusinesses(data.businesses)
      setAddresses(data.addresses)
      const selectedId = await readSelectedAddressId()
      setSelectedAddress(data.addresses.find(address => address.id === selectedId) || data.addresses.find(address => address.isDefault) || data.addresses[0])
      setError('')
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to load businesses.'
      if (initial) setError(message)
      else Alert.alert('Could Not Refresh', message)
    } finally {
      if (initial) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => { void load(true) }, 0)
    return () => clearTimeout(timer)
  }, [load])

  useFocusEffect(useCallback(() => {
    let active = true
    void readSelectedAddressId().then(id => {
      if (active && addresses.length) setSelectedAddress(addresses.find(address => address.id === id) || addresses.find(address => address.isDefault) || addresses[0])
    })
    return () => { active = false }
  }, [addresses]))

  useEffect(() => {
    const value = query.trim()
    if (!value) { const timer = setTimeout(() => setSearchResults(null), 0); return () => clearTimeout(timer) }
    let active = true
    const timer = setTimeout(() => { void searchBusinesses(value).then(rows => { if (active) setSearchResults(rows) }).catch(() => { if (active) setSearchResults([]) }) }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [query])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    try { await load() } finally { setRefreshing(false) }
  }, [load])

  const shown = useMemo(() => (searchResults || businesses).filter(business =>
    (categoryId === null || business.services.some(service => service.categoryId === categoryId)) &&
    `${business.name} ${business.category} ${business.services.map(service => service.name).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase())
  ), [businesses, categoryId, query, searchResults])

  const openBusiness = (business: HomeBusiness) => {
    router.push({ pathname: '/business-detail', params: { vendorId: String(business.id) } })
  }

  const toggleSavedBusiness = async (business: HomeBusiness) => {
    try { await savedBusinesses.toggle(String(business.id)) }
    catch { Alert.alert('Could Not Save', 'Please try again.') }
  }

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl onRefresh={() => void refresh()} refreshing={refreshing} tintColor={BLUE} />} showsVerticalScrollIndicator={false}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go Back" onPress={() => router.back()}><Text style={styles.retry}>‹ Back</Text></Pressable>
      <Text style={styles.title}>{view === 'categories' ? 'Categories' : 'Businesses'}</Text>
      <View style={styles.switcher}>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: view === 'categories' }} onPress={() => router.setParams({ view: 'categories' })} style={[styles.switchButton, view === 'categories' && styles.switchActive]}><Text style={[styles.switchLabel, view === 'categories' && styles.switchLabelActive]}>Categories</Text></Pressable>
        <Pressable accessibilityRole="tab" accessibilityState={{ selected: view === 'businesses' }} onPress={() => router.setParams({ view: 'businesses' })} style={[styles.switchButton, view === 'businesses' && styles.switchActive]}><Text style={[styles.switchLabel, view === 'businesses' && styles.switchLabelActive]}>Businesses</Text></Pressable>
      </View>
      {loading ? <View style={styles.skeletonList}>{[0, 1, 2].map(index => <View key={index} style={styles.skeletonCard}><View style={styles.skeletonImage} /><View style={styles.skeletonLine} /></View>)}</View> : error ? <View style={styles.empty}><Text style={styles.emptyText}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Try Again" onPress={() => void load(true)}><Text style={styles.retry}>Try Again</Text></Pressable></View> : view === 'categories' ? <View style={styles.categoryGrid}>{categories.map(category => <Pressable key={category.id} accessibilityRole="button" accessibilityLabel={category.name} onPress={() => { setCategoryId(category.id); router.setParams({ view: 'businesses' }) }} style={styles.categoryCard}><View style={styles.categoryImageWrap}>{category.image ? <Image source={{ uri: category.image }} style={styles.categoryImage} resizeMode="contain" /> : <Ionicons name="grid-outline" size={31} color={BLUE} />}</View><Text numberOfLines={2} style={styles.categoryName}>{category.name}</Text></Pressable>)}</View> : <>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={colors.searchIcon} />
          <TextInput accessibilityLabel="Search Businesses and Services" onChangeText={setQuery} placeholder="Search businesses and services" placeholderTextColor={colors.placeholder} style={styles.searchInput} value={query} />
          {query.length > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear Search" hitSlop={8} onPress={() => setQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={18} color={colors.searchIcon} />
            </Pressable>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}><Pressable onPress={() => setCategoryId(null)} style={[styles.filter, categoryId === null && styles.filterActive]}><Text style={[styles.filterText, categoryId === null && styles.filterTextActive]}>All</Text></Pressable>{categories.map(category => <Pressable key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.filter, categoryId === category.id && styles.filterActive]}><Text style={[styles.filterText, categoryId === category.id && styles.filterTextActive]}>{category.name}</Text></Pressable>)}</ScrollView>
        <View style={styles.businessList}>{shown.map(business => <BusinessCard key={business.id} business={business} distanceKm={businessDistanceKm(selectedAddress, business)} onPress={() => openBusiness(business)} onSave={() => void toggleSavedBusiness(business)} saved={savedBusinesses.ids.includes(String(business.id))} />)}{shown.length === 0 ? <Text style={styles.emptyText}>No businesses match this view.</Text> : null}</View>
      </>}
    </ScrollView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 28, paddingHorizontal: space.lg },
  title: { color: INK, fontSize: 27, fontWeight: '700', marginBottom: 18, marginTop: 15 },
  switcher: { backgroundColor: '#e8eff9', borderRadius: radius.lg, flexDirection: 'row', marginBottom: space.xl, padding: space.xs },
  switchButton: { alignItems: 'center', borderRadius: 12, flex: 1, paddingVertical: 10 },
  switchActive: { backgroundColor: colors.card },
  switchLabel: { color: '#64738e', fontSize: 14, fontWeight: '500' },
  switchLabelActive: { color: BLUE, fontWeight: '700' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'space-between' },
  categoryCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: 20, borderWidth: 1, padding: 14, width: '48%', ...cardShadow },
  categoryImageWrap: { alignItems: 'center', backgroundColor: colors.background, borderRadius: radius.lg, height: 105, justifyContent: 'center', width: '100%' },
  categoryImage: { height: 90, width: '90%' },
  categoryName: { color: INK, fontSize: 15, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  searchBox: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.searchBorder, borderRadius: 24, borderWidth: 1, flexDirection: 'row', height: 49, paddingHorizontal: 15 },
  searchInput: { color: INK, flex: 1, fontSize: 14, marginLeft: 9, paddingVertical: 0 },
  clearButton: { alignItems: 'center', height: 36, justifyContent: 'center', marginLeft: space.xs, width: 36 },
  filters: { gap: space.sm, paddingVertical: 15 },
  filter: { backgroundColor: colors.card, borderColor: colors.searchBorder, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: 13, paddingVertical: space.sm },
  filterActive: { backgroundColor: BLUE, borderColor: BLUE },
  filterText: { color: '#536582', fontSize: 12, fontWeight: '600' },
  filterTextActive: { color: colors.white },
  businessList: { gap: 15 },
  skeletonList: { gap: space.lg },
  skeletonCard: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: 23, borderWidth: 1, flexDirection: 'row', gap: space.md, padding: space.md, ...cardShadow },
  skeletonImage: { backgroundColor: colors.skeleton, borderRadius: 17, height: 124, width: 124 },
  skeletonLine: { backgroundColor: colors.skeleton, borderRadius: 7, flex: 1, height: 18 },
  empty: { alignItems: 'center', paddingTop: 50 },
  emptyText: { color: colors.muted, fontSize: 14, lineHeight: 21, paddingVertical: 18, textAlign: 'center' },
  retry: { color: BLUE, fontSize: 14, fontWeight: '700' },
})
