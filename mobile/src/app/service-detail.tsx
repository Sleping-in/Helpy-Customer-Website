import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  getServiceDetails,
  getVendorAvailability,
  type HomeService,
} from "../lib/helpy-api";
import { colors, radius, space } from "../lib/theme";

type Slot = {
  day: string;
  slot: string;
  date: string;
  isAvailable: number | boolean;
};
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const labelDate = (date: Date) =>
  new Intl.DateTimeFormat("en-QA", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);

export default function ServiceDetailScreen() {
  const params = useLocalSearchParams<{ serviceVendorMapId?: string }>();
  const id = Number(params.serviceVendorMapId);
  const [service, setService] = useState<HomeService>();
  const [error, setError] = useState("");
  const [selectedDate, setSelectedDate] = useState(() =>
    dateKey(new Date(Date.now() + 86400000)),
  );
  const [slots, setSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [slotLoading, setSlotLoading] = useState(false);
  const dates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const next = new Date();
        next.setDate(next.getDate() + index + 1);
        return next;
      }),
    [],
  );

  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (!Number.isFinite(id) || id <= 0) {
        setError("This service is currently unavailable.");
        return;
      }
      void getServiceDetails(id)
        .then((value) => {
          if (active) {
            setService(value);
            setError("");
          }
        })
        .catch((reason) => {
          if (active)
            setError(
              reason instanceof Error
                ? reason.message
                : "Unable to load this service.",
            );
        });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [id]);
  const loadSlots = useCallback(async (value: HomeService, date: string) => {
    setSlotLoading(true);
    setSelectedSlot("");
    try {
      setSlots(
        (
          await getVendorAvailability(
            value.vendorId,
            value.serviceVendorMapId,
            date,
          )
        ).filter((item) => Boolean(Number(item.isAvailable))),
      );
    } catch (reason) {
      setSlots([]);
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load availability.",
      );
    } finally {
      setSlotLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!service?.vendorId || !service.serviceVendorMapId) return;
    const timer = setTimeout(() => {
      void loadSlots(service, selectedDate);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadSlots, selectedDate, service]);
  const review = () => {
    if (service && selectedSlot)
      router.push({
        pathname: "/booking-review",
        params: {
          serviceVendorMapId: String(service.serviceVendorMapId),
          date: selectedDate,
          slot: selectedSlot,
        },
      } as unknown as Href);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go Back"
          onPress={() => router.back()}
          style={styles.back}
        >
          <Ionicons name="arrow-back" size={21} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Service details</Text>
        <View style={styles.back} />
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {service ? (
          <>
            <View style={styles.hero}>
              {service.image ? (
                <Image
                  source={{ uri: service.image }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.heroFallback}>
                  <Text style={styles.heroInitials}>
                    {service.name.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.category}>
              <Text style={styles.categoryText}>{service.category}</Text>
            </View>
            <Text style={styles.title}>{service.name}</Text>
            <Text style={styles.provider}>{service.provider}</Text>
            <View style={styles.meta}>
              <Ionicons name="star" size={17} color="#f7bd13" />
              <Text style={styles.metaText}>
                {service.rating.toFixed(1)} ({service.reviews})
              </Text>
              {service.price > 0 ? (
                <Text style={styles.price}>QAR {service.price.toFixed(2)}</Text>
              ) : null}
            </View>
            <Text style={styles.description}>
              {service.description ||
                "Service details will be provided by the service provider."}
            </Text>
            <Text style={styles.sectionTitle}>Choose a date</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.dateRail}
            >
              {dates.map((date) => {
                const key = dateKey(date);
                const active = selectedDate === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelectedDate(key)}
                    style={[styles.date, active && styles.dateActive]}
                  >
                    <Text
                      style={[styles.dateText, active && styles.dateTextActive]}
                    >
                      {labelDate(date)}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <Text style={styles.sectionTitle}>Available times</Text>
            {slotLoading ? (
              <ActivityIndicator
                color={colors.blue}
                style={styles.slotLoading}
              />
            ) : slots.length ? (
              <View style={styles.slotGrid}>
                {slots.map((item) => {
                  const active = selectedSlot === item.slot;
                  return (
                    <Pressable
                      key={`${item.date}-${item.slot}`}
                      onPress={() => setSelectedSlot(item.slot)}
                      style={[styles.slot, active && styles.slotActive]}
                    >
                      <Text
                        style={[
                          styles.slotText,
                          active && styles.slotTextActive,
                        ]}
                      >
                        {item.slot}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <Text style={styles.noSlots}>
                No available times were returned for this date.
              </Text>
            )}
            <Pressable
              disabled={!selectedSlot}
              onPress={review}
              style={[styles.button, !selectedSlot && styles.buttonDisabled]}
            >
              <Text style={styles.buttonText}>Review booking</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </Pressable>
          </>
        ) : error ? (
          <View style={styles.state}>
            <Ionicons
              name="alert-circle-outline"
              size={34}
              color={colors.blue}
            />
            <Text style={styles.stateTitle}>Unable to load service</Text>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : (
          <ActivityIndicator
            color={colors.blue}
            size="large"
            style={styles.loading}
          />
        )}
      </ScrollView>
    </SafeAreaView>
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
  content: { padding: space.lg, paddingBottom: 36 },
  loading: { marginTop: 120 },
  hero: {
    backgroundColor: colors.imageFallback,
    borderRadius: radius.xl,
    height: 220,
    overflow: "hidden",
  },
  heroImage: { height: "100%", width: "100%" },
  heroFallback: { alignItems: "center", flex: 1, justifyContent: "center" },
  heroInitials: { color: colors.blue, fontSize: 36, fontWeight: "800" },
  category: {
    alignSelf: "flex-start",
    backgroundColor: colors.categoryTint,
    borderRadius: 10,
    marginTop: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  categoryText: { color: colors.blue, fontSize: 12, fontWeight: "700" },
  title: { color: colors.ink, fontSize: 26, fontWeight: "800", marginTop: 11 },
  provider: { color: colors.muted, fontSize: 14, marginTop: 5 },
  meta: { alignItems: "center", flexDirection: "row", gap: 5, marginTop: 13 },
  metaText: { color: colors.muted, fontSize: 13, fontWeight: "600" },
  price: {
    color: colors.blue,
    fontSize: 16,
    fontWeight: "800",
    marginLeft: "auto",
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 17,
  },
  sectionTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "800",
    marginTop: 25,
  },
  dateRail: { gap: 9, paddingVertical: 12 },
  date: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  dateActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  dateText: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  dateTextActive: { color: colors.white },
  slotLoading: { marginVertical: 25 },
  slotGrid: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 12 },
  slot: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    minWidth: "30%",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  slotActive: {
    backgroundColor: colors.categoryTint,
    borderColor: colors.blue,
  },
  slotText: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  slotTextActive: { color: colors.blue },
  noSlots: { color: colors.muted, fontSize: 13, lineHeight: 20, marginTop: 11 },
  button: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 25,
    minHeight: 54,
  },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: "800" },
  state: { alignItems: "center", paddingTop: 110 },
  stateTitle: {
    color: colors.ink,
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
  },
  stateText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
    textAlign: "center",
  },
});
