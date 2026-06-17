// src/screens/VerifyScreen.js
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, SafeAreaView, Dimensions,
} from 'react-native';
import { COLORS } from '../theme/colors';
import {
  IconShieldCheck, IconShieldX, IconShieldAlert,
  IconArrowLeft, IconFile, IconRefresh,
  IconCheckCircle, IconXCircle, IconChevronDown, IconQrCode,
} from '../components/Icon';

const { width: W } = Dimensions.get('window');

const PALETTE = {
  vert:   { bg: COLORS.validBg,  border: COLORS.validBorder, text: COLORS.validText,  Icon: IconShieldCheck,  bar: COLORS.validIcon  },
  orange: { bg: COLORS.warnBg,   border: COLORS.warnBorder,  text: COLORS.warnText,   Icon: IconShieldAlert,  bar: COLORS.warnIcon   },
  rouge:  { bg: COLORS.alertBg,  border: COLORS.alertBorder, text: COLORS.alertText,  Icon: IconShieldX,      bar: COLORS.alertIcon  },
  gris:   { bg: COLORS.bgCardAlt,border: COLORS.border,       text: COLORS.textMuted,  Icon: IconShieldAlert,  bar: COLORS.textDim    },
};

function VerdictBanner({ verdict }) {
  const p = PALETTE[verdict?.couleur] || PALETTE.gris;
  return (
    <View style={[styles.verdictCard, { backgroundColor: p.bg, borderColor: p.border }]}>
      <View style={styles.verdictRow}>
        <p.Icon size={32} color={p.text} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.verdictLabel, { color: p.text }]}>{verdict?.label}</Text>
          <Text style={[styles.verdictDetail, { color: p.text }]}>{verdict?.detail}</Text>
        </View>
        {verdict?.confiance > 0 && (
          <View style={styles.confidenceBox}>
            <Text style={[styles.confidenceNum, { color: p.text }]}>{verdict.confiance}%</Text>
            <Text style={[styles.confidenceSub, { color: p.text }]}>confiance</Text>
          </View>
        )}
      </View>
      {verdict?.confiance > 0 && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${verdict.confiance}%`, backgroundColor: p.bar }]} />
        </View>
      )}
    </View>
  );
}

function InfoCard({ info = {} }) {
  const rows = [
    { label: 'Titre',             value: info.titre },
    { label: 'Signé par',         value: info.signe_par },
    { label: 'Institution',       value: info.institution },
    { label: 'Fonction',          value: info.fonction },
    { label: 'Algorithme',        value: info.algorithme },
    { label: 'Date de signature', value: info.date_signature
        ? new Date(info.date_signature).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
        : null
    },
  ].filter(r => r.value);

  return (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <IconFile size={15} color={COLORS.primary} />
        <Text style={styles.cardHeaderText}>INFORMATIONS DU DOCUMENT</Text>
      </View>
      <View style={styles.infoGrid}>
        {rows.map(row => (
          <View key={row.label} style={styles.infoRow}>
            <Text style={styles.infoLabel}>{row.label}</Text>
            <Text style={styles.infoValue} numberOfLines={2}>{row.value}</Text>
          </View>
        ))}
      </View>
      {info.qr_detecte && (
        <View style={styles.qrBadge}>
          <IconQrCode size={12} color={COLORS.validIcon} />
          <Text style={styles.qrBadgeText}>QR code détecté automatiquement</Text>
        </View>
      )}
    </View>
  );
}

function NiveauCard({ numero, label, niveau }) {
  const [open, setOpen] = useState(numero === 1);
  if (!niveau?.execute) {
    return (
      <View style={[styles.niveauCard, styles.niveauCardDisabled]}>
        <View style={[styles.niveauBadge, styles.niveauBadgeDisabled]}>
          <Text style={styles.niveauBadgeText}>{numero}</Text>
        </View>
        <Text style={styles.niveauLabelDisabled}>{label} — Non exécuté</Text>
      </View>
    );
  }
  const valid   = niveau.valide;
  const border  = valid ? COLORS.validBorder  : COLORS.alertBorder;
  const bg      = valid ? COLORS.validBg + '55' : COLORS.alertBg + '55';
  const badgeBg = valid ? COLORS.validIcon    : COLORS.alertIcon;

  const diff = niveau.diff;
  const anomalies = diff?.anomalies || [];

  return (
    <View style={[styles.niveauCard, { borderColor: border, backgroundColor: bg }]}>
      <TouchableOpacity
        style={styles.niveauHeader}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.7}
      >
        <View style={[styles.niveauBadge, { backgroundColor: badgeBg }]}>
          <Text style={styles.niveauBadgeText}>{numero}</Text>
        </View>
        <Text style={styles.niveauLabel} numberOfLines={2}>{label}</Text>
        <View style={{ marginLeft: 'auto' }}>
          {valid
            ? <IconCheckCircle size={16} color={COLORS.validIcon} />
            : <IconXCircle size={16} color={COLORS.alertIcon} />
          }
        </View>
        <IconChevronDown size={14} color={COLORS.textMuted} />
      </TouchableOpacity>

      {open && (
        <View style={styles.niveauBody}>
          <Text style={styles.niveauDetail}>{niveau.detail}</Text>

          {/* Steps niveau 1 */}
          {niveau.etapes && (
            <View style={styles.stepsRow}>
              {Object.entries(niveau.etapes).map(([k, v]) => (
                <View key={k} style={[styles.stepPill, { backgroundColor: v ? COLORS.validBg : COLORS.alertBg }]}>
                  {v ? <IconCheckCircle size={10} color={COLORS.validIcon} /> : <IconXCircle size={10} color={COLORS.alertIcon} />}
                  <Text style={[styles.stepPillText, { color: v ? COLORS.validText : COLORS.alertText }]}>
                    {k.replace(/_/g, ' ')}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Diff niveau 3 */}
          {diff && (
            <View style={styles.diffSection}>
              <View style={styles.diffStats}>
                {[
                  { label: 'Similarité', value: `${diff.similarite_pct}%`, color: diff.similarite_pct >= 98 ? COLORS.validText : diff.similarite_pct >= 90 ? COLORS.warnText : COLORS.alertText },
                  { label: 'Chars OK',   value: String(diff.chars_identiques), color: COLORS.validText },
                  { label: 'Anomalies', value: String(diff.nb_anomalies), color: diff.nb_anomalies === 0 ? COLORS.validText : COLORS.alertText },
                ].map(s => (
                  <View key={s.label} style={styles.diffStat}>
                    <Text style={[styles.diffStatNum, { color: s.color }]}>{s.value}</Text>
                    <Text style={styles.diffStatLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, {
                  width: `${diff.similarite_pct}%`,
                  backgroundColor: diff.similarite_pct >= 98 ? COLORS.validIcon : diff.similarite_pct >= 90 ? COLORS.warnIcon : COLORS.alertIcon,
                }]} />
              </View>
              {anomalies.slice(0, 5).map((a, i) => (
                <View key={i} style={styles.anomalyRow}>
                  <Text style={styles.anomalyLabel}>{a.label}</Text>
                  <Text style={styles.anomalyContext} numberOfLines={2}>« {a.contexte} »</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function VerifyScreen({ route, navigation }) {
  const { result = {} } = route.params || {};
  const { document_info = {}, niveau1 = {}, niveau2 = {}, niveau3 = {}, verdict = {} } = result;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgPage} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <IconArrowLeft size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Résultat de vérification</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <VerdictBanner verdict={verdict} />
        <InfoCard info={document_info} />

        <Text style={styles.sectionLabel}>DÉTAIL PAR NIVEAU</Text>
        <NiveauCard numero={1} label="Niveau 1 — Vérification cryptographique RSA-PSS" niveau={niveau1} />
        <NiveauCard numero={2} label="Niveau 2 — Comparaison hash (OCR sans QR)"       niveau={niveau2} />
        <NiveauCard numero={3} label="Niveau 3 — Analyse textuelle fine"                niveau={niveau3} />

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>ℹ À propos de la vérification</Text>
          <Text style={styles.noteText}>
            Ce système utilise la cryptographie RSA-PSS SHA-256. Un Niveau 1 valide garantit
            que l'agent officiel a bien signé ce document.
          </Text>
        </View>

        <TouchableOpacity style={styles.rescanBtn} onPress={() => navigation.goBack()}>
          <IconRefresh size={15} color={COLORS.primary} />
          <Text style={styles.rescanText}>Vérifier un autre document</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgPage },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: COLORS.bgPage,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn:     { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bgCardAlt },
  headerTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },

  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },

  verdictCard: {
    borderRadius: 16, borderWidth: 2, padding: 16, gap: 12,
  },
  verdictRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  verdictLabel: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  verdictDetail:{ fontSize: 12, lineHeight: 17, opacity: 0.85 },
  confidenceBox:{ alignItems: 'center', flexShrink: 0 },
  confidenceNum:{ fontSize: 26, fontWeight: '900' },
  confidenceSub:{ fontSize: 10, opacity: 0.7 },
  progressTrack:{ height: 8, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.08)', overflow: 'hidden' },
  progressBar:  { height: '100%', borderRadius: 4 },

  infoCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  cardHeaderText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1 },
  infoGrid: { gap: 8 },
  infoRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoLabel:{ fontSize: 11, color: COLORS.textMuted, flex: 1 },
  infoValue:{ fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, flex: 2, textAlign: 'right' },
  qrBadge:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.borderLight },
  qrBadgeText: { fontSize: 11, color: COLORS.validText, fontWeight: '600' },

  sectionLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },

  niveauCard: {
    borderRadius: 14, borderWidth: 1.5, overflow: 'hidden',
  },
  niveauCardDisabled: { backgroundColor: COLORS.bgCardAlt, borderColor: COLORS.border, opacity: 0.5 },
  niveauHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  niveauBadge: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  niveauBadgeDisabled: { backgroundColor: COLORS.textDim },
  niveauBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  niveauLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, flex: 1 },
  niveauLabelDisabled: { fontSize: 12, color: COLORS.textMuted, flex: 1 },
  niveauBody: { paddingHorizontal: 12, paddingBottom: 12, gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.06)' },
  niveauDetail: { fontSize: 12, color: COLORS.textPrimary, lineHeight: 18, paddingTop: 10 },

  stepsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  stepPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  stepPillText: { fontSize: 10, fontWeight: '600' },

  diffSection: { gap: 8 },
  diffStats:   { flexDirection: 'row', gap: 8 },
  diffStat: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: 10, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  diffStatNum:   { fontSize: 18, fontWeight: '800' },
  diffStatLabel: { fontSize: 10, color: COLORS.textMuted, marginTop: 2 },
  anomalyRow: {
    backgroundColor: COLORS.warnBg, borderRadius: 8, padding: 8,
    borderWidth: 1, borderColor: COLORS.warnBorder,
  },
  anomalyLabel:   { fontSize: 11, fontWeight: '700', color: COLORS.warnText, marginBottom: 3 },
  anomalyContext: { fontSize: 11, color: COLORS.textMuted, fontFamily: 'monospace' },

  noteCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 6,
  },
  noteTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary },
  noteText:  { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },

  rescanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 2, borderColor: COLORS.primaryBorder, borderRadius: 14,
    paddingVertical: 13,
  },
  rescanText: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
});