import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { getNotifications, markAllNotificationsRead, markNotificationRead, type HelpyNotification } from '../lib/helpy-api'
import { colors, radius, space } from '../lib/theme'

export default function NotificationsScreen() {
  const [items, setItems] = useState<HelpyNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const load = useCallback(async (refresh = false) => { if (refresh) setRefreshing(true); else setLoading(true); try { setItems(await getNotifications()); setError('') } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load notifications.') } finally { setLoading(false); setRefreshing(false) } }, [])
  useEffect(() => {
    const timer = setTimeout(() => { void load() }, 0)
    return () => clearTimeout(timer)
  }, [load])
  const open = async (item: HelpyNotification) => { if (item.unread) { setItems(rows => rows.map(row => row.id === item.id ? { ...row, unread: false } : row)); try { await markNotificationRead(item.id) } catch { await load() } } }
  const markAll = async () => { const previous = items; setItems(rows => rows.map(row => ({ ...row, unread: false }))); try { await markAllNotificationsRead() } catch { setItems(previous) } }
  return <SafeAreaView style={styles.safe}><View style={styles.header}><Pressable accessibilityLabel="Go Back" onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={20} color={colors.ink} /></Pressable><Text style={styles.title}>Notifications</Text>{items.some(item => item.unread) ? <Pressable onPress={() => void markAll()}><Text style={styles.markAll}>Mark all read</Text></Pressable> : <View style={styles.headerSpacer} />}</View><ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={colors.blue} />}>
    {loading ? <ActivityIndicator color={colors.blue} style={styles.loading} /> : error ? <View style={styles.state}><Text style={styles.stateTitle}>Couldn’t load notifications</Text><Text style={styles.stateText}>{error}</Text></View> : items.length ? items.map(item => <Pressable key={item.id} onPress={() => void open(item)} style={[styles.card, item.unread && styles.unread]}><View style={styles.icon}><Ionicons name="notifications-outline" size={20} color={colors.blue} /></View><View style={styles.copy}><Text style={styles.itemTitle}>{item.title}</Text><Text style={styles.message}>{item.message}</Text><Text style={styles.time}>{item.createdAt}</Text></View>{item.unread ? <View style={styles.dot} /> : null}</Pressable>) : <View style={styles.state}><Ionicons name="notifications-off-outline" size={36} color={colors.blue} /><Text style={styles.stateTitle}>You’re all caught up</Text><Text style={styles.stateText}>Booking and account updates will appear here.</Text></View>}
  </ScrollView></SafeAreaView>
}

const styles = StyleSheet.create({ safe: { backgroundColor: colors.background, flex: 1 }, header: { alignItems: 'center', borderBottomColor: colors.cardBorder, borderBottomWidth: 1, flexDirection: 'row', minHeight: 58, paddingHorizontal: space.lg }, back: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 }, title: { color: colors.ink, flex: 1, fontSize: 19, fontWeight: '700', textAlign: 'center' }, markAll: { color: colors.blue, fontSize: 12, fontWeight: '700', width: 88 }, headerSpacer: { width: 88 }, content: { gap: 10, padding: space.lg }, loading: { marginTop: 100 }, card: { alignItems: 'flex-start', backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: radius.lg, borderWidth: 1, flexDirection: 'row', padding: 15 }, unread: { backgroundColor: '#edf5ff', borderColor: '#c9defe' }, icon: { alignItems: 'center', backgroundColor: colors.categoryTint, borderRadius: 18, height: 38, justifyContent: 'center', width: 38 }, copy: { flex: 1, marginLeft: 12 }, itemTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' }, message: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 4 }, time: { color: '#96a2b5', fontSize: 11, marginTop: 8 }, dot: { backgroundColor: colors.blue, borderRadius: 4, height: 8, marginLeft: 8, marginTop: 4, width: 8 }, state: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 110 }, stateTitle: { color: colors.ink, fontSize: 18, fontWeight: '700', marginTop: 12 }, stateText: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 6, textAlign: 'center' } })
