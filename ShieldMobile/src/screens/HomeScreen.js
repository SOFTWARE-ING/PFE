// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, StatusBar,
  SafeAreaView,
} from 'react-native';
import { getCommuniques } from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';

// ─── Filtre chips ─────────────────────────────────────────────────────
const FILTERS = ['Tous', 'Récents', 'Validés', 'Alertes'];

// ─── Icône document (Unicode) ─────────────────────────────────────────
const DocIcon = () => (
  <View style={styles.commIconBox}>
    <Text style={styles.commIconText}>📄</Text>
  </View>
);

// ─── Badge Signature valide ───────────────────────────────────────────
const ValidBadge = () => (
  <View style={styles.validBadge}>
    <Text style={styles.validBadgeText}>✓  Signature valide</Text>
  </View>
);

// ─── Carte communiqué ────────────────────────────────────────────────
function CommuniqueCard({ item, onPress }) {
  const date = item.date_publication
    ? new Date(item.date_publication).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';
  const institution = item.institution || 'Institution';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <DocIcon />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.titre || 'Sans titre'}</Text>
        <Text style={styles.cardMeta}>{institution} · {date}</Text>
        <ValidBadge />
      </View>
    </TouchableOpacity>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { user }                        = useAuth();
  const [communiques, setCommuniques]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [search, setSearch]             = useState('');
  const [activeFilter, setActiveFilter] = useState('Tous');
  const [page, setPage]                 = useState(1);
  const [hasMore, setHasMore]           = useState(true);

  const fetchCommuniques = useCallback(async (reset = false) => {
    try {
      const currentPage = reset ? 1 : page;
      const data = await getCommuniques(currentPage, 10);
      const list = data.communiques || data.data || [];

      if (reset) {
        setCommuniques(list);
        setPage(2);
      } else {
        setCommuniques(prev => [...prev, ...list]);
        setPage(prev => prev + 1);
      }
      setHasMore(list.length === 10);
    } catch {
      // silently fail for now; could show toast
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useEffect(() => { fetchCommuniques(true); }, []);

  const onRefresh = () => { setRefreshing(true); fetchCommuniques(true); };

  const filtered = communiques.filter(c =>
    c.titre?.toLowerCase().includes(search.toLowerCase()),
  );

  // Initiales utilisateur
  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';
  const firstName = user?.name?.split(' ')[0] || 'Utilisateur';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      {/* ── En-tête ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour,</Text>
          <Text style={styles.name}>{firstName}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
      </View>

      {/* ── Barre de recherche ── */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un communiqué..."
          placeholderTextColor={COLORS.accentDim}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filtres chips ── */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.chip, activeFilter === f && styles.chipActive]}
            onPress={() => setActiveFilter(f)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Liste ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accentLight} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => String(item.id_communique || item.id)}
          renderItem={({ item }) => (
            <CommuniqueCard
              item={item}
              onPress={() => navigation.navigate('Detail', { id: item.id_communique || item.id })}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.accentLight]}
              tintColor={COLORS.accentLight}
            />
          }
          onEndReached={() => { if (hasMore && !search) fetchCommuniques(); }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasMore && !search
              ? <ActivityIndicator color={COLORS.accentLight} style={{ margin: 16 }} />
              : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>Aucun communiqué trouvé</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 14, paddingTop: 8 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: COLORS.bgDeep },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Header ────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  greeting: { color: COLORS.accentMuted, fontSize: 12 },
  name:     { color: COLORS.textWhite, fontSize: 18, fontWeight: '700', marginTop: 1 },
  avatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // ── Search ────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    marginHorizontal: 14, marginBottom: 10,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  searchIcon:  { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.textWhite, height: 34 },
  clearBtn:    { fontSize: 14, color: COLORS.accentMuted, paddingLeft: 8 },

  // ── Filters ───────────────────────────────────────────────────
  filterRow: {
    flexDirection: 'row', paddingHorizontal: 14,
    gap: 8, marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 5,
    borderRadius: 20, backgroundColor: COLORS.bgCard,
  },
  chipActive:     { backgroundColor: COLORS.accent },
  chipText:       { fontSize: 12, color: COLORS.accentMuted },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  // ── Cards ─────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12, padding: 12, marginBottom: 10,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  commIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: COLORS.bgDeep,
    justifyContent: 'center', alignItems: 'center',
    flexShrink: 0,
  },
  commIconText: { fontSize: 18 },
  cardBody:     { flex: 1 },
  cardTitle: {
    color: COLORS.textWhite, fontSize: 13, fontWeight: '600',
    marginBottom: 3, lineHeight: 18,
  },
  cardMeta: { color: COLORS.accentMuted, fontSize: 11, marginBottom: 6 },
  validBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.validBg,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  validBadgeText: { color: COLORS.validText, fontSize: 10, fontWeight: '600' },

  // ── Empty ─────────────────────────────────────────────────────
  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: COLORS.accentMuted },
});
