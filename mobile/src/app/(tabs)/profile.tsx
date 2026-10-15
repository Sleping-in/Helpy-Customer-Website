import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, type Href } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getProfile,
  logout,
  updateProfile,
  type HelpyProfile,
} from "../../lib/helpy-api";
import { clearSession } from "../../lib/session";
import { colors, radius, space } from "../../lib/theme";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<HelpyProfile>();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    about: "",
  });
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const value = await getProfile();
      setProfile(value);
      setForm({
        name: value.name,
        email: value.email,
        phone: value.phone,
        about: value.about,
      });
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load your profile.",
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
  const save = async () => {
    setSaving(true);
    try {
      await updateProfile(form);
      await load();
      setEditing(false);
    } catch (reason) {
      Alert.alert(
        "Could Not Update Profile",
        reason instanceof Error ? reason.message : "Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  const signOut = () =>
    Alert.alert(
      "Sign out?",
      "You will need a new verification code to sign back in.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () =>
            void (async () => {
              try {
                await logout();
              } catch {
                /* Clear the local session even if the server already expired it. */
              }
              await clearSession();
              router.replace("/sign-in");
            })(),
        },
      ],
    );
  const initials =
    profile?.name
      .split(/\s+/)
      .map((value) => value[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "H";
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
        <View style={styles.heading}>
          <View>
            <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
            <Text style={styles.title}>Profile</Text>
          </View>
          {profile ? (
            <Pressable onPress={() => setEditing((value) => !value)}>
              <Text style={styles.edit}>{editing ? "Cancel" : "Edit"}</Text>
            </Pressable>
          ) : null}
        </View>
        {loading ? (
          <ActivityIndicator color={colors.blue} style={styles.loading} />
        ) : error ? (
          <View style={styles.state}>
            <Text style={styles.stateTitle}>Couldn’t load your profile</Text>
            <Text style={styles.stateText}>{error}</Text>
          </View>
        ) : profile ? (
          <>
            <View style={styles.hero}>
              {profile.image ? (
                <Image source={{ uri: profile.image }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.initials}>{initials}</Text>
                </View>
              )}
              <View style={styles.heroCopy}>
                <Text style={styles.name}>{profile.name}</Text>
                <Text style={styles.email}>{profile.email}</Text>
                <Text style={styles.balance}>
                  QAR {profile.walletBalance.toFixed(2)} wallet balance
                </Text>
              </View>
            </View>
            {editing ? (
              <View style={styles.form}>
                <Field
                  label="Name"
                  value={form.name}
                  onChangeText={(name) =>
                    setForm((value) => ({ ...value, name }))
                  }
                />
                <Field
                  label="Email"
                  value={form.email}
                  onChangeText={(email) =>
                    setForm((value) => ({ ...value, email }))
                  }
                  keyboardType="email-address"
                />
                <Field
                  label="Phone"
                  value={form.phone}
                  onChangeText={(phone) =>
                    setForm((value) => ({ ...value, phone }))
                  }
                  keyboardType="phone-pad"
                />
                <Field
                  label="About"
                  value={form.about}
                  onChangeText={(about) =>
                    setForm((value) => ({ ...value, about }))
                  }
                  multiline
                />
                <Pressable
                  disabled={saving || !form.name || !form.email || !form.phone}
                  onPress={() => void save()}
                  style={[styles.save, saving && styles.disabled]}
                >
                  <Text style={styles.saveText}>
                    {saving ? "Saving…" : "Save changes"}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.menu}>
                <Menu
                  icon="location-outline"
                  title="Saved locations"
                  subtitle="Home, work and more"
                  onPress={() => router.push("/addresses" as Href)}
                />
                <Menu
                  icon="notifications-outline"
                  title="Notifications"
                  subtitle="Booking and account updates"
                  onPress={() => router.push("/notifications")}
                />
                <Menu
                  icon="calendar-outline"
                  title="Bookings"
                  subtitle="Upcoming and previous appointments"
                  onPress={() => router.navigate("/(tabs)/bookings")}
                />
                <Pressable onPress={signOut} style={styles.signOut}>
                  <Ionicons name="log-out-outline" size={21} color="#d8435a" />
                  <Text style={styles.signOutText}>Sign out</Text>
                </Pressable>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: "email-address" | "phone-pad";
  multiline?: boolean;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.placeholder}
        style={[styles.input, props.multiline && styles.textarea]}
      />
    </View>
  );
}
function Menu({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={21} color={colors.blue} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.chevron} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 },
  content: { paddingBottom: 32, paddingHorizontal: space.lg },
  heading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  eyebrow: {
    color: colors.blue,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  title: { color: colors.ink, fontSize: 28, fontWeight: "800", marginTop: 5 },
  edit: { color: colors.blue, fontSize: 15, fontWeight: "700", padding: 10 },
  loading: { marginTop: 120 },
  hero: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: radius.xxl,
    flexDirection: "row",
    marginTop: 22,
    padding: 20,
  },
  avatar: { borderRadius: 28, height: 74, width: 74 },
  avatarFallback: {
    alignItems: "center",
    backgroundColor: "#ffffff26",
    borderRadius: 28,
    height: 74,
    justifyContent: "center",
    width: 74,
  },
  initials: { color: colors.white, fontSize: 23, fontWeight: "800" },
  heroCopy: { flex: 1, marginLeft: 15 },
  name: { color: colors.white, fontSize: 20, fontWeight: "800" },
  email: { color: "#d9e8ff", fontSize: 13, marginTop: 4 },
  balance: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
  },
  form: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderRadius: radius.xl,
    borderWidth: 1,
    gap: 15,
    marginTop: 18,
    padding: 18,
  },
  label: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 7,
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.ink,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  textarea: { minHeight: 100, paddingTop: 13, textAlignVertical: "top" },
  save: {
    alignItems: "center",
    backgroundColor: colors.blue,
    borderRadius: radius.md,
    minHeight: 48,
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  saveText: { color: colors.white, fontWeight: "700" },
  menu: {
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginTop: 18,
    overflow: "hidden",
  },
  menuRow: {
    alignItems: "center",
    borderBottomColor: colors.cardBorder,
    borderBottomWidth: 1,
    flexDirection: "row",
    minHeight: 74,
    paddingHorizontal: 15,
  },
  menuIcon: {
    alignItems: "center",
    backgroundColor: colors.categoryTint,
    borderRadius: 17,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  menuCopy: { flex: 1, marginLeft: 12 },
  menuTitle: { color: colors.ink, fontSize: 15, fontWeight: "700" },
  menuSubtitle: { color: colors.muted, fontSize: 12, marginTop: 3 },
  signOut: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 60,
    paddingHorizontal: 18,
  },
  signOutText: { color: "#d8435a", fontSize: 14, fontWeight: "700" },
  state: { alignItems: "center", paddingTop: 110 },
  stateTitle: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  stateText: {
    color: colors.muted,
    fontSize: 14,
    marginTop: 7,
    textAlign: "center",
  },
});
