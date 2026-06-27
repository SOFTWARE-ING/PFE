// src/screens/VerifyScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, SafeAreaView, ActivityIndicator, Alert,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { searchCommuniques, getDownloadUrl } from '../api/apiClient';
import { COLORS } from '../theme/colors';
import {
  IconShieldCheck, IconShieldX, IconShieldAlert,
  IconArrowLeft, IconFile, IconSearch, IconDownload,
  IconCheckCircle, IconXCircle, IconChevronDown, IconRefresh,
} from '../components/Icon';

const PALETTE = {
  vert:   { bg: COLORS.validBg,   border: COLORS.validBorder,  text: COLORS.validText,  Icon: IconShieldCheck,  bar: COLORS.validIcon  },
  orange: { bg: COLORS.warnBg,    border: COLORS.warnBorder,   text: COLORS.warnText,   Icon: IconShieldAlert,  bar: COLORS.warnIcon   },
  rouge:  { bg: COLORS.alertBg,   border: COLORS.alertBorder,  text: COLORS.alertText,  Icon: IconShieldX,      bar: COLORS.alertIcon  },
  gris:   { bg: COLORS.bgCardAlt, border: COLORS.border,        text: COLORS.textMuted,  Icon: IconShieldAlert,  bar: COLORS.textDim    },
};

