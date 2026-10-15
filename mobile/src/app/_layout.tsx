import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade', gestureEnabled: true }}>
        <Stack.Screen name="add-address" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="addresses" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="booking-detail" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="booking-review" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="catalog" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="business-detail" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  )
}
