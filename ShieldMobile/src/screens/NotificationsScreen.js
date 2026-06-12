// src/screens/NotificationsScreen.js
import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  StatusBar, SafeAreaView,
} from 'react-native';
import { COLORS } from '../theme/colors';

// ─── Données de démonstration ────────────────────────────────────────
const DEMO_NOTIFICATIONS = [
  {
    id: '1',
    type: 'new_comm',
    title: 'Nouveau communiqué publié',
    body:  'Min. Finances — Budget rectificatif 2026 disponible',
    time:  'Il y a 5 min',
    read:  false,
  },
  {
    id: '2',
    type: 'verified',
    title: 'Vérification réussie',
    body:  'Le communiqué scanné est authentique',
    time:  'Il y a 1h',
    read:  false,
  },
  {
    id: '3',
    type: 'alert',
    title: 'Document suspect détecté',
    body:  'Un faux communiqué circule — source non vérifiée',
    time:  'Hier, 14:32',
    read:  true,
  },
  {
    id: '4',
    type: 'new_comm',
    title: 'Nouveau communiqué publié',
    body:  'Min. Santé — Avis de vaccination disponible',
    time:  '05 juin 2026',
    read:  true,
  },
];

// ─── Config par type ──────────────────────────────────────────────────
const TYPE_CONFIG = {
  new_comm: { icon: '📄', bg: '#E8F0FB', color: COLORS.accent },
  verified: { icon: '🛡️', bg: COLORS.validLight, color: COLORS.validDark },
  alert:    { icon: '⚠️', bg: COLORS.warnBg, color: COLORS.warnText },
};

// ─── Item de notification ─────────────────────────────────────────────
function NotifItem({ item, onPress, onMarkRead }) {
  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.new_comm;

  return (
    <TouchableOpacity
      style={styles.item}
      onPress={() => onPress(item)}
      onLongPress={() => onMarkRead(item.id)}
      activeOpacity={0.8}
    >
      {/* Point de lecture */}
      <View style={styles.dotWrap}>
        <View style={[styles.dot, item.read && styles.dotRead]} />
      </View>

      {/* Icône type */}
      <View style={[styles.iconWrap, { backgroundColor: cfg.bg }]}>
        <Text style={styles.iconEmoji}>{cfg.icon}</Text>
      </View>

      {/* Contenu */}
      <View style={styles.content}>
        <Text style={[styles.contentTitle, item.read && styles.contentTitleRead]}>
          {item.title}
        </Text>
        <Text style={styles.contentBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.contentTime}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n),
    );
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handlePress = (item) => {
    markRead(item.id);
    // Navigation vers détail si nouveau communiqué
    if (item.type === 'new_comm') {
      navigation.navigate('Home');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.headerSub}>{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Tout marquer lu</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Liste ── */}
      <View style={styles.listContainer}>
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <NotifItem
              item={item}
              onPress={handlePress}
              onMarkRead={markRead}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyText}>Aucune notification</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgDeep },

  // ── Header ────────────────────────────────────────────────────
  header: {
    backgroundColor: COLORS.bgDeep,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  headerTitle: { color: COLORS.textWhite, fontSize: 20, fontWeight: '700' },
  headerSub:   { color: COLORS.accentMuted, fontSize: 12, marginTop: 2 },
  markAllBtn: {
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: COLORS.bgCard, borderRadius: 20,
  },
  markAllText: { color: COLORS.accentLight, fontSize: 12, fontWeight: '600' },

  // ── List container (fond blanc arrondi) ───────────────────────
  listContainer: {
    flex: 1, backgroundColor: COLORS.bgWhite,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 4,
  },

  // ── Item ──────────────────────────────────────────────────────
  item: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 10, paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 0.5, borderBottomColor: COLORS.borderLight,
  },
  dotWrap: { paddingTop: 5 },
  dot:     { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.accent },
  dotRead: { backgroundColor: '#D0D7E2' },

  iconWrap: {
    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  iconEmoji: { fontSize: 18 },

  content:          { flex: 1 },
  contentTitle:     { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 2, lineHeight: 18 },
  contentTitleRead: { fontWeight: '500', color: COLORS.textSecondary },
  contentBody:      { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 3 },
  contentTime:      { fontSize: 10, color: COLORS.textDim },

  // ── Empty ─────────────────────────────────────────────────────
  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
});
