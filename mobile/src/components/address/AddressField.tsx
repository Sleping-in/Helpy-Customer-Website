import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native'
import { colors, radius, space, touch } from '../../lib/theme'

type BaseProps = {
  label: string
  required?: boolean
  autofilled?: boolean
  error?: string
  helper?: string
}

function FieldLabel({ label, required }: Pick<BaseProps, 'label' | 'required' | 'autofilled'>) {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}{required ? <Text style={styles.required}> *</Text> : null}</Text>
    </View>
  )
}

function FieldFooter({ error, helper }: Pick<BaseProps, 'error' | 'helper'>) {
  if (error) return <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
  if (helper) return <Text style={styles.helper}>{helper}</Text>
  return null
}

type FieldProps = BaseProps & {
  value: string
  onChangeText: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  keyboardType?: KeyboardTypeOptions
  multiline?: boolean
  maxLength?: number
  autoCapitalize?: 'none' | 'sentences' | 'words'
}

export function AddressField({ label, required, autofilled, error, helper, value, onChangeText, onBlur, placeholder, keyboardType, multiline, maxLength, autoCapitalize }: FieldProps) {
  const [focused, setFocused] = useState(false)
  return (
    <View style={styles.field}>
      <FieldLabel autofilled={autofilled} label={label} required={required} />
      <TextInput
        accessibilityLabel={required ? `${label}, required` : label}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        maxLength={maxLength}
        multiline={multiline}
        onBlur={() => { setFocused(false); onBlur?.() }}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        style={[styles.input, multiline && styles.inputMultiline, focused && styles.inputFocused, error ? styles.inputError : null]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
      <FieldFooter error={error} helper={helper} />
    </View>
  )
}

type SelectProps = BaseProps & {
  value: string
  placeholder: string
  disabled?: boolean
  loading?: boolean
  onPress: () => void
}

/** Looks like a field, opens a picker on tap. */
export function AddressSelect({ label, required, autofilled, error, helper, value, placeholder, disabled, loading, onPress }: SelectProps) {
  return (
    <View style={styles.field}>
      <FieldLabel autofilled={autofilled} label={label} required={required} />
      <Pressable
        accessibilityHint="Opens a list to choose from"
        accessibilityLabel={`${label}${required ? ', required' : ''}, ${value || placeholder}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: Boolean(disabled) }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.input, styles.select, disabled && styles.selectDisabled, error ? styles.inputError : null, pressed && styles.pressed]}
      >
        <Text numberOfLines={1} style={[styles.selectText, !value && styles.selectPlaceholder]}>{loading ? 'Loading…' : value || placeholder}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      <FieldFooter error={error} helper={helper} />
    </View>
  )
}

const styles = StyleSheet.create({
  field: { flex: 1, marginBottom: space.lg },
  labelRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, minHeight: 18 },
  label: { color: colors.categoryLabel, fontSize: 13, fontWeight: '700' },
  required: { color: colors.heart },
  input: { backgroundColor: colors.imageFallback, borderColor: 'transparent', borderRadius: radius.lg, borderWidth: 1.5, color: colors.ink, fontSize: 15, fontWeight: '600', minHeight: 52, paddingHorizontal: space.lg, paddingVertical: 12 },
  inputMultiline: { minHeight: 96, paddingTop: 14 },
  inputFocused: { backgroundColor: colors.card, borderColor: colors.blue },
  inputError: { backgroundColor: '#fff6f7', borderColor: colors.heart },
  select: { alignItems: 'center', flexDirection: 'row', gap: space.sm, justifyContent: 'space-between', minHeight: touch.min + 8 },
  selectDisabled: { opacity: 0.5 },
  selectText: { color: colors.ink, flex: 1, fontSize: 15, fontWeight: '600' },
  selectPlaceholder: { color: colors.placeholder, fontWeight: '500' },
  helper: { color: colors.muted, fontSize: 12, fontWeight: '500', lineHeight: 17, marginTop: 6 },
  error: { color: colors.heart, fontSize: 12, fontWeight: '700', marginTop: 6 },
  pressed: { opacity: 0.75 },
})
