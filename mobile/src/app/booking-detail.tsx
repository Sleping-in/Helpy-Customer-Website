import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getBookingDetails, type HelpyBooking } from "../lib/helpy-api";
import { colors, radius, space } from "../lib/theme";

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [item, setItem] = useState<HelpyBooking>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (!id) {
        setError("This booking is currently unavailable.");
        return;
      }
      void getBookingDetails(id)
        .then((value) => {
          if (!active) return;
          if (value) setItem(value);
          else setError("Booking not found.");
        })
        .catch((reason) => {
          if (active)
            setError(
              reason instanceof Error
                ? reason.message
                : "Unable to load this booking.",
            );
        });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id]);
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={21} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Booking details</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {item ? (
          <>
            <View style={styles.hero}>
              {item.image ? (
                <Image source={{ uri: item.image }} style={styles.image} />
              ) : (
                <View style={styles.fallback}>
                  <Ionicons
                    name="calendar-outline"
                    size={34}
                    color={colors.blue}
                  />
                </View>
              )}
              <View style={styles.heroCopy}>
                <Text style={styles.service}>{item.service}</Text>
                <Text style={styles.provider}>{item.provider}</Text>
                <Text style={styles.status}>{item.status}</Text>
              </View>
            </View>
            <View style={styles.panel}>
              <Row
                icon="calendar-outline"
                label="Date"
                value={item.date || "Pending"}
              />
              <Row
                icon="time-outline"
                label="Time"
                value={item.time || "Pending"}
              />
              <Row
                icon="location-outline"
                label="Service address"
                value={item.address || "Not returned"}
              />
              <Row
                icon="receipt-outline"
                label="Total"
                value={
                  item.price > 0
                    ? `QAR ${item.price.toFixed(2)}`
                    : "Not returned"
                }
              />
            </View>
          </>
        ) : error ? (
          <View style={styles.state}>
            <Ionicons
              name="alert-circle-outline"
              size={38}
              color={colors.blue}
            />
            <Text style={styles.stateTitle}>Couldn’t load booking</Text>
            <Text style={styles.stateCopy}>{error}</Text>
          </View>
        ) : (
          <ActivityIndicator color={colors.blue} style={styles.loading} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
function Row({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={colors.blue} />
      </View>
      <View style={styles.rowCopy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{value}</Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  header: {
    alignItems: "center",
    borderBottomColor: colors.cardBorder,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 58,
    paddingHorizontal: space.md,
  },
  back: {
    alignItems: "center",
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  headerTitle: {
    color: colors.ink,
    flex: 1,
    fontSize: 19,
    fontWeight: "700",
    textAlign: "center",
  },
  content: { padding: space.lg },
  loading: { marginTop: 120 },
  hero: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: "row",
    padding: 14,
  },
  image: { borderRadius: radius.md, height: 88, width: 88 },
  fallback: {
    alignItems: "center",
    backgroundColor: colors.imageFallback,
    borderRadius: radius.md,
    height: 88,
    justifyContent: "center",
    width: 88,
  },
  heroCopy: { flex: 1, marginLeft: 14 },
  service: { color: colors.ink, fontSize: 19, fontWeight: "800" },
  provider: { color: colors.muted, fontSize: 13, marginTop: 5 },
  status: {
    alignSelf: "flex-start",
    backgroundColor: colors.categoryTint,
    borderRadius: 9,
    color: colors.blue,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 10,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  panel: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginTop: 16,
    overflow: "hidden",
  },
  row: {
    alignItems: "center",
    borderBottomColor: colors.cardBorder,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 76,
    padding: 14,
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: colors.categoryTint,
    borderRadius: 16,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  rowCopy: { flex: 1, marginLeft: 12 },
  label: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  value: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 3,
  },
  state: { alignItems: "center", paddingTop: 110 },
  stateTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 13,
  },
  stateCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    textAlign: "center",
  },
});
