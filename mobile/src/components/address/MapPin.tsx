import { Ionicons } from '@expo/vector-icons'
import { Animated, StyleSheet, View } from 'react-native'
import { colors } from '../../lib/theme'

const BADGE = 46
const POINTER = 12
/** Total marker height. The bottom of the pointer is the selected coordinate. */
export const PIN_HEIGHT = BADGE + POINTER / 2

type Props = {
  /** 0 = resting on the ground, 1 = lifted (map is moving). Drive with the native driver. */
  lift: Animated.Value
}

/**
 * Familiar native-style marker: a white circular badge with a blue location glyph and a
 * short pointer. It remains readable over either light or dark map tiles.
 *
 * GEOMETRY: this component renders a ZERO-SIZE anchor. Place the anchor at the exact pick
 * point (`left: '50%', top: '50%'` of the map container). Everything is positioned relative
 * to that point: the pin's tip is at (0, 0), the head sits above it, and the ground dot is
 * centred on it. So the picked coordinate == the tip == the ground dot centre.
 */
export function MapPin({ lift }: Props) {
  return (
    <View pointerEvents="none" style={styles.anchor}>
      <Animated.View
        style={[styles.ground, {
          opacity: lift.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.15] }),
          transform: [{ scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
        }]}
      />
      <Animated.View
        style={[styles.pin, {
          transform: [{ translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }],
        }]}
      >
        <View style={styles.pointer} />
        <View style={styles.badge}>
          <Ionicons name="location-sharp" size={27} color={colors.blue} />
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  anchor: { height: 0, left: '50%', overflow: 'visible', position: 'absolute', top: '50%', width: 0 },
  pin: { alignItems: 'center', height: PIN_HEIGHT, left: -BADGE / 2, position: 'absolute', top: -PIN_HEIGHT, width: BADGE },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.white,
    borderColor: colors.cardBorder,
    borderRadius: BADGE / 2,
    borderWidth: 1,
    height: BADGE,
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    width: BADGE,
    zIndex: 2,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 5,
  },
  pointer: {
    backgroundColor: colors.white,
    borderBottomColor: colors.cardBorder,
    borderBottomWidth: 1,
    borderRightColor: colors.cardBorder,
    borderRightWidth: 1,
    bottom: 3,
    height: POINTER,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    width: POINTER,
    zIndex: 1,
  },
  ground: { backgroundColor: colors.ink, borderRadius: 3, height: 6, left: -3, position: 'absolute', top: -3, width: 6 },
})
