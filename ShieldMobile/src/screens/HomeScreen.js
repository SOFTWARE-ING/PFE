// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, StatusBar, SafeAreaView,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getRecentCommuniques } from '../api/apiClient';
import { COLORS } from '../theme/colors';
import { IconShield, IconFile, IconSearch, IconChevronRight, IconRefresh, IconCalendar, IconLightning } from '../components/Icon';

const { width: W } = Dimensions.get('window');
const CARD_W = (W - 48) / 2;

function StatBadge({ label, value, color }) {
  return (
    <View style={[s.statBadge, { borderColor: color + '44' }]}>
      <Text style={[s.statValue, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function DocCard({ item, onPress }) {
  const date = item.date_publication
    ? new Date(item.date_publication).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
    : '—';
  const hasSig = (item.nb_signatures || 0) > 0;

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
      <View style={s.cardIconWrap}>
        <IconFile size={22} color={COLORS.primary} />
      </View>
      <Text style={s.cardTitle} numberOfLines={2}>{item.titre || 'Sans titre'}</Text>
      <View style={s.cardFooter}>
        <Text style={s.cardDate}>{date}</Text>
        {hasSig && <View style={s.sigDot} />}
      </View>
    </TouchableOpacity>
  );
}

function DocRow({ item, onPress }) {
  const date = item.date_publication
    ? new Date(item.date_publication).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.75}>
      <View style={s.rowIconBox}>
        <IconFile size={18} color={COLORS.primary} />
      </View>
      <View style={s.rowBody}>
        <Text style={s.rowTitle} numberOfLines={1}>{item.titre || 'Sans titre'}</Text>
        <View style={s.rowMeta}>
          <IconCalendar size={10} color={COLORS.textMuted} />
          <Text style={s.rowDate}>{date}</Text>
        </View>
      </View>
      <IconChevronRight size={14} color={COLORS.textDim} />
    </TouchableOpacity>
  );
}

export default function HomeScreen({ navigation }) {
  const [docs, setDocs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefresh]= useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getRecentCommuniques(30);
      const results = (data.results || []).filter(d => d.statut === 'PUBLIE');
      setDocs(results);
    } catch (e) {
      console.warn('HomeScreen:', e.message);
    } finally {
      setLoading(false);
      setRefresh(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const recent = docs.slice(0, 4);
  const older  = docs.slice(4);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgApp} />
      <SafeAreaView style={{ backgroundColor: COLORS.bgApp }}>

        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <View style={s.logoBox}>
              <IconShield size={20} color="#fff" />
            </View>
            <View>
              <Text style={s.appName}>CommuniSigne</Text>
              <Text style={s.appSub}>Documents officiels</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => { setRefresh(true); load(); }} style={s.refreshBtn}>
            <IconRefresh size={18} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {/* Search shortcut */}
        <TouchableOpacity
          style={s.searchBar}
          onPress={() => navigation.getParent()?.navigate('Search')}
          activeOpacity={0.85}
        >
          <IconSearch size={15} color={COLORS.textMuted} />
          <Text style={s.searchPlaceholder}>Rechercher un communiqué...</Text>
          <View style={s.searchKbd}>
            <Text style={s.searchKbdText}>⌕</Text>
          </View>
        </TouchableOpacity>

        {/* Stats strip */}
        {!loading && (
          <View style={s.statsRow}>
            <StatBadge label="Publiés" value={docs.length} color={COLORS.primary} />
            <StatBadge label="Signés" value={docs.filter(d => (d.nb_signatures || 0) > 0).length} color={COLORS.validIcon} />
            <StatBadge label="Récents" value={recent.length} color={COLORS.secondary} />
          </View>
        )}
      </SafeAreaView>

      <FlatList
        data={older}
        keyExtractor={item => item.id_communique || String(Math.random())}
        renderItem={({ item }) => (
          <DocRow item={item} onPress={() => navigation.navigate('Detail', { id: item.id_communique })} />
        )}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefresh(true); load(); }} tintColor={COLORS.primary} />
        }
        contentContainerStyle={s.list}
        style={{ backgroundColor: COLORS.bgApp }}
        ListHeaderComponent={
          loading ? (
            <View style={s.centered}>
              <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
          ) : (
            <>
              {/* Recent docs — 2-column grid */}
              {recent.length > 0 && (
                <View style={s.section}>
                  <View style={s.sectionHeader}>
                    <IconLightning size={14} color={COLORS.secondary} />
                    <Text style={s.sectionTitle}>Récents</Text>
                  </View>
                  <View style={s.grid}>
                    {recent.map(item => (
                      <DocCard
                        key={item.id_communique}
                        item={item}
                        onPress={() => navigation.navigate('Detail', { id: item.id_communique })}
                      />
                    ))}
                  </View>
                </View>
              )}

              {older.length > 0 && (
                <View style={s.sectionHeader2}>
                  <IconFile size={14} color={COLORS.textMuted} />
                  <Text style={s.sectionTitle2}>Tous les documents</Text>
                </View>
              )}
            </>
          )
        }
        ListEmptyComponent={
          !loading && (
            <View style={s.empty}>
              <View style={s.emptyIconBox}>
                <IconFile size={36} color={COLORS.primaryPale} />
              </View>
              <Text style={s.emptyTitle}>Aucun document</Text>
              <Text style={s.emptyText}>Les communiqués officiels apparaîtront ici</Text>
            </View>
          )
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgApp },
  centered:  { justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  appName: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  appSub:  { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.primaryPale,
    justifyContent: 'center', alignItems: 'center',
  },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.bgCard,
    marginHorizontal: 20, marginBottom: 14,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  searchPlaceholder: { flex: 1, color: COLORS.textMuted, fontSize: 13 },
  searchKbd: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: COLORS.primaryPale, borderRadius: 6,
  },
  searchKbdText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },

  statsRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  statBadge: {
    flex: 1, backgroundColor: COLORS.bgCard,
    borderRadius: 12, paddingVertical: 10, paddingHorizontal: 8,
    alignItems: 'center', borderWidth: 1,
  },
  statValue: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2, fontWeight: '500' },

  list: { paddingHorizontal: 20, paddingBottom: 24 },

  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle:  { color: COLORS.secondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  sectionHeader2:{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  sectionTitle2: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: CARD_W, backgroundColor: COLORS.bgCard,
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardIconWrap: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: COLORS.primaryPale,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  cardTitle:  { color: COLORS.textPrimary, fontSize: 12, fontWeight: '600', lineHeight: 17, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardDate:   { color: COLORS.textMuted, fontSize: 10 },
  sigDot:     { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.validIcon },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.bgCard, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  rowIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.primaryPale,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  rowBody:  { flex: 1 },
  rowTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  rowMeta:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowDate:  { color: COLORS.textMuted, fontSize: 11 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 14 },
  emptyIconBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center', alignItems: 'center',
  },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyText:  { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', maxWidth: 220 },
});