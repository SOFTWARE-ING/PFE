// src/screens/SearchScreen.js
import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, StatusBar, SafeAreaView, Alert, Dimensions,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { searchCommuniques, getSearchSuggestions, getDownloadUrl } from '../api/apiClient';
import { COLORS } from '../theme/colors';
import { IconSearch, IconFile, IconDownload, IconChevronRight, IconCalendar } from '../components/Icon';

const { width: W } = Dimensions.get('window');

function ResultCard({ item, onPress, onDownload, busy }) {
  const c = item.communique || item;
  const date = c.date_publication
    ? new Date(c.date_publication).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <TouchableOpacity style={s.card} onPress={onPress} activeOpacity={0.75}>
      <View style={s.cardIcon}>
        <IconFile size={18} color={COLORS.primary} />
      </View>
      <View style={s.cardBody}>
        <Text style={s.cardTitle} numberOfLines={2}>{c.titre || 'Sans titre'}</Text>
        <View style={s.cardMeta}>
          <IconCalendar size={10} color={COLORS.textMuted} />
          <Text style={s.cardDate}>{date}</Text>
          {(c.nb_signatures || 0) > 0 && (
            <View style={s.sigBadge}><Text style={s.sigBadgeText}>✓ Signé</Text></View>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={[s.dlBtn, busy && { opacity: 0.5 }]}
        onPress={onDownload} disabled={busy}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {busy
          ? <ActivityIndicator size="small" color={COLORS.primary} />
          : <IconDownload size={16} color={COLORS.primary} />
        }
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function SearchScreen({ navigation }) {
  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [sugs, setSugs]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [dlId, setDlId]         = useState(null);
  const debounce = useRef(null);

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

  const onType = (text) => {
    setQuery(text);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      if (text.trim().length >= 2) {
        try {
          const d = await getSearchSuggestions(text.trim(), 5);
          setSugs(d.suggestions || []);
        } catch { setSugs([]); }
      } else { setSugs([]); }
      runSearch(text);
    }, 380);
  };

  const handleDownload = async (c) => {
    setDlId(c.id_communique);
    try {
      const url  = await getDownloadUrl(c.id_communique);
      const name = (c.titre || c.id_communique).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40) + '.pdf';
      const dest = FileSystem.documentDirectory + name;
      const { uri } = await FileSystem.downloadAsync(url, dest);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      } else {
        Alert.alert('Téléchargé', `Enregistré : ${name}`);
      }
    } catch {
      Alert.alert('Erreur', 'PDF non disponible pour ce communiqué.');
    } finally { setDlId(null); }
  };

  const clear = () => { setQuery(''); setResults([]); setSearched(false); setSugs([]); };
  const totalPages = total ? Math.ceil(total / 20) : 0;

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgApp} />
      <SafeAreaView style={{ backgroundColor: COLORS.bgApp }}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Rechercher</Text>
          <Text style={s.sub}>Base de documents officiels SHIELD</Text>
        </View>

        {/* Decorative signature icon */}
        <View style={s.penDeco}>
          <View style={s.penLine} />
          <View style={s.penDot} />
          <View style={s.penLine} />
        </View>

        {/* Search bar */}
        <View style={s.barWrap}>
          <View style={s.bar}>
            <IconSearch size={17} color={COLORS.primary} />
            <TextInput
              style={s.input}
              placeholder="Titre, institution, mot-clé..."
              placeholderTextColor={COLORS.textMuted}
              value={query}
              onChangeText={onType}
              returnKeyType="search"
              onSubmitEditing={() => { setSugs([]); runSearch(query); }}
              selectionColor={COLORS.primary}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={clear} style={s.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={s.clearX}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Suggestions chips */}
        {sugs.length > 0 && (
          <View style={s.sugsRow}>
            {sugs.map(sg => (
              <TouchableOpacity key={sg} style={s.sug} onPress={() => { setQuery(sg); setSugs([]); runSearch(sg); }}>
                <Text style={s.sugText}>{sg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </SafeAreaView>

      {/* Results */}
      <View style={s.listArea}>
        {loading ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={s.loadingText}>Recherche...</Text>
          </View>
        ) : (
          <FlatList
            data={results}
            keyExtractor={(item, i) => String((item.communique || item).id_communique || i)}
            renderItem={({ item }) => {
              const c = item.communique || item;
              return (
                <ResultCard
                  item={item}
                  onPress={() => navigation.navigate('Detail', { id: c.id_communique })}
                  onDownload={() => handleDownload(c)}
                  busy={dlId === c.id_communique}
                />
              );
            }}
            contentContainerStyle={s.list}
            ListHeaderComponent={searched && !loading && results.length > 0 && (
              <Text style={s.resultCount}>{total} résultat{total !== 1 ? 's' : ''} · « {query} »</Text>
            )}
            ListEmptyComponent={searched && (
              <View style={s.empty}>
                <View style={s.emptyIcon}><IconSearch size={32} color={COLORS.textDim} /></View>
                <Text style={s.emptyTitle}>Aucun résultat</Text>
                <Text style={s.emptyText}>Essayez d'autres mots-clés</Text>
              </View>
            )}
            ListFooterComponent={totalPages > 1 && (
              <View style={s.pagination}>
                <TouchableOpacity style={[s.pgBtn, page <= 1 && s.pgOff]} disabled={page <= 1} onPress={() => runSearch(query, page - 1)}>
                  <Text style={s.pgText}>← Préc.</Text>
                </TouchableOpacity>
                <Text style={s.pgInfo}>{page} / {totalPages}</Text>
                <TouchableOpacity style={[s.pgBtn, page >= totalPages && s.pgOff]} disabled={page >= totalPages} onPress={() => runSearch(query, page + 1)}>
                  <Text style={s.pgText}>Suiv. →</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgApp },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 40 },
  loadingText:{ color: COLORS.textMuted, fontSize: 13 },

  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 },
  title:  { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  sub:    { color: COLORS.textMuted, fontSize: 12, marginTop: 3 },

  // Decorative lines — inspired by signature/pen motif
  penDeco: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, gap: 10 },
  penLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  penDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.primary },

  barWrap: { paddingHorizontal: 16, marginBottom: 10 },
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.bgCard, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  input:   { flex: 1, fontSize: 14, color: COLORS.textPrimary, height: 32 },
  clearBtn:{ width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.bgCardElevated, justifyContent: 'center', alignItems: 'center' },
  clearX:  { color: COLORS.textMuted, fontSize: 10, fontWeight: '700' },

  sugsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  sug:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: COLORS.primaryPale, borderWidth: 1, borderColor: COLORS.primaryBorder },
  sugText: { fontSize: 12, color: COLORS.primaryLight, fontWeight: '600' },

  listArea: { flex: 1, backgroundColor: COLORS.bgApp },
  list:     { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 30 },
  resultCount: { fontSize: 12, color: COLORS.textMuted, marginBottom: 12, fontStyle: 'italic' },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.bgCard, borderRadius: 16,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primaryPale, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  cardBody: { flex: 1 },
  cardTitle:{ color: COLORS.textPrimary, fontSize: 13, fontWeight: '600', lineHeight: 18, marginBottom: 5 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cardDate: { color: COLORS.textMuted, fontSize: 11, flex: 1 },
  sigBadge: { backgroundColor: COLORS.validBg, borderRadius: 20, paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: COLORS.validBorder },
  sigBadgeText: { color: COLORS.validText, fontSize: 10, fontWeight: '700' },
  dlBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: COLORS.primaryPale, justifyContent: 'center', alignItems: 'center', flexShrink: 0, borderWidth: 1, borderColor: COLORS.primaryBorder },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon:  { width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.bgCard, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700' },
  emptyText:  { color: COLORS.textMuted, fontSize: 13 },

  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, paddingVertical: 14 },
  pgBtn:  { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 12, backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border },
  pgOff:  { opacity: 0.3 },
  pgText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  pgInfo: { color: COLORS.textMuted, fontSize: 12 },
});