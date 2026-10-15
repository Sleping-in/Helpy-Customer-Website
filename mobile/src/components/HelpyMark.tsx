import { Image, StyleSheet, View } from 'react-native'

export function HelpyMark({ size = 126 }: { size?: number }) {
  return (
    <View style={[styles.wrap, { width: size, height: size * 0.71 }]}>
      <Image source={require('../../assets/helpy/logo.png')} style={styles.logo} resizeMode="contain" />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  logo: { width: '100%', height: '100%' },
})
