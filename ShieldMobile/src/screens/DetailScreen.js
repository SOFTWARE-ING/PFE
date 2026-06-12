// src/screens/DetailScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, StatusBar, SafeAreaView, Share,
} from 'react-native';
import { getCommuniqueById } from '../api/apiClient';
import { COLORS } from '../theme/colors';

// ─── Initiales avatar ────────────────────────────────────────────────
function Avatar({ name = '' }) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <View style={styles.signerAvatar}>
      <Text style={styles.signerAvatarText}>{initials || '?'}</Text>
    </View>
  );
}

// ─── Bouton action rapide ─────────────────────────────────────────────
function ActionButton({ icon, label, onPress }) {
  return (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress} activeOpacity={0.8}>
      <Text style={styles.actionIcon}>{icon}</Text>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function DetailScreen({ route, navigation }) {
  const { id }               = route.params || {};
  const [communique, setCom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCommuniqueById(id);
        setCom(data.communique || data);
      } catch {
        Alert.alert('Erreur', 'Impossible de charger le communiqué.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    if (id) load();
    else {
      // Demo data si pas d'ID
      setCom({
        titre: 'Communiqué relatif aux élections législatives 2025',
        institution: 'Ministère de l\'Intérieur',
        date_publication: new Date().toISOString(),
        contenu: 'Le Ministère de l\'Intérieur informe la population que les élections législatives auront lieu le 15 juillet 2025. Les électeurs sont invités à se munir de leur carte nationale d\'identité en cours de validité.',
        signataire: { nom: 'Amb. Martin Akono', role: 'Secrétaire Général, Min. Intérieur' },
        est_valide: true,
      });
      setLoading(false);
    }
  }, [id]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Communiqué officiel : ${communique?.titre || ''}\nVérifier sur CommuniSigne.`,
      });
    } catch (e) {
      Alert.alert('Erreur', 'Impossible de partager.');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accentLight} />
        </View>
      </SafeAreaView>
    );
  }

  const date = communique?.date_publication
    ? new Date(communique.date_publication).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : '—';

  const signataire = communique?.signataire || {};

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      {/* ── Header sombre ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Détail</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* ── Corps (fond blanc) ── */}
      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        {/* Badge statut */}
        <View style={styles.statusBadge}>
          <Text style={styles.statusBadgeText}>✓  Signature valide</Text>
        </View>

        {/* Titre */}
        <Text style={styles.title}>{communique?.titre || 'Sans titre'}</Text>

        {/* Institution · Date */}
        <Text style={styles.institution}>
          {communique?.institution || 'Institution'} · {date}
        </Text>

        {/* Séparateur */}
        <View style={styles.separator} />

        {/* Contenu */}
        <Text style={styles.sectionLabel}>Contenu</Text>
        <Text style={styles.contentText}>{communique?.contenu || '—'}</Text>

        <View style={styles.separator} />

        {/* Agent signataire */}
        <Text style={styles.sectionLabel}>Agent signataire</Text>
        <View style={styles.signerCard}>
          <Avatar name={signataire.nom || 'Signataire'} />
          <View style={{ flex: 1 }}>
            <Text style={styles.signerName}>{signataire.nom || 'Signataire inconnu'}</Text>
            <Text style={styles.signerRole}>{signataire.role || 'Rôle non spécifié'}</Text>
          </View>
        </View>

        {/* Actions rapides */}
        <View style={styles.actionsRow}>
          <ActionButton icon="⬇️" label="Télécharger" onPress={() => Alert.alert('Info', 'Téléchargement à venir.')} />
          <ActionButton icon="📷" label="Vérifier QR" onPress={() => navigation.navigate('ScanCamera')} />
          <ActionButton icon="↗️" label="Partager"    onPress={handleShare} />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgDeep },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Header ────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.bgDeep,
  },
  backBtn:     { width: 32, height: 32, justifyContent: 'center' },
  backIcon:    { color: COLORS.accentMuted, fontSize: 28, lineHeight: 30 },
  headerTitle: { color: COLORS.textWhite, fontSize: 16, fontWeight: '600' },

  // ── Body ──────────────────────────────────────────────────────
  body: {
    flex: 1, backgroundColor: COLORS.bgWhite,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 18, paddingTop: 20,
  },

  // ── Status badge ──────────────────────────────────────────────
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.validLight,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    marginBottom: 14,
  },
  statusBadgeText: { color: COLORS.validDark, fontSize: 12, fontWeight: '600' },

  // ── Content ───────────────────────────────────────────────────
  title: {
    fontSize: 17, fontWeight: '700', color: COLORS.textPrimary,
    lineHeight: 24, marginBottom: 6,
  },
  institution: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 16 },
  separator:   { height: 1, backgroundColor: COLORS.borderLight, marginBottom: 14 },
  sectionLabel: {
    fontSize: 10, color: '#AAA', textTransform: 'uppercase',
    letterSpacing: 1, marginBottom: 6,
  },
  contentText: { fontSize: 13, color: '#333', lineHeight: 20, marginBottom: 16 },

  // ── Signer card ───────────────────────────────────────────────
  signerCard: {
    backgroundColor: COLORS.bgLight, borderRadius: 12,
    padding: 12, flexDirection: 'row', alignItems: 'center',
    gap: 10, marginBottom: 16,
  },
  signerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  signerAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  signerName:       { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  signerRole:       { fontSize: 11, color: COLORS.accentMuted, marginTop: 1 },

  // ── Actions ───────────────────────────────────────────────────
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  actionBtn: {
    flex: 1, backgroundColor: COLORS.bgLight, borderRadius: 12,
    paddingVertical: 10, alignItems: 'center',
  },
  actionIcon:  { fontSize: 20, marginBottom: 4 },
  actionLabel: { fontSize: 11, color: COLORS.textSecondary },
});
