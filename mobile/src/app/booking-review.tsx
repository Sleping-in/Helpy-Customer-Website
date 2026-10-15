import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams, type Href } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  bookingPreflight,
  getServiceDetails,
  loadAddresses,
  type HomeAddress,
  type HomeService,
} from "../lib/helpy-api";
import { colors, radius, space } from "../lib/theme";

export default function BookingReviewScreen() {
  const params = useLocalSearchParams<{
    serviceVendorMapId?: string;
    date?: string;
    slot?: string;
  }>();
  const [service, setService] = useState<HomeService>();
  const [addresses, setAddresses] = useState<HomeAddress[]>([]);
  const [selected, setSelected] = useState("");
  const [preflight, setPreflight] = useState<Record<string, unknown>>();
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const id = Number(params.serviceVendorMapId);
    const timer = setTimeout(() => {
      if (!id) {
        setError("Missing service reference.");
        return;
      }
      void Promise.all([getServiceDetails(id), loadAddresses()])
        .then(async ([nextService, nextAddresses]) => {
          if (!active) return;
          setService(nextService);
          setAddresses(nextAddresses);
          setSelected(
            (nextAddresses.find((item) => item.isDefault) || nextAddresses[0])
              ?.id || "",
          );
          const result = await bookingPreflight(nextService.price);
          if (active) setPreflight(result);
        })
        .catch((reason) => {
          if (active)
            setError(
              reason instanceof Error
                ? reason.message
                : "Unable to prepare booking review.",
            );
        });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [params.serviceVendorMapId]);
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={21} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Review booking</Text>
        <View style={styles.back} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {service ? (
          <>
            <View style={styles.summary}>
              <Text style={styles.eyebrow}>SERVICE</Text>
              <Text style={styles.title}>{service.name}</Text>
              <Text style={styles.provider}>{service.provider}</Text>
              <View style={styles.meta}>
                <Text style={styles.metaText}>{params.date}</Text>
                <Text style={styles.dot}>•</Text>
                <Text style={styles.metaText}>{params.slot}</Text>
                <Text style={styles.price}>
                  {service.price > 0
                    ? `QAR ${service.price.toFixed(2)}`
                    : "Price on request"}
                </Text>
              </View>
            </View>
            <View style={styles.headingRow}>
              <Text style={styles.sectionTitle}>Service address</Text>
              <Pressable onPress={() => router.push("/addresses" as Href)}>
                <Text style={styles.manage}>Manage</Text>
              </Pressable>
            </View>
            {addresses.length ? (
              <View style={styles.addresses}>
                {addresses.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => setSelected(item.id)}
                    style={[
                      styles.address,
                      selected === item.id && styles.addressActive,
                    ]}
                  >
                    <Ionicons
                      name={
                        selected === item.id
                          ? "radio-button-on"
                          : "radio-button-off"
                      }
                      size={21}
                      color={colors.blue}
                    />
                    <View style={styles.addressCopy}>
                      <Text style={styles.addressTitle}>{item.title}</Text>
                      <Text style={styles.addressText}>{item.address}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Pressable
                onPress={() => router.push("/addresses" as Href)}
                style={styles.emptyAddress}
              >
                <Text style={styles.emptyAddressText}>
                  Add an address before booking
                </Text>
              </Pressable>
            )}
            <View style={styles.preflight}>
              <Text style={styles.preflightTitle}>Payment preflight</Text>
              <Text style={styles.preflightText}>
                Wallet balance: QAR{" "}
                {String(preflight?.wallet_balance ?? "0.00")}
              </Text>
              <Text style={styles.preflightText}>
                Next step:{" "}
                {String(
                  preflight?.next_step ?? "choose_payment_method",
                ).replaceAll("_", " ")}
              </Text>
            </View>
            <View style={styles.notice}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={colors.blue}
              />
              <Text style={styles.noticeText}>
                The backend validated the price and wallet state. Final
                submission stays disabled until the payment method and
                production-write flow are approved.
              </Text>
            </View>
            <Pressable disabled style={styles.disabled}>
              <Text style={styles.disabledText}>
                Final confirmation not enabled
              </Text>
            </Pressable>
          </>
        ) : error ? (
          <View style={styles.state}>
            <Text style={styles.stateTitle}>Couldn’t prepare booking</Text>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : (
          <ActivityIndicator color={colors.blue} style={styles.loading} />
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
  content: { padding: space.lg, paddingBottom: 34 },
  loading: { marginTop: 120 },
  summary: {
    backgroundColor: colors.blue,
    borderRadius: radius.xl,
    padding: 20,
  },
  eyebrow: {
    color: "#cfe1ff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  title: { color: colors.white, fontSize: 22, fontWeight: "800", marginTop: 7 },
  provider: { color: "#dce9ff", fontSize: 13, marginTop: 5 },
  meta: { alignItems: "center", flexDirection: "row", marginTop: 17 },
  metaText: { color: colors.white, fontSize: 12, fontWeight: "700" },
  dot: { color: "#a9c9fa", marginHorizontal: 8 },
  price: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
    marginLeft: "auto",
  },
  headingRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 24,
  },
  sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  manage: { color: colors.blue, fontSize: 13, fontWeight: "700" },
  addresses: { gap: 9, marginTop: 12 },
  address: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    padding: 14,
  },
  addressActive: {
    backgroundColor: colors.categoryTint,
    borderColor: colors.blue,
  },
  addressCopy: { flex: 1, marginLeft: 10 },
  addressTitle: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  addressText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3,
  },
  emptyAddress: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.blue,
    borderRadius: radius.lg,
    borderStyle: "dashed",
    borderWidth: 1,
    marginTop: 12,
    padding: 20,
  },
  emptyAddressText: { color: colors.blue, fontWeight: "700" },
  preflight: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: 18,
    padding: 16,
  },
  preflightTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  preflightText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 7,
    textTransform: "capitalize",
  },
  notice: {
    alignItems: "flex-start",
    backgroundColor: colors.categoryTint,
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
    padding: 15,
  },
  noticeText: { color: colors.muted, flex: 1, fontSize: 12, lineHeight: 18 },
  disabled: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: radius.lg,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 52,
    opacity: 0.45,
  },
  disabledText: { color: colors.white, fontWeight: "800" },
  state: { alignItems: "center", paddingTop: 110 },
  stateTitle: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  stateText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
    textAlign: "center",
  },
});
