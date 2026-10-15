import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getBusinessDetails, type HomeBusiness } from '../lib/helpy-api'
import { colors, radius, space } from '../lib/theme'

export default function BusinessDetailScreen() {
  const { vendorId } = useLocalSearchParams<{ vendorId?: string }>()
  const [business, setBusiness] = useState<HomeBusiness>()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [logoFailed, setLogoFailed] = useState(false)
  const load = useCallback(async () => {
    try { setBusiness(await getBusinessDetails(Number(vendorId))); setError('') }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load this business.') }
    finally { setLoading(false); setRefreshing(false) }
  }, [vendorId])
  useEffect(() => {
    const timer = setTimeout(() => { void load() }, 0)
    return () => clearTimeout(timer)
  }, [load])
  const about = business?.raw.about_me_english || business?.raw.about_me
  return <SafeAreaView style={styles.safe}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Go Back" onPress={() => router.back()} style={styles.back}><Ionicons name="chevron-back" size={24} color={colors.ink} /></Pressable><Text style={styles.headerTitle}>Business</Text></View>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load() }} tintColor={colors.blue} />}>
      {loading ? <ActivityIndicator color={colors.blue} /> : error ? <View><Text style={styles.muted}>{error}</Text><Pressable onPress={() => { setLoading(true); void load() }}><Text style={styles.link}>Try Again</Text></Pressable></View> : business ? <>
        <View style={styles.profile}>
          {business.image && !logoFailed ? <Image source={{ uri: business.image }} style={styles.logo} resizeMode="contain" onError={() => setLogoFailed(true)} /> : <View style={styles.logo}><Ionicons name="business-outline" size={36} color={colors.blue} /></View>}
          <View style={styles.profileCopy}><Text style={styles.title}>{business.name}</Text><Text style={styles.category}>{business.category}</Text><View style={styles.rating}><Ionicons name="star" color="#ffbf00" size={17} /><Text style={styles.muted}>{business.rating.toFixed(1)}</Text></View></View>
        </View>
        {typeof about === 'string' && about.trim() ? <Text style={styles.about}>{about.replace(/<[^>]+>/g, '').trim()}</Text> : null}
        <Text style={styles.sectionTitle}>Services</Text>
        {business.services.map(service => <Pressable key={service.serviceVendorMapId} accessibilityRole="button" accessibilityLabel={`View ${service.name}`} onPress={() => router.push({ pathname: '/service-detail', params: { serviceVendorMapId: String(service.serviceVendorMapId) } })} style={styles.service}>
          <View style={styles.serviceCopy}><Text style={styles.serviceName}>{service.name}</Text><Text style={styles.category}>{service.category}</Text>{service.description ? <Text numberOfLines={2} style={styles.muted}>{service.description}</Text> : null}<Text style={styles.link}>{service.price > 0 ? `QAR ${service.price.toFixed(2)}` : 'Price on request'}</Text></View><Ionicons name="chevron-forward" color={colors.blue} size={22} />
        </Pressable>)}
        {!business.services.length ? <Text style={styles.muted}>No services are currently available.</Text> : null}
      </> : null}
    </ScrollView>
  </SafeAreaView>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.sm },
  back: { padding: 10 }, headerTitle: { color: colors.ink, fontSize: 17, fontWeight: '600' },
  content: { padding: space.lg, gap: space.lg, paddingBottom: 40 },
  profile: { flexDirection: 'row', alignItems: 'center', gap: space.lg, backgroundColor: colors.card, padding: space.lg, borderRadius: radius.lg },
  logo: { width: 88, height: 88, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  profileCopy: { flex: 1 }, title: { fontSize: 24, fontWeight: '700', color: colors.ink },
  category: { fontSize: 13, color: colors.blue, marginVertical: 6 }, rating: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  muted: { color: colors.muted, fontSize: 14, lineHeight: 21 }, about: { color: colors.ink, fontSize: 15, lineHeight: 23 },
  sectionTitle: { color: colors.ink, fontSize: 21, fontWeight: '700' },
  service: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.card, padding: space.lg, borderRadius: radius.lg, borderColor: colors.cardBorder, borderWidth: 1 },
  serviceCopy: { flex: 1 }, serviceName: { color: colors.ink, fontSize: 17, fontWeight: '600' }, link: { color: colors.blue, fontSize: 14, fontWeight: '600', marginTop: 8 },
})
