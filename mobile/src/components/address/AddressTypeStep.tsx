import { Ionicons } from '@expo/vector-icons'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { AddressLabelKind } from '../../lib/address-draft'
import { colors, radius, space, touch } from '../../lib/theme'

export const ADDRESS_TYPES: { kind: AddressLabelKind; description: string; icon: 'home-outline' | 'briefcase-outline' | 'location-outline' }[] = [
  { kind: 'Home', description: 'Apartment Or House', icon: 'home-outline' },
  { kind: 'Office', description: 'Workplace', icon: 'briefcase-outline' },
  { kind: 'Other', description: 'Anything Else', icon: 'location-outline' },
]

type Props = {
  suggested: AddressLabelKind
  onSelect: (kind: AddressLabelKind) => void
}

/** Sheet step A — pick what kind of place this is. */
export function AddressTypeStep({ suggested, onSelect }: Props) {
  return (
    <View style={styles.root}>
      <Text style={styles.title}>Choose Address Type</Text>
      <Text style={styles.subtitle}>It helps providers find you faster and more accurately.</Text>
      <View style={styles.list}>
        {ADDRESS_TYPES.map(item => {
          const isSuggested = item.kind === suggested
          return (
            <Pressable
              key={item.kind}
              accessibilityHint={`Continues to address details as ${item.kind}`}
              accessibilityLabel={`${item.kind}, ${item.description}`}
              accessibilityRole="button"
              onPress={() => onSelect(item.kind)}
              style={({ pressed }) => [styles.row, isSuggested && styles.rowSuggested, pressed && styles.pressed]}
            >
              <View style={[styles.iconCircle, isSuggested && styles.iconCircleSuggested]}>
                <Ionicons name={item.icon} size={22} color={isSuggested ? colors.blue : colors.ink} />
              </View>
              <View style={styles.copy}>
                <Text style={styles.rowTitle}>{item.kind}</Text>
                <Text style={styles.rowDescription}>{item.description}</Text>
              </View>
              {isSuggested ? <View style={styles.suggestedBadge}><Text style={styles.suggestedText}>Suggested</Text></View> : null}
              <Ionicons name="chevron-forward" size={18} color={colors.chevron} />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '800', letterSpacing: -0.4, lineHeight: 30 },
  subtitle: { color: colors.muted, fontSize: 14, fontWeight: '500', lineHeight: 20, marginTop: 4 },
  list: { gap: space.md, marginTop: space.xl },
  row: { alignItems: 'center', backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: radius.xl, borderWidth: 1, flexDirection: 'row', gap: space.md, minHeight: 72, padding: space.md },
  rowSuggested: { backgroundColor: '#f7faff', borderColor: colors.blue },
  iconCircle: { alignItems: 'center', backgroundColor: colors.imageFallback, borderRadius: touch.min / 2 + 4, height: 48, justifyContent: 'center', width: 48 },
  iconCircleSuggested: { backgroundColor: colors.categoryTint },
  copy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  rowDescription: { color: colors.muted, fontSize: 13, fontWeight: '500', marginTop: 2 },
  suggestedBadge: { backgroundColor: colors.categoryTint, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  suggestedText: { color: colors.blue, fontSize: 11, fontWeight: '800' },
  pressed: { opacity: 0.75 },
})