// ─── Recherche et téléchargement de l'original ────────────────────────────
function FindOriginalPanel({ titre, comId }) {
  const [state, setState] = useState('idle'); // idle | searching | found | notfound | downloading
  const [matches, setMatches] = useState([]);
  const [dlId, setDlId] = useState(null);

  const search = async () => {
    setState('searching');
    try {
      const data = await searchCommuniques(titre || '', 1, 5);
      const res  = data.results || [];
      setMatches(res);
      setState(res.length > 0 ? 'found' : 'notfound');
    } catch {
      setState('notfound');
    }
  };

  const download = async (c) => {
    setDlId(c.id_communique);
    setState('downloading');
    try {
      const url  = await getDownloadUrl(c.id_communique);
      const name = (c.titre || c.id_communique).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40) + '.pdf';
      const dest = FileSystem.documentDirectory + name;
      const { uri } = await FileSystem.downloadAsync(url, dest);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Document original officiel' });
      } else {
        Alert.alert('Téléchargé', `Enregistré : ${name}`);
      }
    } catch {
      Alert.alert('Erreur', 'Téléchargement impossible. Le PDF n\'est peut-être pas encore disponible.');
    } finally {
      setDlId(null);
      setState('found');
    }
  };

  return (
    <View style={fp.panel}>
      <View style={fp.panelHeader}>
        <IconSearch size={16} color={COLORS.warnText} />
        <Text style={fp.panelTitle}>Document douteux — Retrouver l'original</Text>
      </View>
      <Text style={fp.panelDesc}>
        Si ce document vous semble falsifié, vous pouvez rechercher et télécharger
        la version officielle authentique enregistrée dans SHIELD.
      </Text>

      {state === 'idle' && (
        <TouchableOpacity style={fp.searchBtn} onPress={search}>
          <IconSearch size={15} color="#fff" />
          <Text style={fp.searchBtnText}>Rechercher l'original officiel</Text>
        </TouchableOpacity>
      )}

      {state === 'searching' && (
        <View style={fp.row}>
          <ActivityIndicator color={COLORS.primary} size="small" />
          <Text style={fp.stateText}>Recherche en cours...</Text>
        </View>
      )}

      {state === 'notfound' && (
        <View style={fp.notFound}>
          <Text style={fp.notFoundText}>
            Aucun document correspondant trouvé dans la base SHIELD.
          </Text>
          <TouchableOpacity onPress={search} style={fp.retryBtn}>
            <Text style={fp.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {(state === 'found' || state === 'downloading') && matches.map((item, i) => {
        const c = item.communique || item;
        const busy = state === 'downloading' && dlId === c.id_communique;
        return (
          <View key={c.id_communique || i} style={fp.match}>
            <View style={fp.matchIcon}><IconFile size={16} color={COLORS.primary} /></View>
            <Text style={fp.matchTitle} numberOfLines={2}>{c.titre || 'Sans titre'}</Text>
            <TouchableOpacity
              style={[fp.dlBtn, busy && fp.dlBtnBusy]}
              onPress={() => download(c)}
              disabled={busy}
            >
              {busy
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <><IconDownload size={14} color={COLORS.primary} /><Text style={fp.dlBtnText}>PDF</Text></>
              }
            </TouchableOpacity>
          </View>
        );
      })}
    </View>
  );
}

const fp = StyleSheet.create({
  panel: {
    backgroundColor: COLORS.warnBg, borderRadius: 14,
    borderWidth: 1.5, borderColor: COLORS.warnBorder, padding: 14, gap: 10,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelTitle:  { fontSize: 13, fontWeight: '700', color: COLORS.warnText, flex: 1 },
  panelDesc:   { fontSize: 12, color: COLORS.warnText, lineHeight: 18, opacity: 0.85 },
  searchBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 11 },
  searchBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  stateText:   { fontSize: 12, color: COLORS.textMuted },
  notFound:    { gap: 8 },
  notFoundText:{ fontSize: 12, color: COLORS.warnText },
  retryBtn:    { alignSelf: 'flex-start' },
  retryText:   { fontSize: 12, color: COLORS.primary, textDecorationLine: 'underline' },
  match: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  matchIcon:   { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.primaryPale, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  matchTitle:  { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  dlBtn:       { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: COLORS.primaryPale, borderRadius: 8, flexShrink: 0 },
  dlBtnBusy:   { opacity: 0.5 },
  dlBtnText:   { fontSize: 11, fontWeight: '700', color: COLORS.primary },
});

// ─── Niveau card ───────────────────────────────────────────────────────────
function NiveauCard({ numero, label, niveau }) {
  const [open, setOpen] = useState(numero === 1);
  if (!niveau?.execute) {
    return (
      <View style={ns.cardDisabled}>
        <View style={[ns.badge, { backgroundColor: COLORS.textDim }]}>
          <Text style={ns.badgeNum}>{numero}</Text>
        </View>
        <Text style={ns.labelDisabled}>{label} — Non exécuté</Text>
      </View>
    );
  }
  const ok     = niveau.valide;
  const bdrClr = ok ? COLORS.validBorder : COLORS.alertBorder;
  const bgClr  = ok ? COLORS.validBg + '44' : COLORS.alertBg + '44';

  return (
    <View style={[ns.card, { borderColor: bdrClr, backgroundColor: bgClr }]}>
      <TouchableOpacity style={ns.header} onPress={() => setOpen(o => !o)} activeOpacity={0.7}>
        <View style={[ns.badge, { backgroundColor: ok ? COLORS.validIcon : COLORS.alertIcon }]}>
          <Text style={ns.badgeNum}>{numero}</Text>
        </View>
        <Text style={ns.label}>{label}</Text>
        {ok ? <IconCheckCircle size={16} color={COLORS.validIcon} /> : <IconXCircle size={16} color={COLORS.alertIcon} />}
        <IconChevronDown size={14} color={COLORS.textMuted} />
      </TouchableOpacity>

      {open && (
        <View style={ns.body}>
          <Text style={ns.detail}>{niveau.detail}</Text>
          {niveau.etapes && (
            <View style={ns.stepsRow}>
              {Object.entries(niveau.etapes).map(([k, v]) => (
                <View key={k} style={[ns.step, { backgroundColor: v ? COLORS.validBg : COLORS.alertBg }]}>
                  {v ? <IconCheckCircle size={10} color={COLORS.validIcon} /> : <IconXCircle size={10} color={COLORS.alertIcon} />}
                  <Text style={[ns.stepText, { color: v ? COLORS.validText : COLORS.alertText }]}>{k.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          )}
          {niveau.diff && (
            <View style={ns.diffWrap}>
              <View style={ns.diffStats}>
                {[
                  { l: 'Similarité', v: `${niveau.diff.similarite_pct}%`,   c: niveau.diff.similarite_pct >= 98 ? COLORS.validText : niveau.diff.similarite_pct >= 90 ? COLORS.warnText : COLORS.alertText },
                  { l: 'Identiques', v: String(niveau.diff.chars_identiques), c: COLORS.validText },
                  { l: 'Anomalies',  v: String(niveau.diff.nb_anomalies),    c: niveau.diff.nb_anomalies === 0 ? COLORS.validText : COLORS.alertText },
                ].map(x => (
                  <View key={x.l} style={ns.diffStat}>
                    <Text style={[ns.diffNum, { color: x.c }]}>{x.v}</Text>
                    <Text style={ns.diffLabel}>{x.l}</Text>
                  </View>
                ))}
              </View>
              <View style={ns.track}>
                <View style={[ns.bar, {
                  width: `${niveau.diff.similarite_pct}%`,
                  backgroundColor: niveau.diff.similarite_pct >= 98 ? COLORS.validIcon : niveau.diff.similarite_pct >= 90 ? COLORS.warnIcon : COLORS.alertIcon,
                }]} />
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const ns = StyleSheet.create({
  card:        { borderRadius: 14, borderWidth: 1.5, overflow: 'hidden' },
  cardDisabled:{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.bgCardAlt, padding: 12, opacity: 0.5 },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  badge:       { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  badgeNum:    { color: '#fff', fontSize: 11, fontWeight: '700' },
  label:       { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  labelDisabled:{ flex: 1, fontSize: 12, color: COLORS.textMuted },
  body:        { paddingHorizontal: 12, paddingBottom: 12, gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  detail:      { fontSize: 12, color: COLORS.textPrimary, lineHeight: 18, paddingTop: 10 },
  stepsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  step:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  stepText:    { fontSize: 10, fontWeight: '600' },
  diffWrap:    { gap: 8 },
  diffStats:   { flexDirection: 'row', gap: 8 },
  diffStat:    { flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  diffNum:     { fontSize: 16, fontWeight: '800' },
  diffLabel:   { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  track:       { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' },
  bar:         { height: '100%', borderRadius: 4 },
});

// ─── Écran principal ───────────────────────────────────────────────────────
export default function VerifyScreen({ route, navigation }) {
  const { result = {} } = route.params || {};
  const {
    document_info = {}, niveau1 = {}, niveau2 = {},
    niveau3 = {}, verdict = {},
  } = result;

  const p          = PALETTE[verdict?.couleur] || PALETTE.gris;
  const isNotClean = ['orange', 'rouge', 'gris'].includes(verdict?.couleur);
  const sim        = niveau3?.diff?.similarite_pct ?? null;

  const formattedDate = document_info.date_signature
    ? new Date(document_info.date_signature).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';

  return (
    <SafeAreaView style={vs.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPage} />

      <View style={vs.header}>
        <TouchableOpacity style={vs.backBtn} onPress={() => navigation.goBack()}>
          <IconArrowLeft size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={vs.headerTitle}>Résultat</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={vs.scroll} contentContainerStyle={vs.content} showsVerticalScrollIndicator={false}>

        {/* Verdict banner */}
        <View style={[vs.verdictCard, { backgroundColor: p.bg, borderColor: p.border }]}>
          <View style={vs.verdictRow}>
            <p.Icon size={36} color={p.text} />
            <View style={{ flex: 1 }}>
              <Text style={[vs.verdictLabel, { color: p.text }]}>{verdict.label}</Text>
              <Text style={[vs.verdictDetail, { color: p.text }]}>{verdict.detail}</Text>
            </View>
            {typeof verdict.confiance === 'number' && (
              <View style={vs.confBox}>
                <Text style={[vs.confNum, { color: p.text }]}>{verdict.confiance}%</Text>
                <Text style={[vs.confSub, { color: p.text }]}>confiance</Text>
              </View>
            )}
          </View>
          {typeof verdict.confiance === 'number' && (
            <View style={vs.track}>
              <View style={[vs.bar, { width: `${verdict.confiance}%`, backgroundColor: p.bar }]} />
            </View>
          )}
        </View>

        {/* Infos document */}
        <View style={vs.infoCard}>
          <Text style={vs.sectionLabel}>INFORMATIONS DU DOCUMENT</Text>
          {[
            { l: 'Titre',             v: document_info.titre },
            { l: 'Signé par',         v: document_info.signe_par },
            { l: 'Institution',       v: document_info.institution },
            { l: 'Fonction',          v: document_info.fonction },
            { l: 'Date de signature', v: formattedDate },
            { l: 'Algorithme',        v: document_info.algorithme },
          ].filter(r => r.v).map(r => (
            <View key={r.l} style={vs.infoRow}>
              <Text style={vs.infoL}>{r.l}</Text>
              <Text style={vs.infoV} numberOfLines={2}>{r.v}</Text>
            </View>
          ))}
        </View>

        {/* Niveaux */}
        <Text style={vs.sectionLabel2}>DÉTAIL DE LA VÉRIFICATION</Text>
        <NiveauCard numero={1} label="Niveau 1 — Signature cryptographique RSA-PSS" niveau={niveau1} />
        <NiveauCard numero={2} label="Niveau 2 — Intégrité du contenu (hash)"       niveau={niveau2} />
        <NiveauCard numero={3} label="Niveau 3 — Analyse textuelle fine"             niveau={niveau3} />

        {/* Panel "Find original" — affiché si résultat non parfait */}
        {isNotClean && document_info.titre && (
          <FindOriginalPanel
            titre={document_info.titre}
            comId={document_info.com_id}
          />
        )}

        {/* Nouvelle vérification */}
        <TouchableOpacity style={vs.rescanBtn} onPress={() => navigation.goBack()}>
          <IconRefresh size={15} color={COLORS.primary} />
          <Text style={vs.rescanText}>Vérifier un autre document</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const vs = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: COLORS.bgPage },
  header:  {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.bgPage, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  backBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.bgCardAlt, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },

  scroll:  { flex: 1 },
  content: { padding: 14, gap: 12, paddingBottom: 30 },

  verdictCard: { borderRadius: 16, borderWidth: 2, padding: 16, gap: 12 },
  verdictRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  verdictLabel:{ fontSize: 15, fontWeight: '700', marginBottom: 4 },
  verdictDetail:{ fontSize: 12, lineHeight: 17, opacity: 0.85 },
  confBox:     { alignItems: 'center', flexShrink: 0 },
  confNum:     { fontSize: 24, fontWeight: '900' },
  confSub:     { fontSize: 10, opacity: 0.7 },
  track:       { height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' },
  bar:         { height: '100%', borderRadius: 4 },

  infoCard:    { backgroundColor: COLORS.bgCard, borderRadius: 14, borderWidth: 1, borderColor: COLORS.borderLight, padding: 14, gap: 8 },
  sectionLabel:{ fontSize: 10, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  sectionLabel2:{ fontSize: 10, fontWeight: '700', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  infoRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoL:       { fontSize: 11, color: COLORS.textMuted, flex: 1 },
  infoV:       { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, flex: 2, textAlign: 'right' },

  rescanBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: COLORS.primaryBorder, borderRadius: 14, paddingVertical: 13 },
  rescanText:  { fontSize: 14, fontWeight: '600', color: COLORS.primary },
});