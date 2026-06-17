// src/screens/DetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, StatusBar, SafeAreaView, Share,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getCommuniqueDetail } from '../api/apiClient';
import { getApiBaseUrl } from '../api/apiClient';
import { COLORS } from '../theme/colors';
import {
  IconArrowLeft, IconFile, IconCalendar, IconUser,
  IconDownload, IconShare, IconShieldCheck, IconShieldAlert,
} from '../components/Icon';

export default function DetailScreen({ route, navigation }) {
  const { id } = route.params || {};
  const [communique, setCom]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDl]  = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    (async () => {
      try {
        const data = await getCommuniqueDetail(id);
        setCom(data.communique);
      } catch {
        Alert.alert('Erreur', 'Impossible de charger le communiqué.');
        navigation.goBack();
      } finally { setLoading(false); }
    })();
  }, [id]);

  const handleDownload = async () => {
    setDl(true);
    try {
      const base = await getApiBaseUrl();
      const url  = `${base}/documents/${id}/download`;
      const filename = `${communique?.titre?.replace(/[^a-zA-Z0-9]/g, '_') || id}.pdf`;
      const dest = FileSystem.documentDirectory + filename;
      const { uri } = await FileSystem.downloadAsync(url, dest);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      } else {
        Alert.alert('Téléchargé', `Fichier enregistré : ${filename}`);
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de télécharger le document.');
    } finally { setDl(false); }
  };

  const handleShare = async () => {
    try {
      await Share.share({ message: `Communiqué officiel : ${communique?.titre || ''}\nVérifier sur CommuniSigne.` });
    } catch { /* ignore */ }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const isValid = communique?.est_valide !== false;
  const date    = communique?.date_publication
    ? new Date(communique.date_publication).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '—';
  const signataire = communique?.signataire || {};

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPage} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <IconArrowLeft size={20} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail</Text>
        <TouchableOpacity style={styles.shareHeaderBtn} onPress={handleShare}>
          <IconShare size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Validity badge */}
        <View style={[styles.validityBadge, !isValid && styles.validityBadgeWarn]}>
          {isValid
            ? <IconShieldCheck size={15} color={COLORS.validText} />
            : <IconShieldAlert size={15} color={COLORS.warnText} />
          }
          <Text style={[styles.validityText, !isValid && styles.validityTextWarn]}>
            {isValid ? 'Signature cryptographique valide' : 'Signature non confirmée'}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>{communique?.titre || 'Sans titre'}</Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <IconCalendar size={12} color={COLORS.textMuted} />
            <Text style={styles.metaChipText}>{date}</Text>
          </View>
          {communique?.institution && (
            <View style={styles.metaChip}>
              <IconFile size={12} color={COLORS.textMuted} />
              <Text style={styles.metaChipText}>{communique.institution}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Content */}
        <Text style={styles.sectionLabel}>Contenu</Text>
        <View style={styles.contentCard}>
          <Text style={styles.contentText}>{communique?.contenu || '—'}</Text>
        </View>

        {/* Signataire */}
        {(signataire.nom || signataire.role) && (
          <>
            <Text style={styles.sectionLabel}>Agent signataire</Text>
            <View style={styles.signerCard}>
              <View style={styles.signerAvatar}>
                <IconUser size={20} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.signerName}>{signataire.nom || 'Signataire inconnu'}</Text>
                {!!signataire.role && <Text style={styles.signerRole}>{signataire.role}</Text>}
              </View>
            </View>
          </>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnPrimary]}
            onPress={handleDownload}
            disabled={downloading}
            activeOpacity={0.8}
          >
            {downloading
              ? <ActivityIndicator color="#fff" size="small" />
              : <IconDownload size={16} color="#fff" />
            }
            <Text style={styles.actionBtnPrimaryText}>
              {downloading ? 'Téléchargement...' : 'Télécharger PDF'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnSecondary]}
            onPress={() => navigation.navigate('Scanner', { screen: 'ScanCamera' })}
            activeOpacity={0.8}
          >
            <IconShieldCheck size={16} color={COLORS.primary} />
            <Text style={styles.actionBtnSecondaryText}>Vérifier QR</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgPage },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.bgPage, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.bgCardAlt,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle:    { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  shareHeaderBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.bgCardAlt, justifyContent: 'center', alignItems: 'center' },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  validityBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: COLORS.validBg, borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: COLORS.validBorder,
  },
  validityText:     { fontSize: 12, fontWeight: '600', color: COLORS.validText },
  validityBadgeWarn:{ backgroundColor: COLORS.warnBg, borderColor: COLORS.warnBorder },
  validityTextWarn: { color: COLORS.warnText },

  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 26 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.bgCard, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: COLORS.border,
  },
  metaChipText: { fontSize: 11, color: COLORS.textMuted, fontWeight: '500' },

  divider: { height: 1, backgroundColor: COLORS.borderLight },

  sectionLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },

  contentCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
  },
  contentText: { fontSize: 13, color: COLORS.textPrimary, lineHeight: 21 },

  signerCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
  },
  signerAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primaryPale,
    justifyContent: 'center', alignItems: 'center',
  },
  signerName: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  signerRole: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },

  actionsRow: { flexDirection: 'row', gap: 10 },
  actionBtn:  {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
    borderRadius: 14, paddingVertical: 13,
  },
  actionBtnPrimary:      { backgroundColor: COLORS.primary },
  actionBtnPrimaryText:  { color: '#fff', fontSize: 13, fontWeight: '700' },
  actionBtnSecondary:    { backgroundColor: COLORS.bgCard, borderWidth: 1.5, borderColor: COLORS.border },
  actionBtnSecondaryText:{ color: COLORS.primary, fontSize: 13, fontWeight: '700' },
});