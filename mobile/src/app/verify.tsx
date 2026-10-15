import { useRef, useState } from 'react'
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { HelpyMark } from '../components/HelpyMark'
import { requestLoginOtp, verifyLoginOtp } from '../lib/helpy-auth'

const DIGIT_COUNT = 6

export default function VerifyScreen() {
  const { email = '' } = useLocalSearchParams<{ email: string }>()
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const inputs = useRef<(TextInput | null)[]>([])

  const updateDigit = (value: string, index: number) => {
    const incoming = value.replace(/\D/g, '')
    const next = [...digits]
    if (incoming) {
      incoming.slice(0, DIGIT_COUNT - index).split('').forEach((digit, offset) => { next[index + offset] = digit })
      inputs.current[Math.min(index + incoming.length, DIGIT_COUNT - 1)]?.focus()
    } else {
      next[index] = ''
    }
    setDigits(next)
    setError('')
  }

  const verify = async () => {
    const code = digits.join('')
    if (!email || code.length !== DIGIT_COUNT) {
      setError('Enter the complete six-digit verification code.')
      return
    }
    setLoading(true)
    setError('')
    try {
      await verifyLoginOtp(email, code)
      router.replace('/home')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to verify the code.')
    } finally {
      setLoading(false)
    }
  }

  const resend = async () => {
    setLoading(true)
    setError('')
    try {
      await requestLoginOtp(email)
      setDigits(Array(DIGIT_COUNT).fill(''))
      inputs.current[0]?.focus()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to resend the code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.select({ ios: 'padding', android: undefined })}>
        <View style={styles.topRow}>
          <Pressable accessibilityLabel="Back to Sign In" hitSlop={10} onPress={() => router.back()}><Text style={styles.back}>‹ Back</Text></Pressable>
          <HelpyMark size={74} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Verify Code</Text>
          <Text style={styles.subtitle}>We sent a verification code to</Text>
          <Text numberOfLines={1} style={styles.email}>{email || 'your email address'}</Text>
        </View>
        <View accessibilityLabel="Six-digit verification code" style={styles.codeRow}>
          {digits.map((digit, index) => (
            <TextInput
              accessibilityLabel={`Digit ${index + 1} of ${DIGIT_COUNT}`}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              key={index}
              keyboardType="number-pad"
              maxLength={DIGIT_COUNT}
              onChangeText={(value) => updateDigit(value, index)}
              onKeyPress={({ nativeEvent }) => {
                if (nativeEvent.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus()
              }}
              ref={(element) => { inputs.current[index] = element }}
              selectTextOnFocus
              style={[styles.digit, error ? styles.digitError : null]}
              value={digit}
            />
          ))}
        </View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <Pressable accessibilityRole="button" disabled={loading} onPress={() => void verify()} style={({ pressed }) => [styles.primaryButton, (pressed || loading) && styles.primaryButtonPressed]}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
        </Pressable>
        <View style={styles.resendBox}>
          <Text style={styles.resendCopy}>Didn’t get a code?</Text>
          <Pressable disabled={loading} onPress={() => void resend()}><Text style={styles.resend}>Resend OTP</Text></Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#e8f4ff' },
  screen: { flex: 1, paddingHorizontal: 28, paddingTop: 18 },
  topRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  back: { color: '#0967ff', fontSize: 16, fontWeight: '700' },
  copy: { marginTop: 58 },
  title: { color: '#101b3d', fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  subtitle: { color: '#52647f', fontSize: 16, marginTop: 16 },
  email: { color: '#0967ff', fontSize: 16, fontWeight: '800', marginTop: 4 },
  codeRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between', marginTop: 42 },
  digit: { backgroundColor: '#fff', borderColor: '#d5e4fa', borderRadius: 14, borderWidth: 1, color: '#0967ff', fontSize: 26, fontWeight: '800', height: 58, textAlign: 'center', width: 48 },
  digitError: { borderColor: '#d45050' },
  error: { color: '#c43232', fontSize: 13, fontWeight: '700', lineHeight: 19, marginTop: 14, textAlign: 'center' },
  primaryButton: { alignItems: 'center', backgroundColor: '#0967ff', borderRadius: 16, height: 56, justifyContent: 'center', marginTop: 32, shadowColor: '#0967ff', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.24, shadowRadius: 16 },
  primaryButtonPressed: { opacity: 0.72 },
  primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  resendBox: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.78)', borderRadius: 16, marginTop: 28, paddingVertical: 16 },
  resendCopy: { color: '#4d5e78', fontSize: 15, fontWeight: '600' },
  resend: { color: '#0967ff', fontSize: 15, fontWeight: '800', marginTop: 6 },
})
