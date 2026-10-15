import { Ionicons } from '@expo/vector-icons'
import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { markFieldEdited, loadStatesCached } from '../../lib/address-autofill'
import type { AddressDraft } from '../../lib/address-draft'
import { getCities, type HelpyCity, type HelpyState } from '../../lib/helpy-api'
import { colors, radius, space, touch } from '../../lib/theme'
import { AddressField, AddressSelect } from './AddressField'
import { ADDRESS_TYPES } from './AddressTypeStep'
import { OptionPickerModal } from './OptionPickerModal'

type TextKey = 'name' | 'building' | 'street' | 'zone' | 'floor' | 'apartment' | 'landmark' | 'notes'
type RequiredKey = 'street' | 'zone' | 'stateId' | 'cityId'

const REQUIRED_LABELS: Record<RequiredKey, string> = {
  street: 'Street',
  zone: 'Zone',
  stateId: 'Municipality',
  cityId: 'Area',
}

const REQUIRED_MESSAGES: Record<RequiredKey, string> = {
  street: 'Enter the Qatar street number.',
  zone: 'Enter the Qatar zone number.',
  stateId: 'Choose a municipality.',
  cityId: 'Choose an area.',
}

type Props = {
  form: AddressDraft
  onChange: (next: AddressDraft) => void
  onChangeType: () => void
  onSave: () => void
  saving: boolean
  error: string
  bottomPadding: number
}

