// src/screens/VerifyScreen.js
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, SafeAreaView,
} from 'react-native';
import { COLORS } from '../theme/colors';

// ─── Ligne de metadata ────────────────────────────────────────────────
function MetaRow({ label, value }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export default function VerifyScreen({ route, navigation }) {
  const { result = {}, qrData = '' } = route.params || {};

  // Normalise le résultat selon la structure de l'API
  const isValid        = result?.est_valide ?? result?.valid ?? false;
  const titre          = result?.communique?.titre || result?.titre || 'Communiqué vérifié';
  const institution    = result?.communique?.institution || result?.institution || '—';
  const signedDate     = result?.communique?.date_publication || result?.date_publication;
  const algorithm      = result?.algorithm || 'RSA-SHA256';
  const hash           = result?.hash || result?.signature_hash || '';

  const formattedDate = signedDate
    ? new Date(signedDate).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : '—';

  const truncatedHash = hash
    ? `${hash.slice(0, 8)}...${hash.slice(-6)}`
    : 'a3f8bc...d91e42';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vérification</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* ── Corps (fond blanc) ── */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Icône bouclier */}
        <View style={[styles.iconWrap, !isValid && styles.iconWrapInvalid]}>
          <Text style={styles.shieldEmoji}>{isValid ? '🛡️' : '⚠️'}</Text>
        </View>

        {/* Statut */}
        <Text style={styles.statusTitle}>
          {isValid ? 'Communiqué authentique ✅' : 'Signature invalide ❌'}
        </Text>
        <Text style={styles.statusSub}>
          {isValid
            ? 'La signature numérique a été vérifiée avec succès'
            : 'Ce document n\'a pas pu être authentifié'}
        </Text>

        {/* Carte métadonnées */}
        <View style={styles.metaCard}>
          <MetaRow label="Titre"       value={titre} />
          <View style={styles.metaSep} />
          <MetaRow label="Institution" value={institution} />
          <View style={styles.metaSep} />
          <MetaRow label="Signé le"    value={formattedDate} />
          <View style={styles.metaSep} />
          <MetaRow label="Algorithme"  value={algorithm} />

          {/* Hash SHA256 */}
          <View style={styles.metaSep} />
          <Text style={styles.metaLabel}>Empreinte SHA256</Text>
          <Text style={styles.hashText}>{truncatedHash}</Text>
        </View>

        {/* Bouton voir document */}
        {isValid && (
          <TouchableOpacity
            style={styles.docBtn}
            onPress={() => navigation.navigate('HomeList')}
            activeOpacity={0.85}
          >
            <Text style={styles.docBtnText}>Voir le document complet</Text>
          </TouchableOpacity>
        )}

        {/* Bouton rescanner */}
        <TouchableOpacity
          style={styles.rescanBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.rescanText}>
            {isValid ? 'Retour au scanner' : 'Réessayer'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgDeep },

  // ── Header ────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgDeep,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn:     { width: 32, height: 32, justifyContent: 'center' },
  backIcon:    { color: COLORS.accentMuted, fontSize: 28, lineHeight: 30 },
  headerTitle: { color: COLORS.textWhite, fontSize: 16, fontWeight: '600' },

  // ── Body ──────────────────────────────────────────────────────
  body: {
    flex: 1, backgroundColor: COLORS.bgWhite,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  bodyContent: {
    alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 30, paddingBottom: 30,
  },

  // ── Icône ─────────────────────────────────────────────────────
  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: COLORS.validLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
    shadowColor: COLORS.validDark,
    shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  iconWrapInvalid: { backgroundColor: COLORS.alertBg },
  shieldEmoji: { fontSize: 42 },

  // ── Status ────────────────────────────────────────────────────
  statusTitle: {
    fontSize: 17, fontWeight: '700', color: COLORS.textPrimary,
    marginBottom: 6, textAlign: 'center',
  },
  statusSub: {
    fontSize: 12, color: COLORS.textSecondary, textAlign: 'center',
    lineHeight: 18, marginBottom: 24, paddingHorizontal: 20,
  },

  // ── Meta card ─────────────────────────────────────────────────
  metaCard: {
    backgroundColor: COLORS.bgLight, borderRadius: 14,
    padding: 14, width: '100%', marginBottom: 16,
  },
  metaRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingVertical: 5,
  },
  metaLabel: { fontSize: 11, color: COLORS.accentMuted, flex: 1 },
  metaValue: {
    fontSize: 12, fontWeight: '600', color: COLORS.textPrimary,
    flex: 2, textAlign: 'right',
  },
  metaSep:  { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 2 },
  hashText: {
    fontSize: 11, color: COLORS.textSecondary,
    fontFamily: 'monospace', marginTop: 4, lineHeight: 16,
    wordBreak: 'break-all',
  },

  // ── Buttons ───────────────────────────────────────────────────
  docBtn: {
    width: '100%', backgroundColor: COLORS.bgDeep,
    borderRadius: 12, padding: 14,
    alignItems: 'center', marginBottom: 10,
  },
  docBtnText:  { color: '#fff', fontSize: 14, fontWeight: '600' },
  rescanBtn: {
    width: '100%', borderWidth: 1.5, borderColor: COLORS.borderLight,
    borderRadius: 12, padding: 13, alignItems: 'center',
  },
  rescanText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
});
