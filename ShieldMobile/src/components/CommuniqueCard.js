// src/components/CommuniqueCard.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../theme/colors';

export default function CommuniqueCard({ communique, onPress }) {
  const date = communique.date_publication
    ? new Date(communique.date_publication).toLocaleDateString('fr-FR', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : '—';

  const institution = communique.institution || 'Institution';
  const isValid     = communique.est_valide !== false; // valide par défaut

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Icône document */}
      <View style={styles.iconBox}>
        <Text style={styles.iconEmoji}>📄</Text>
      </View>

      {/* Corps */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {communique.titre || 'Sans titre'}
        </Text>
        <Text style={styles.meta}>
          {institution} · {date}
        </Text>

        {/* Badge statut */}
        {isValid ? (
          <View style={styles.validBadge}>
            <Text style={styles.validText}>✓  Signature valide</Text>
          </View>
        ) : (
          <View style={styles.archiveBadge}>
            <Text style={styles.archiveText}>📦 Archivé</Text>
          </View>
        )}
      </View>

      {/* Flèche */}
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 12, padding: 12, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  iconBox: {
    width: 42, height: 42, borderRadius: 10,
    backgroundColor: COLORS.bgDeep,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  iconEmoji: { fontSize: 20 },

  body:  { flex: 1 },
  title: {
    color: COLORS.textWhite, fontSize: 13, fontWeight: '600',
    lineHeight: 18, marginBottom: 3,
  },
  meta: { color: COLORS.accentMuted, fontSize: 11, marginBottom: 6 },

  validBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.validBg,
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  validText: { color: COLORS.validText, fontSize: 10, fontWeight: '600' },

  archiveBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#2A1E0A',
    borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
  },
  archiveText: { color: '#E8A645', fontSize: 10, fontWeight: '600' },

  arrow: { color: COLORS.accentDim, fontSize: 22, fontWeight: '300' },
});
