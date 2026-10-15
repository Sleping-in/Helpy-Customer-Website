import { useEffect } from 'react'
import { Image, StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { hasUserSession } from '../lib/session'

export default function SplashScreen() {
  useEffect(() => {
    let active = true
    const bootstrap = async () => {
      const signedIn = await hasUserSession().catch(() => false)
      if (!active) return
      setTimeout(() => {
        if (active) router.replace(signedIn ? '/home' : '/sign-in')
      }, 850)
    }
    void bootstrap()
    return () => { active = false }
  }, [])

  return (
    <View style={styles.container} accessibilityLabel="Helpy Loading">
      <Image source={require('../../assets/helpy/splash-start.png')} style={styles.background} resizeMode="cover" />
      <Image source={require('../../assets/helpy/splash-end.png')} style={styles.brand} resizeMode="cover" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  background: StyleSheet.absoluteFill,
  brand: StyleSheet.absoluteFill,
})
