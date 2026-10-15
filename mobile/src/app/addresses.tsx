import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  beginAddAddressDraft,
  beginEditAddressDraft,
} from "../lib/address-draft";
import {
  deleteAddress,
  loadAddresses,
  type HomeAddress,
} from "../lib/helpy-api";
import { colors, radius, space } from "../lib/theme";

const iconFor = (title: string): keyof typeof Ionicons.glyphMap =>
  /^home$/i.test(title)
    ? "home-outline"
    : /^(work|office)$/i.test(title)
      ? "briefcase-outline"
      : "location-outline";

export default function AddressesScreen() {
  const [items, setItems] = useState<HomeAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      setItems(await loadAddresses());
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load saved locations.",
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
  const add = () => {
    beginAddAddressDraft(items.map((item) => item.title));
    router.push("/add-address");
  };
  const edit = (item: HomeAddress) => {
    beginEditAddressDraft(item);
    router.push({ pathname: "/add-address", params: { mode: "edit" } });
  };
  const remove = (item: HomeAddress) =>
    Alert.alert("Delete this address?", item.address, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          void (async () => {
            try {
              await deleteAddress(item.id);
              await load();
            } catch (reason) {
              Alert.alert(
                "Could Not Delete Address",
                reason instanceof Error ? reason.message : "Please try again.",
              );
            }
          })(),
      },
    ]);
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go Back"
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={21} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Saved locations</Text>
        <Pressable
          accessibilityLabel="Add Address"
          onPress={add}
          style={styles.headerButton}
        >
          <Ionicons name="add" size={24} color={colors.blue} />
        </Pressable>
      </View>
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
        {loading ? (
          <ActivityIndicator color={colors.blue} style={styles.loading} />
        ) : error ? (
          <State
            icon="cloud-offline-outline"
            title="Couldn’t load locations"
            copy={error}
          />
        ) : items.length ? (
          <View style={styles.list}>
            {items.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.icon}>
                  <Ionicons
                    name={iconFor(item.title)}
                    size={22}
                    color={colors.blue}
                  />
                </View>
                <View style={styles.copy}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title}>{item.title}</Text>
                    {item.isDefault ? (
                      <Text style={styles.defaultChip}>Default</Text>
                    ) : null}
                  </View>
                  <Text style={styles.address}>{item.address}</Text>
                </View>
                <Pressable
                  accessibilityLabel={`Edit ${item.title}`}
                  onPress={() => edit(item)}
                  style={styles.action}
                >
                  <Ionicons
                    name="pencil-outline"
                    size={19}
                    color={colors.blue}
                  />
                </Pressable>
                <Pressable
                  accessibilityLabel={`Delete ${item.title}`}
                  onPress={() => remove(item)}
                  style={styles.action}
                >
                  <Ionicons name="trash-outline" size={19} color="#d8435a" />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <State
            icon="location-outline"
            title="No saved locations"
            copy="Add a home, work, or other address to use during booking."
          />
        )}
        <Pressable onPress={add} style={styles.add}>
          <Ionicons name="add" size={21} color={colors.white} />
          <Text style={styles.addText}>Add a new address</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function State({
  icon,
  title,
  copy,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  copy: string;
}) {
  return (
    <View style={styles.state}>
      <Ionicons name={icon} size={38} color={colors.blue} />
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateCopy}>{copy}</Text>
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
  headerButton: {
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
  content: { padding: space.lg, paddingBottom: 32 },
  loading: { marginTop: 110 },
  list: { gap: 11 },
  card: {
    alignItems: "center",
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: "row",
    padding: 14,
  },
  icon: {
    alignItems: "center",
    backgroundColor: colors.categoryTint,
    borderRadius: 18,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  copy: { flex: 1, marginLeft: 12 },
  titleRow: { alignItems: "center", flexDirection: "row", gap: 7 },
  title: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  defaultChip: {
    backgroundColor: colors.categoryTint,
    borderRadius: 8,
    color: colors.blue,
    fontSize: 10,
    fontWeight: "700",
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  address: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 4 },
  action: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 36,
  },
  add: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: radius.lg,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 52,
  },
  addText: { color: colors.white, fontSize: 14, fontWeight: "700" },
  state: { alignItems: "center", paddingHorizontal: 24, paddingVertical: 90 },
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
