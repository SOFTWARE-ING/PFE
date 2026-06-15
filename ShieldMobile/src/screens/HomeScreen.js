// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, StatusBar,
  SafeAreaView,
} from 'react-native';
import { getRecentCommuniques } from '../api/apiClient';
import { COLORS } from '../theme/colors';

const DocIcon = () => (
  <View style={styles.commIconBox}>
    <Text style={styles.commIconText}>📄</Text>
  </View>
);

function CommuniqueCard({ item, onPress }) {
  const date = item.date_publication
    ? new Date(item.date_publication).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <DocIcon />
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.titre || 'Sans titre'}</Text>
        <Text style={styles.cardMeta}>
          {date}{item.nb_signatures ? ` · ${item.nb_signatures} signature(s)` : ''}
        </Text>
        <View style={styles.validBadge}>
          <Text style={styles.validBadgeText}>
            {item.statut === 'PUBLIE' ? '✓  Publié' : item.statut}
          </Text>
        </View>
      </View>
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
    } catch {
      // silencieux pour l'instant — pourrait afficher un toast
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchCommuniques(); }, [fetchCommuniques]);

  const onRefresh = () => { setRefreshing(true); fetchCommuniques(); };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bienvenue sur</Text>
          <Text style={styles.name}>Shield</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🛡️</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => navigation.getParent()?.navigate('Search')}
        activeOpacity={0.8}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchPlaceholder}>Rechercher un communiqué...</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Communiqués récents</Text>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accentLight} />
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
              onRefresh={onRefresh}
              colors={[COLORS.accentLight]}
              tintColor={COLORS.accentLight}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>Aucun communiqué publié</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 20, paddingHorizontal: 14, paddingTop: 8 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgDeep },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

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

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    marginHorizontal: 14, marginBottom: 10,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  searchIcon: { fontSize: 15, marginRight: 8 },
  searchPlaceholder: { fontSize: 13, color: COLORS.accentDim },

  sectionTitle: {
    color: COLORS.accentMuted, fontSize: 11, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 14, marginBottom: 8,
  },

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

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: COLORS.accentMuted },
});