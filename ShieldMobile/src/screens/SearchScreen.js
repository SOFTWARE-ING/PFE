// src/screens/SearchScreen.js
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar, SafeAreaView,
} from 'react-native';
import { searchCommuniques, getSearchSuggestions } from '../api/apiClient';
import { COLORS } from '../theme/colors';

function ResultCard({ item, onPress }) {
  const c = item.communique || item;
  const date = c.date_publication
    ? new Date(c.date_publication).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.iconBox}>
        <Text style={styles.iconEmoji}>📄</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{c.titre || 'Sans titre'}</Text>
        <Text style={styles.cardMeta}>{c.statut || 'PUBLIE'} · {date}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

export default function SearchScreen({ navigation }) {
  const [query, setQuery]             = useState('');
  const [results, setResults]         = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [searched, setSearched]       = useState(false);
  const debounceRef = useRef(null);

  const runSearch = useCallback(async (q) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchCommuniques(q.trim(), 1, 20);
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onChangeText = (text) => {
    setQuery(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (text.trim().length >= 2) {
        try {
          const sug = await getSearchSuggestions(text.trim());
          setSuggestions(sug.suggestions || []);
        } catch {
          setSuggestions([]);
        }
      } else {
        setSuggestions([]);
      }
      runSearch(text);
    }, 400);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    setSuggestions([]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Rechercher</Text>
      </View>

      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Titre, mot-clé, institution..."
          placeholderTextColor={COLORS.accentDim}
          value={query}
          onChangeText={onChangeText}
          returnKeyType="search"
          onSubmitEditing={() => runSearch(query)}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearSearch}>
            <Text style={styles.clearBtn}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {suggestions.length > 0 && (
        <View style={styles.suggestRow}>
          {suggestions.map((s) => (
            <TouchableOpacity
              key={s}
              style={styles.suggestChip}
              onPress={() => { setQuery(s); setSuggestions([]); runSearch(s); }}
            >
              <Text style={styles.suggestText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.listContainer}>
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.accentLight} />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item, idx) => String(item.communique?.id_communique || idx)}
            renderItem={({ item }) => (
              <ResultCard
                item={item}
                onPress={() => navigation.navigate('Detail', { id: item.communique?.id_communique })}
              />
            )}
            contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 8, paddingBottom: 20 }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyIcon}>{searched ? '📭' : '🔍'}</Text>
                <Text style={styles.emptyText}>
                  {searched ? 'Aucun résultat trouvé' : 'Tapez pour rechercher un communiqué'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgDeep },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    backgroundColor: COLORS.bgDeep,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  headerTitle: { color: COLORS.textWhite, fontSize: 20, fontWeight: '700' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    marginHorizontal: 14, marginBottom: 10,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
  },
  searchIcon:  { fontSize: 15, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.textWhite, height: 34 },
  clearBtn:    { fontSize: 14, color: COLORS.accentMuted, paddingLeft: 8 },

  suggestRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: 14, gap: 8, marginBottom: 10,
  },
  suggestChip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, backgroundColor: COLORS.bgCard,
  },
  suggestText: { fontSize: 12, color: COLORS.accentLight },

  listContainer: {
    flex: 1, backgroundColor: COLORS.bgWhite,
    borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 8,
  },

  card: {
    backgroundColor: COLORS.bgLight,
    borderRadius: 12, padding: 12, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  iconBox: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: COLORS.bgDeep,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  iconEmoji: { fontSize: 18 },
  cardBody: { flex: 1 },
  cardTitle: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600', marginBottom: 3, lineHeight: 18 },
  cardMeta:  { color: COLORS.textSecondary, fontSize: 11 },
  arrow:     { color: COLORS.accentDim, fontSize: 22, fontWeight: '300' },

  empty:     { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 15, color: COLORS.textSecondary },
});