// src/screens/SearchScreen.js
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar, SafeAreaView, Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { searchCommuniques, getSearchSuggestions, getApiBaseUrl } from '../api/apiClient';
import { COLORS } from '../theme/colors';
import {
  IconSearch, IconFile, IconCalendar, IconDownload,
  IconChevronRight, IconTrendingUp, IconClock,
} from '../components/Icon';

// Expose getApiBaseUrl for download URL construction
async function buildDownloadUrl(id) {
  const base = await getApiBaseUrl();
  return `${base}/documents/${id}/download`;
}

function ResultCard({ item, onPress, onDownload, downloading }) {
  const c = item.communique || item;
  const date = c.date_publication
    ? new Date(c.date_publication).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';
  const isPublie = c.statut?.toUpperCase() === 'PUBLIE';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardIconBox}>
        <IconFile size={20} color={COLORS.primary} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <Text style={styles.cardTitle} numberOfLines={2}>{c.titre || 'Sans titre'}</Text>
          <View style={[styles.statusPill, !isPublie && styles.statusPillWarn]}>
            <Text style={[styles.statusPillText, !isPublie && styles.statusPillTextWarn]}>
              {isPublie ? 'Publié' : c.statut}
            </Text>
          </View>
        </View>
        {!!c.contenu && (
          <Text style={styles.cardExcerpt} numberOfLines={2}>{c.contenu}</Text>
        )}
        <View style={styles.cardFooter}>
          <View style={styles.cardMeta}>
            <IconCalendar size={11} color={COLORS.textMuted} />
            <Text style={styles.cardMetaText}>{date}</Text>
            <Text style={styles.cardId}>
              #{(c.id_communique || '').slice(0, 8)}…
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.downloadBtn, downloading && styles.downloadBtnBusy]}
            onPress={onDownload}
            disabled={downloading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {downloading
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <IconDownload size={13} color={COLORS.primary} />
            }
            <Text style={styles.downloadBtnText}>
              {downloading ? 'Téléchargement...' : 'PDF'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SearchScreen({ navigation }) {
  const [query, setQuery]             = useState('');
  const [results, setResults]         = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [searched, setSearched]       = useState(false);
  const [downloadingId, setDownloadId]= useState(null);
  const debounceRef = useRef(null);
  const totalPages  = total ? Math.ceil(total / 20) : 0;

  const runSearch = useCallback(async (q, p = 1) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true); setSearched(true);
    try {
      const data = await searchCommuniques(q.trim(), p, 20);
      setResults(data.results || []);
      setTotal(data.total || 0);
      setPage(p);
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  const onChangeText = (text) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (text.trim().length >= 2) {
        try {
          const sug = await getSearchSuggestions(text.trim());
          setSuggestions(sug.suggestions || []);
        } catch { setSuggestions([]); }
      } else { setSuggestions([]); }
      runSearch(text);
    }, 400);
  };

  const handleDownload = async (communique) => {
    const id = communique.id_communique;
    setDownloadId(id);
    try {
      const url = await buildDownloadUrl(id);
      const filename = `${communique.titre?.replace(/[^a-zA-Z0-9]/g, '_') || id}.pdf`;
      const dest = FileSystem.documentDirectory + filename;
      const { uri } = await FileSystem.downloadAsync(url, dest);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      } else {
        Alert.alert('Téléchargé', `Fichier enregistré : ${filename}`);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de télécharger le document PDF.');
    } finally {
      setDownloadId(null);
    }
  };

  const clearSearch = () => {
    setQuery(''); setResults([]); setSearched(false); setSuggestions([]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recherche</Text>
        <Text style={styles.headerSub}>Communiqués officiels signés</Text>
      </View>

      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <IconSearch size={16} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Titre, mot-clé, institution..."
            placeholderTextColor={COLORS.textMuted}
            value={query}
            onChangeText={onChangeText}
            returnKeyType="search"
            onSubmitEditing={() => { setSuggestions([]); runSearch(query); }}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={styles.clearBtn}><Text style={styles.clearBtnText}>✕</Text></View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.suggestRow}>
          {suggestions.map((s) => (
            <TouchableOpacity
              key={s} style={styles.suggestChip}
              onPress={() => { setQuery(s); setSuggestions([]); runSearch(s); }}
            >
              <Text style={styles.suggestText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results area */}
      <View style={styles.resultArea}>
        {!searched && !loading && (
          <View style={styles.quickLinks}>
            <Text style={styles.quickLabel}>Suggestions</Text>
            <View style={styles.quickRow}>
              <TouchableOpacity style={styles.quickCard} onPress={() => runSearch('communiqué')}>
                <IconTrendingUp size={18} color={COLORS.primary} />
                <Text style={styles.quickTitle}>Populaires</Text>
                <Text style={styles.quickSub}>Les plus consultés</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickCard} onPress={() => runSearch('récent')}>
                <IconClock size={18} color={COLORS.validIcon} />
                <Text style={styles.quickTitle}>Récents</Text>
                <Text style={styles.quickSub}>Dernières publications</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item, idx) => String(item.communique?.id_communique || idx)}
            renderItem={({ item }) => {
              const c = item.communique || item;
              return (
                <ResultCard
                  item={item}
                  onPress={() => navigation.navigate('Detail', { id: c.id_communique })}
                  onDownload={() => handleDownload(c)}
                  downloading={downloadingId === c.id_communique}
                />
              );
            }}
            contentContainerStyle={styles.list}
            ListHeaderComponent={
              searched && !loading && (
                <Text style={styles.resultCount}>
                  {total} résultat{total !== 1 ? 's' : ''} pour « {query} »
                </Text>
              )
            }
            ListEmptyComponent={
              searched && (
                <View style={styles.empty}>
                  <IconFile size={48} color={COLORS.primaryBorder} />
                  <Text style={styles.emptyTitle}>Aucun résultat</Text>
                  <Text style={styles.emptyText}>Essayez d'autres mots-clés</Text>
                </View>
              )
            }
            ListFooterComponent={
              totalPages > 1 && (
                <View style={styles.pagination}>
                  <TouchableOpacity
                    style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                    disabled={page <= 1}
                    onPress={() => runSearch(query, page - 1)}
                  >
                    <Text style={styles.pageBtnText}>← Précédent</Text>
                  </TouchableOpacity>
                  <Text style={styles.pageInfo}>{page} / {totalPages}</Text>
                  <TouchableOpacity
                    style={[styles.pageBtn, page >= totalPages && styles.pageBtnDisabled]}
                    disabled={page >= totalPages}
                    onPress={() => runSearch(query, page + 1)}
                  >
                    <Text style={styles.pageBtnText}>Suivant →</Text>
                  </TouchableOpacity>
                </View>
              )
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: COLORS.bgDeep },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 40 },

  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  headerTitle: { color: COLORS.textWhite, fontSize: 20, fontWeight: '700' },
  headerSub:   { color: COLORS.tabInactive, fontSize: 12, marginTop: 2 },

  searchRow: { paddingHorizontal: 14, marginBottom: 10 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.bgCard,
    borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  searchInput: { flex: 1, fontSize: 13, color: COLORS.textPrimary, height: 32 },
  clearBtn: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.primaryBorder,
    justifyContent: 'center', alignItems: 'center',
  },
  clearBtnText: { fontSize: 10, color: COLORS.primary, fontWeight: '700' },

  suggestRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 14, marginBottom: 10,
  },
  suggestChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
  },
  suggestText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  resultArea: {
    flex: 1, backgroundColor: COLORS.bgPage,
    borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden',
  },
  list: { paddingHorizontal: 14, paddingBottom: 24, paddingTop: 12 },

  resultCount: {
    fontSize: 12, color: COLORS.textSecondary, marginBottom: 10,
    fontStyle: 'italic',
  },

  quickLinks: { padding: 14 },
  quickLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
  },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickCard: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: COLORS.border, gap: 4,
  },
  quickTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginTop: 6 },
  quickSub:   { fontSize: 11, color: COLORS.textMuted },

  card: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    backgroundColor: COLORS.bgCard, borderRadius: 14,
    padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardIconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: COLORS.primaryPale,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginTop: 2,
  },
  cardBody: { flex: 1 },
  cardTop:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6, marginBottom: 4 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 18, flex: 1 },
  statusPill: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20,
    backgroundColor: COLORS.validBg, flexShrink: 0,
  },
  statusPillText: { fontSize: 10, fontWeight: '700', color: COLORS.validText },
  statusPillWarn: { backgroundColor: COLORS.warnBg },
  statusPillTextWarn: { color: COLORS.warnText },
  cardExcerpt: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardMeta:   { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  cardMetaText: { fontSize: 11, color: COLORS.textMuted },
  cardId:       { fontSize: 10, color: COLORS.textDim, fontFamily: 'monospace' },
  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: COLORS.primaryPale, borderWidth: 1, borderColor: COLORS.border,
  },
  downloadBtnBusy: { opacity: 0.6 },
  downloadBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  empty:      { alignItems: 'center', paddingTop: 50, gap: 10 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  emptyText:  { fontSize: 13, color: COLORS.textMuted },

  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 10 },
  pageBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  pageInfo:    { fontSize: 12, color: COLORS.textSecondary },
});