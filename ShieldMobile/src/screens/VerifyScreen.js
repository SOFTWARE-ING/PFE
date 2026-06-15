// src/screens/VerifyScreen.js
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, SafeAreaView,
} from 'react-native';
import { COLORS } from '../theme/colors';

const VERDICT_PALETTE = {
  vert:   { bg: COLORS.validLight, badge: COLORS.validBg, badgeText: COLORS.validText, emoji: '🛡️' },
  orange: { bg: COLORS.warnBg,     badge: COLORS.warnBg,  badgeText: COLORS.warnText,  emoji: '⚠️' },
  rouge:  { bg: COLORS.alertBg,    badge: COLORS.alertBg, badgeText: COLORS.alertText, emoji: '❌' },
  gris:   { bg: COLORS.bgLight,    badge: COLORS.bgLight, badgeText: COLORS.textSecondary, emoji: '❔' },
};

function MetaRow({ label, value }) {
  if (!value) return null;
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={3}>{value}</Text>
    </View>
  );
}

function StepRow({ executed, done, label, detail }) {
  const icon = !executed ? '⬜' : done ? '✅' : '❌';
  return (
    <View style={styles.stepRow}>
      <Text style={styles.stepIcon}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.stepLabel}>{label}</Text>
        {!!detail && <Text style={styles.stepDetail}>{detail}</Text>}
      </View>
    </View>
  );
}

export default function VerifyScreen({ route, navigation }) {
  const { result = {} } = route.params || {};
  const {
    document_info = {},
    niveau1 = {},
    niveau2 = {},
    niveau3 = {},
    verdict = {},
  } = result;

  const palette = VERDICT_PALETTE[verdict.couleur] || VERDICT_PALETTE.gris;

  const formattedDate = document_info.date_signature
    ? new Date(document_info.date_signature).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'long', year: 'numeric',
      })
    : '—';

  const anomalies = niveau3?.diff?.anomalies || [];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Résultat de la vérification</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.iconWrap, { backgroundColor: palette.bg }]}>
          <Text style={styles.shieldEmoji}>{palette.emoji}</Text>
        </View>

        <Text style={styles.statusTitle}>{verdict.label || 'Résultat indisponible'}</Text>
        {!!verdict.detail && <Text style={styles.statusSub}>{verdict.detail}</Text>}

        {typeof verdict.confiance === 'number' && (
          <View style={[styles.confidenceBadge, { backgroundColor: palette.badge }]}>
            <Text style={[styles.confidenceText, { color: palette.badgeText }]}>
              Confiance : {verdict.confiance}%
            </Text>
          </View>
        )}

        {/* Informations du document */}
        <View style={styles.metaCard}>
          <MetaRow label="Titre"             value={document_info.titre} />
          <View style={styles.metaSep} />
          <MetaRow label="Institution"       value={document_info.institution} />
          <View style={styles.metaSep} />
          <MetaRow label="Signé par"         value={document_info.signe_par} />
          <View style={styles.metaSep} />
          <MetaRow label="Fonction"          value={document_info.fonction} />
          <View style={styles.metaSep} />
          <MetaRow label="Date de signature" value={formattedDate} />
          <View style={styles.metaSep} />
          <MetaRow label="Algorithme"        value={document_info.algorithme} />
        </View>

        {/* Détail des 3 niveaux de vérification */}
        <View style={styles.stepsCard}>
          <Text style={styles.stepsTitle}>Détail de la vérification</Text>

          <StepRow
            executed={niveau1.execute}
            done={niveau1.valide}
            label="Niveau 1 — Signature cryptographique (RSA-PSS)"
            detail={niveau1.detail}
          />
          <View style={styles.metaSep} />
          <StepRow
            executed={niveau2.execute}
            done={niveau2.valide}
            label="Niveau 2 — Intégrité du contenu (hash)"
            detail={niveau2.detail}
          />
          <View style={styles.metaSep} />
          <StepRow
            executed={niveau3.execute}
            done={niveau3.valide}
            label="Niveau 3 — Analyse fine du texte"
            detail={niveau3.detail}
          />
        </View>

        {/* Anomalies détectées (niveau 3) */}
        {anomalies.length > 0 && (
          <View style={styles.anomCard}>
            <Text style={styles.stepsTitle}>
              Anomalies détectées ({niveau3.diff.nb_anomalies})
            </Text>
            <Text style={styles.anomSub}>
              Similarité avec l'original : {niveau3.diff.similarite_pct}%
            </Text>
            {anomalies.slice(0, 5).map((a, idx) => (
              <View key={idx} style={styles.anomRow}>
                <Text style={styles.anomLabel}>{a.label}</Text>
                <Text style={styles.anomContext} numberOfLines={2}>« …{a.contexte}… »</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.rescanBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.rescanText}>Vérifier un autre document</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgDeep },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgDeep,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn:     { width: 32, height: 32, justifyContent: 'center' },
  backIcon:    { color: COLORS.accentMuted, fontSize: 28, lineHeight: 30 },
  headerTitle: { color: COLORS.textWhite, fontSize: 16, fontWeight: '600' },

  body: {
    flex: 1, backgroundColor: COLORS.bgWhite,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  bodyContent: {
    alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 30, paddingBottom: 30,
  },

  iconWrap: {
    width: 88, height: 88, borderRadius: 44,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 16,
  },
  shieldEmoji: { fontSize: 42 },

  statusTitle: {
    fontSize: 17, fontWeight: '700', color: COLORS.textPrimary,
    marginBottom: 6, textAlign: 'center',
  },
  statusSub: {
    fontSize: 12, color: COLORS.textSecondary, textAlign: 'center',
    lineHeight: 18, marginBottom: 12, paddingHorizontal: 10,
  },

  confidenceBadge: {
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5,
    marginBottom: 18,
  },
  confidenceText: { fontSize: 12, fontWeight: '700' },

  metaCard: {
    backgroundColor: COLORS.bgLight, borderRadius: 14,
    padding: 14, width: '100%', marginBottom: 14,
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
  metaSep: { height: 1, backgroundColor: COLORS.borderLight, marginVertical: 2 },

  stepsCard: {
    backgroundColor: COLORS.bgLight, borderRadius: 14,
    padding: 14, width: '100%', marginBottom: 14,
  },
  stepsTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.textPrimary,
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  stepRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, alignItems: 'flex-start' },
  stepIcon: { fontSize: 16, marginTop: 1 },
  stepLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 2 },
  stepDetail: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },

  anomCard: {
    backgroundColor: COLORS.warnBg, borderRadius: 14,
    padding: 14, width: '100%', marginBottom: 14,
  },
  anomSub: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 10 },
  anomRow: { marginBottom: 8 },
  anomLabel: { fontSize: 11, fontWeight: '700', color: COLORS.warnText },
  anomContext: { fontSize: 11, color: COLORS.textSecondary, fontFamily: 'monospace', marginTop: 2 },

  rescanBtn: {
    width: '100%', borderWidth: 1.5, borderColor: COLORS.borderLight,
    borderRadius: 12, padding: 13, alignItems: 'center', marginTop: 4,
  },
  rescanText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
});