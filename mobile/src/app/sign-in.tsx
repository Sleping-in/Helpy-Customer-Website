import { useState } from 'react'
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { HelpyMark } from '../components/HelpyMark'
import { requestLoginOtp } from '../lib/helpy-auth'

const emailPattern = /^\S+@\S+\.\S+$/

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    const value = email.trim().toLowerCase()
    if (!emailPattern.test(value)) {
      setError('Enter a valid email address.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await requestLoginOtp(value)
      router.push({ pathname: '/verify', params: { email: value } })
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to send the verification code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.screen}>
      <Image source={require('../../assets/helpy/auth-wave.png')} style={styles.wave} resizeMode="cover" />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.content} behavior={Platform.select({ ios: 'padding', android: undefined })}>
          <View style={styles.brand}><HelpyMark /></View>
          <View style={styles.intro}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue and explore services near you.</Text>
          </View>

          <Text style={styles.label}>Email Address</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={(value) => { setEmail(value); setError('') }}
            onSubmitEditing={() => void submit()}
            placeholder="you@example.com"
            placeholderTextColor="#8290a5"
            returnKeyType="send"
            style={styles.input}
            value={email}
          />
          <Text style={styles.help}>We’ll send a secure six-digit verification code to this email.</Text>
          {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}

          <Pressable accessibilityRole="button" disabled={loading} onPress={() => void submit()} style={({ pressed }) => [styles.primaryButton, (pressed || loading) && styles.primaryButtonPressed]}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
          </Pressable>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#e8f4ff' },
  wave: { ...StyleSheet.absoluteFill, opacity: 0.6 },
  safe: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 28, paddingTop: 48 },
  brand: { alignItems: 'center' },
  intro: { alignItems: 'center', marginTop: 26, marginBottom: 38 },
  title: { color: '#101b3d', fontSize: 29, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { color: '#66758e', fontSize: 15, fontWeight: '500', lineHeight: 22, marginTop: 10, maxWidth: 300, textAlign: 'center' },
  label: { color: '#25375b', fontSize: 14, fontWeight: '700', marginBottom: 9 },
  input: { backgroundColor: '#fff', borderColor: '#cfe1fb', borderRadius: 16, borderWidth: 1, color: '#102044', fontSize: 16, height: 54, paddingHorizontal: 16 },
  help: { color: '#64748b', fontSize: 13, fontWeight: '500', lineHeight: 19, marginBottom: 20, marginTop: 12 },
  error: { color: '#c43232', fontSize: 13, fontWeight: '700', lineHeight: 19, marginBottom: 14 },
  primaryButton: { alignItems: 'center', backgroundColor: '#0967ff', borderRadius: 16, height: 54, justifyContent: 'center', shadowColor: '#0967ff', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.24, shadowRadius: 16 },
  primaryButtonPressed: { opacity: 0.72 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
})