/** Sheet step B — the address form. Header + chip and the footer CTA stay fixed; fields scroll. */
export function AddressDetailsStep({ form, onChange, onChangeType, onSave, saving, error, bottomPadding }: Props) {
  const [states, setStates] = useState<HelpyState[]>([])
  const [statesError, setStatesError] = useState('')
  const [cityRows, setCityRows] = useState<{ stateId: number; rows: HelpyCity[] } | null>(null)
  const [picker, setPicker] = useState<'state' | 'city' | null>(null)
  const [touched, setTouched] = useState<Partial<Record<RequiredKey, boolean>>>({})

  useEffect(() => {
    let active = true
    loadStatesCached()
      .then(rows => { if (active) setStates(rows) })
      .catch(reason => { if (active) setStatesError(reason instanceof Error ? reason.message : 'Unable to load municipalities.') })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const stateId = form.stateId
    if (!stateId) return
    let active = true
    getCities(stateId)
      .then(rows => { if (active) setCityRows({ stateId, rows }) })
      .catch(() => { if (active) setCityRows({ stateId, rows: [] }) })
    return () => { active = false }
  }, [form.stateId])

  const cityOptions = useMemo(() => (cityRows && cityRows.stateId === form.stateId ? cityRows.rows : []), [cityRows, form.stateId])
  const citiesLoading = Boolean(form.stateId) && cityRows?.stateId !== form.stateId
  const stateName = states.find(item => item.id === form.stateId)?.name || ''
  const cityName = cityOptions.find(item => item.id === form.cityId)?.name || ''

  const missing = (Object.keys(REQUIRED_LABELS) as RequiredKey[]).filter(key => {
    const value = form[key]
    return typeof value === 'number' ? !value : !String(value ?? '').trim()
  })
  const valid = missing.length === 0
  const fieldError = (key: RequiredKey) => (touched[key] && missing.includes(key) ? REQUIRED_MESSAGES[key] : undefined)
  const touch1 = (key: RequiredKey) => () => setTouched(current => ({ ...current, [key]: true }))

  const setText = (key: TextKey, value: string) => {
    let next: AddressDraft = { ...form, [key]: value }
    if (key === 'building' || key === 'street' || key === 'zone' || key === 'landmark') next = markFieldEdited(next, key)
    onChange(next)
  }

  const typeMeta = ADDRESS_TYPES.find(item => item.kind === form.labelKind) || ADDRESS_TYPES[2]

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{form.mode === 'edit' ? 'Edit Address Details' : 'Add Address Details'}</Text>
        </View>
        <Pressable
          accessibilityHint="Choose a different address type"
          accessibilityLabel={`Address type ${typeMeta.kind}. Change`}
          accessibilityRole="button"
          hitSlop={6}
          onPress={onChangeType}
          style={({ pressed }) => [styles.typeChip, pressed && styles.pressed]}
        >
          <Ionicons name={typeMeta.icon} size={16} color={colors.blue} />
          <Text style={styles.typeChipText}>{typeMeta.kind}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.blue} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={styles.scroll}
      >
        <View style={styles.row}>
          <AddressField
            autofilled={form.autofilled.building === true}
            label="Building No"
            onChangeText={value => setText('building', value)}
            placeholder="Optional"
            value={form.building}
          />
          <View style={styles.gap} />
          <AddressField
            autofilled={form.autofilled.zone === true}
            error={fieldError('zone')}
            keyboardType="number-pad"
            label="Zone"
            maxLength={3}
            onBlur={touch1('zone')}
            onChangeText={value => setText('zone', value.replace(/\D/g, ''))}
            placeholder="e.g. 69"
            required
            value={form.zone}
          />
        </View>
        {!form.zone ? <Text style={styles.zoneHelper}>Zone cannot always be detected from the map. Enter the number shown on the Qatar address plate.</Text> : null}
        <AddressField
          autofilled={form.autofilled.street === true}
          error={fieldError('street')}
          keyboardType="number-pad"
          label="Street"
          maxLength={4}
          onBlur={touch1('street')}
          onChangeText={value => setText('street', value.replace(/\D/g, ''))}
          placeholder="e.g. 108"
          required
          value={form.street}
        />
        <AddressSelect
          autofilled={form.autofilled.stateId === true}
          error={fieldError('stateId') || statesError || undefined}
          label="Municipality"
          loading={!states.length && !statesError}
          onPress={() => setPicker('state')}
          placeholder="Select Municipality"
          required
          value={stateName}
        />
        <AddressSelect
          autofilled={form.autofilled.cityId === true}
          disabled={!form.stateId}
          error={fieldError('cityId')}
          helper={!form.stateId ? 'Choose a municipality first.' : undefined}
          label="Area"
          loading={citiesLoading}
          onPress={() => setPicker('city')}
          placeholder="Select Area"
          required
          value={cityName}
        />
        <AddressField
          autofilled={form.autofilled.landmark === true}
          label="Landmark"
          onChangeText={value => setText('landmark', value)}
          placeholder="Nearby landmark (optional)"
          value={form.landmark}
        />
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: bottomPadding }]}>
        {error ? <Text accessibilityRole="alert" style={styles.errorBanner}>{error}</Text> : null}
        {!valid && !error ? <Text style={styles.hint}>Still needed: {missing.map(key => REQUIRED_LABELS[key]).join(', ')}</Text> : null}
        <Pressable
          accessibilityLabel="Save Address"
          accessibilityRole="button"
          accessibilityState={{ disabled: !valid || saving, busy: saving }}
          disabled={!valid || saving}
          onPress={onSave}
          style={({ pressed }) => [styles.saveButton, (!valid || saving) && styles.saveDisabled, pressed && valid && !saving && styles.pressed]}
        >
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveText}>Save Address</Text>}
        </Pressable>
      </View>

      <OptionPickerModal
        onClose={() => setPicker(null)}
        onSelect={id => {
          const next = markFieldEdited({ ...form, stateId: id, cityId: form.stateId === id ? form.cityId : null }, 'stateId')
          if (form.stateId !== id) next.autofilled = { ...next.autofilled, cityId: false }
          onChange(next)
          setTouched(current => ({ ...current, stateId: true }))
          setPicker(null)
        }}
        options={states.map(item => ({ id: item.id, label: item.name }))}
        searchPlaceholder="Search municipality"
        selectedId={form.stateId}
        title="Municipality"
        visible={picker === 'state'}
      />
      <OptionPickerModal
        loading={citiesLoading}
        onClose={() => setPicker(null)}
        onSelect={id => {
          onChange(markFieldEdited({ ...form, cityId: id }, 'cityId'))
          setTouched(current => ({ ...current, cityId: true }))
          setPicker(null)
        }}
        options={cityOptions.map(item => ({ id: item.id, label: item.name }))}
        searchPlaceholder="Search area"
        selectedId={form.cityId}
        title="Area"
        visible={picker === 'city'}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: space.md, justifyContent: 'space-between', paddingBottom: space.md },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.4, lineHeight: 28 },
  caption: { color: colors.blue, fontSize: 12, fontWeight: '700', marginTop: 2 },
  typeChip: { alignItems: 'center', backgroundColor: colors.categoryTint, borderRadius: radius.pill, flexDirection: 'row', gap: 6, minHeight: touch.min - 4, paddingHorizontal: space.md },
  typeChipText: { color: colors.blue, fontSize: 13, fontWeight: '800' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: space.lg, paddingTop: space.xs },
  row: { flexDirection: 'row' },
  gap: { width: space.md },
  zoneHelper: { color: colors.muted, fontSize: 12, fontWeight: '500', lineHeight: 17, marginBottom: space.lg, marginTop: -space.sm },
  footer: { backgroundColor: colors.card, borderTopColor: colors.sheetDivider, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md },
  errorBanner: { backgroundColor: '#fff1f3', borderColor: '#ffd0d8', borderRadius: radius.lg, borderWidth: 1, color: colors.heart, fontSize: 13, fontWeight: '700', lineHeight: 19, marginBottom: space.md, padding: space.md },
  hint: { color: colors.muted, fontSize: 12, fontWeight: '600', marginBottom: space.sm, textAlign: 'center' },
  saveButton: { alignItems: 'center', backgroundColor: colors.blue, borderRadius: radius.pill, height: 54, justifyContent: 'center' },
  saveDisabled: { opacity: 0.45 },
  saveText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  pressed: { opacity: 0.75 },
})
