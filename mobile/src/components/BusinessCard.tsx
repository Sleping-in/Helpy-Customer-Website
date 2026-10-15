import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import type { HomeBusiness } from '../lib/helpy-api'
import { cardShadow, colors, radius, space, touch } from '../lib/theme'

type Props = {
  business: HomeBusiness
  distanceKm?: number
  onPress: () => void
  onSave: () => void
  saved?: boolean
}

export function BusinessCard({ business, distanceKm, onPress, onSave, saved = false }: Props) {
  const { width } = useWindowDimensions()
  const [logoFailed, setLogoFailed] = useState(false)
  const initials = business.name.split(/\s+/).filter(Boolean).map(word => word[0]).join('').slice(0, 2).toUpperCase() || 'H'
  const wide = width >= 600
  const imageSize = wide ? 142 : width < 370 ? 96 : 104
  const reviews = business.services.reduce((total, service) => Math.max(total, service.reviews), 0)

  return <View style={styles.card}>
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${business.name}`} onPress={onPress} style={({ pressed }) => [styles.imageWrap, { height: imageSize, width: imageSize }, pressed && styles.pressed]}>
      {business.image && !logoFailed ? <Image source={{ uri: business.image }} style={styles.logo} resizeMode="contain" onError={() => setLogoFailed(true)} /> : <View style={styles.logoFallback}><Text style={styles.logoInitials}>{initials}</Text></View>}
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${business.name}`} onPress={onPress} style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
      <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.name, wide && styles.nameWide]}>{business.name}</Text>
      {business.category ? <Text numberOfLines={1} ellipsizeMode="tail" style={styles.category}>{business.category}</Text> : null}
      <View style={styles.meta}>
        <View style={styles.metaItem}><Ionicons name="star" size={16} color="#ffbf00" /><Text style={styles.metaText}>{business.rating.toFixed(1)}{reviews > 0 ? ` (${reviews})` : ''}</Text></View>
        <View accessibilityLabel={distanceKm === undefined ? 'Distance unavailable from selected address' : `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} kilometers away`} style={styles.metaItem}><Ionicons name="location-outline" size={15} color="#71809a" /><Text style={styles.metaText}>{distanceKm === undefined ? '— km' : `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km`}</Text></View>
      </View>
    </Pressable>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? `Remove ${business.name} from saved` : `Save ${business.name}`}
      accessibilityState={{ selected: saved }}
      hitSlop={4}
      onPress={onSave}
      style={({ pressed }) => [styles.saveButton, pressed && styles.savePressed]}
    >
      <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? colors.heart : colors.ink} />
    </Pressable>
  </View>
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderRadius: radius.xxl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    position: 'relative',
    width: '100%',
    ...cardShadow,
  },
  imageWrap: { alignItems: 'center', backgroundColor: colors.imageFallback, borderColor: colors.imageFallbackBorder, borderRadius: radius.lg, borderWidth: 1, justifyContent: 'center', overflow: 'hidden' },
  logo: { height: '100%', width: '100%' },
  logoFallback: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  logoInitials: { color: colors.blue, fontSize: 28, fontWeight: '700' },
  saveButton: { alignItems: 'center', backgroundColor: colors.saveButtonBackground, borderRadius: 22, height: touch.min, justifyContent: 'center', position: 'absolute', right: 10, top: 10, width: touch.min, zIndex: 2 },
  savePressed: { opacity: 0.7, transform: [{ scale: 0.94 }] },
  body: { alignSelf: 'stretch', flex: 1, justifyContent: 'center', minWidth: 0, paddingRight: 52 },
  name: { color: colors.ink, fontSize: 17, fontWeight: '700', lineHeight: 22 },
  nameWide: { fontSize: 22, lineHeight: 28 },
  category: { alignSelf: 'flex-start', backgroundColor: colors.categoryTint, borderRadius: 10, color: colors.blue, fontSize: 11, fontWeight: '600', lineHeight: 14, marginTop: 6, maxWidth: '100%', overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 5 },
  meta: { alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.sm },
  metaItem: { alignItems: 'center', flexDirection: 'row', gap: space.xs },
  metaText: { color: colors.muted, fontSize: 12, fontWeight: '500', lineHeight: 16 },
  pressed: { opacity: 0.72 },
})
