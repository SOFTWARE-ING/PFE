// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, StatusBar, SafeAreaView,
} from 'react-native';
import { getRecentCommuniques } from '../api/apiClient';
import { COLORS } from '../theme/colors';
import { IconShield, IconFile, IconCalendar, IconChevronRight, IconRefresh } from '../components/Icon';

function CommuniqueCard({ item, onPress }) {
  const date = item.date_publication
    ? new Date(item.date_publication).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

  const isPublie = item.statut?.toUpperCase() === 'PUBLIE';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardIconBox}>
        <IconFile size={22} color={COLORS.primary} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.titre || 'Sans titre'}</Text>
        <View style={styles.cardMeta}>
          <IconCalendar size={11} color={COLORS.textMuted} />
          <Text style={styles.cardMetaText}>{date}</Text>
          <View style={[styles.statusPill, !isPublie && styles.statusPillAlt]}>
            <Text style={[styles.statusPillText, !isPublie && styles.statusPillTextAlt]}>
              {isPublie ? 'Publié' : item.statut}
            </Text>
          </View>
        </View>
      </View>
      <IconChevronRight size={16} color={COLORS.primaryMuted} />
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const [communiques, setCommuniques] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);

  const fetchCommuniques = useCallback(async () => {
    try {
      const data = await getRecentCommuniques(30);
      setCommuniques(data.results || []);
    } catch { /* silencieux */ }
    finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCommuniques(); }, [fetchCommuniques]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.logoBox}>
            <IconShield size={22} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>CommuniSigne</Text>
            <Text style={styles.headerSub}>Plateforme officielle</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => { setRefreshing(true); fetchCommuniques(); }}
        >
          <IconRefresh size={18} color={COLORS.tabActive} />
        </TouchableOpacity>
      </View>

      {/* Search shortcut */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => navigation.getParent()?.navigate('Search')}
        activeOpacity={0.8}
      >
        <IconSearch size={16} color={COLORS.textMuted} />
        <Text style={styles.searchPlaceholder}>Rechercher un communiqué signé...</Text>
      </TouchableOpacity>

      {/* Section title */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Communiqués récents</Text>
        {!loading && (
          <Text style={styles.sectionCount}>{communiques.length} document(s)</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={communiques}
          keyExtractor={item => String(item.id_communique)}
          renderItem={({ item }) => (
            <CommuniqueCard
              item={item}
              onPress={() => navigation.navigate('Detail', { id: item.id_communique })}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchCommuniques(); }}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <IconFile size={48} color={COLORS.primaryBorder} />
              <Text style={styles.emptyTitle}>Aucun document</Text>
              <Text style={styles.emptyText}>Aucun communiqué publié pour l'instant</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// eslint-disable-next-line no-unused-vars
function IconSearch({ size, color }) {
  const { IconSearch: IS } = require('../components/Icon');
  return <IS size={size} color={color} />;
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: COLORS.bgDeep },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: COLORS.textMuted, fontSize: 13 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.bgDeep,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.4,
    shadowRadius: 8, elevation: 6,
  },
  headerTitle: { color: COLORS.textWhite, fontSize: 16, fontWeight: '700' },
  headerSub:   { color: COLORS.tabInactive, fontSize: 11, marginTop: 1 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#2e4415',
    justifyContent: 'center', alignItems: 'center',
  },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#2e4415',
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1, borderColor: '#3a581b',
  },
  searchPlaceholder: { color: COLORS.tabInactive, fontSize: 13, flex: 1 },

  sectionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginBottom: 6,
  },
  sectionTitle: { color: COLORS.textOnDark, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionCount: { color: COLORS.tabInactive, fontSize: 11 },

  list: { paddingHorizontal: 14, paddingBottom: 20, paddingTop: 4 },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.bgCard,
    borderRadius: 14, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  cardIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.primaryPale,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  cardBody:  { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 18, marginBottom: 6 },
  cardMeta:  { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardMetaText: { fontSize: 11, color: COLORS.textMuted, flex: 1 },
  statusPill: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20,
    backgroundColor: COLORS.validBg,
  },
  statusPillText:    { fontSize: 10, fontWeight: '700', color: COLORS.validText },
  statusPillAlt:     { backgroundColor: COLORS.warnBg },
  statusPillTextAlt: { color: COLORS.warnText },

  empty: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  emptyText:  { fontSize: 13, color: COLORS.textMuted, textAlign: 'center' },
});