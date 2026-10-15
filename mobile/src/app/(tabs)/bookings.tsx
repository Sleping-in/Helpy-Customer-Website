import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getBookings, type HelpyBooking } from "../../lib/helpy-api";
import { colors, radius, space } from "../../lib/theme";

function readable(value: string) {
  if (!value) return "Date pending";
  const date = new Date(value.includes("T") ? value : value.replace(" ", "T"));
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-QA", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(date);
}

export default function BookingsScreen() {
  const [bookings, setBookings] = useState<HelpyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      setBookings(await getBookings());
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to load bookings.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
      return undefined;
    }, [load]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load(true)}
            tintColor={colors.blue}
          />
        }
      >
        <Text style={styles.eyebrow}>YOUR BOOKINGS</Text>
        <Text style={styles.title}>Bookings</Text>
        {loading ? (
          <View style={styles.state}>
            <ActivityIndicator color={colors.blue} />
          </View>
        ) : error ? (
          <View style={styles.state}>
            <Ionicons
              name="cloud-offline-outline"
              size={34}
              color={colors.blue}
            />
            <Text style={styles.stateTitle}>Couldn’t load bookings</Text>
            <Text style={styles.stateText}>{error}</Text>
            <Pressable onPress={() => void load()} style={styles.retry}>
              <Text style={styles.retryText}>Try again</Text>
            </Pressable>
          </View>
        ) : bookings.length ? (
          <View style={styles.list}>
            {bookings.map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  router.push({
                    pathname: "/booking-detail",
                    params: { id: item.id },
                  } as unknown as Href)
                }
                style={styles.card}
              >
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.image} />
                ) : (
                  <View style={styles.imageFallback}>
                    <Ionicons
                      name="calendar-outline"
                      size={26}
                      color={colors.blue}
                    />
                  </View>
                )}
                <View style={styles.copy}>
                  <View style={styles.row}>
                    <Text numberOfLines={1} style={styles.service}>
                      {item.service}
                    </Text>
                    <Text style={styles.status}>{item.status}</Text>
                  </View>
                  <Text numberOfLines={1} style={styles.provider}>
                    {item.provider}
                  </Text>
                  <View style={styles.meta}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color={colors.muted}
                    />
                    <Text style={styles.metaText}>{readable(item.date)}</Text>
                    {item.price > 0 ? (
                      <Text style={styles.price}>
                        QAR {item.price.toFixed(2)}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.chevron}
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.state}>
            <Ionicons
              name="calendar-clear-outline"
              size={38}
              color={colors.blue}
            />
            <Text style={styles.stateTitle}>No bookings yet</Text>
            <Text style={styles.stateText}>
              Your upcoming and previous appointments will appear here.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 28, paddingHorizontal: space.lg },
  eyebrow: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginTop: 15,
  },
  title: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 20,
    marginTop: 6,
  },
  list: { gap: 13 },
  card: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: "row",
    padding: 12,
  },
  image: { borderRadius: radius.md, height: 78, width: 78 },
  imageFallback: {
    alignItems: "center",
    backgroundColor: colors.imageFallback,
    borderRadius: radius.md,
    height: 78,
    justifyContent: "center",
    width: 78,
  },
  copy: { flex: 1, marginLeft: 13, minWidth: 0 },
  row: { alignItems: "center", flexDirection: "row", gap: 8 },
  service: { color: colors.ink, flex: 1, fontSize: 16, fontWeight: "700" },
  status: {
    backgroundColor: colors.categoryTint,
    borderRadius: 10,
    color: colors.blue,
    fontSize: 10,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  provider: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "500",
    marginTop: 5,
  },
  meta: { alignItems: "center", flexDirection: "row", gap: 5, marginTop: 10 },
  metaText: { color: colors.muted, fontSize: 12 },
  price: {
    color: colors.blue,
    fontSize: 12,
    fontWeight: "700",
    marginLeft: "auto",
  },
  state: { alignItems: "center", paddingHorizontal: 26, paddingTop: 110 },
  stateTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 14,
  },
  stateText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    textAlign: "center",
  },
  retry: {
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  retryText: { color: colors.white, fontWeight: "700" },
});
