import { NativeTabs } from 'expo-router/unstable-native-tabs'
import { colors } from '../../lib/theme'

const BLUE = colors.blue
const MUTED = '#7b8aa3'

export default function TabsLayout() {
  return (
    <NativeTabs
      backgroundColor="#ffffff"
      tintColor={BLUE}
      iconColor={{ default: MUTED, selected: BLUE }}
      labelStyle={{ default: { color: MUTED, fontSize: 10, fontWeight: '400' }, selected: { color: BLUE, fontSize: 10, fontWeight: '600' } }}
      shadowColor="#e4edf8"
      blurEffect="none"
      disableTransparentOnScrollEdge
      minimizeBehavior="never"
    >
      <NativeTabs.Trigger name="index" accessibilityLabel="Home" disableScrollToTop>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md={{ default: 'home', selected: 'home' }} selectedColor={BLUE} />
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="bookings" accessibilityLabel="Bookings">
        <NativeTabs.Trigger.Icon sf={{ default: 'calendar', selected: 'calendar' }} md={{ default: 'calendar_month', selected: 'calendar_month' }} selectedColor={BLUE} />
        <NativeTabs.Trigger.Label>Bookings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages" accessibilityLabel="Messages">
        <NativeTabs.Trigger.Icon sf={{ default: 'bubble.left', selected: 'bubble.left.fill' }} md={{ default: 'chat_bubble_outline', selected: 'chat_bubble' }} selectedColor={BLUE} />
        <NativeTabs.Trigger.Label>Messages</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile" accessibilityLabel="Profile">
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md={{ default: 'person_outline', selected: 'person' }} selectedColor={BLUE} />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
