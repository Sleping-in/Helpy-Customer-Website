import { Ionicons } from '@expo/vector-icons'
import { useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { normalizeMatchKey } from '../../lib/geocoding'
import { colors, radius, space, touch } from '../../lib/theme'

export type PickerOption = { id: number; label: string }

type Props = {
  visible: boolean
  title: string
  options: PickerOption[]
  selectedId: number | null
  loading?: boolean
  searchPlaceholder?: string
  onSelect: (id: number) => void
  onClose: () => void
}

/** Clean bottom list picker with search. Mounted per selector; resets its query on close. */
export function OptionPickerModal({ visible, title, options, selectedId, loading, searchPlaceholder = 'Search', onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')
  const shown = useMemo(() => {
    const key = normalizeMatchKey(query)
    if (!key) return options
    return options.filter(option => normalizeMatchKey(option.label).includes(key))
  }, [options, query])

  const close = () => { setQuery(''); onClose() }

  return (
    <Modal animationType="slide" onRequestClose={close} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel={`Close ${title}`} accessibilityRole="button" onPress={close} style={StyleSheet.absoluteFill} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.dock}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, space.lg) }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable accessibilityLabel="Close" accessibilityRole="button" hitSlop={8} onPress={close} style={styles.closeButton}>
                <Ionicons name="close" size={22} color={colors.ink} />
              </Pressable>
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.searchIcon} />
              <TextInput
                accessibilityLabel={`Search ${title}`}
                autoCorrect={false}
                onChangeText={setQuery}
                placeholder={searchPlaceholder}
                placeholderTextColor={colors.placeholder}
                style={styles.searchInput}
                value={query}
              />
              {query ? (
                <Pressable accessibilityLabel="Clear Search" accessibilityRole="button" hitSlop={8} onPress={() => setQuery('')} style={styles.clear}>
                  <Ionicons name="close-circle" size={18} color={colors.searchIcon} />
                </Pressable>
              ) : null}
            </View>
            {loading ? <ActivityIndicator color={colors.blue} style={styles.loading} /> : (
              <FlatList
                data={shown}
                keyboardShouldPersistTaps="handled"
                keyExtractor={item => String(item.id)}
                ListEmptyComponent={<Text style={styles.empty}>No matches found.</Text>}
                renderItem={({ item }) => {
                  const selected = item.id === selectedId
                  return (
                    <Pressable
                      accessibilityLabel={item.label}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => { setQuery(''); onSelect(item.id) }}
                      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                    >
                      <Text style={[styles.rowText, selected && styles.rowTextSelected]}>{item.label}</Text>
                      {selected ? <Ionicons name="checkmark" size={20} color={colors.blue} /> : null}
                    </Pressable>
                  )
                }}
                showsVerticalScrollIndicator={false}
                style={styles.list}
              />
            )}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: colors.scrim, flex: 1, justifyContent: 'flex-end' },
  dock: { justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, height: 520, maxHeight: '85%', paddingHorizontal: space.xl, paddingTop: space.md },
  handle: { alignSelf: 'center', backgroundColor: colors.sheetHandle, borderRadius: 3, height: 5, marginBottom: space.md, width: 44 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.sm },
  title: { color: colors.ink, fontSize: 20, fontWeight: '800' },
  closeButton: { alignItems: 'center', height: touch.min, justifyContent: 'center', marginRight: -space.sm, width: touch.min },
  searchBox: { alignItems: 'center', backgroundColor: colors.imageFallback, borderRadius: radius.pill, flexDirection: 'row', gap: space.sm, height: 48, paddingHorizontal: space.lg },
  searchInput: { color: colors.ink, flex: 1, fontSize: 15, paddingVertical: 0 },
  clear: { alignItems: 'center', height: touch.min, justifyContent: 'center', width: 32 },
  list: { marginTop: space.sm },
  loading: { marginTop: space.xxxl },
  row: { alignItems: 'center', borderBottomColor: colors.sheetDivider, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, paddingVertical: space.md },
  rowText: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '600' },
  rowTextSelected: { color: colors.blue, fontWeight: '800' },
  empty: { color: colors.muted, fontSize: 14, fontWeight: '600', paddingVertical: space.xxl, textAlign: 'center' },
  pressed: { opacity: 0.7 },
})
