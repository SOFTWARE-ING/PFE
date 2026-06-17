// src/screens/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { getServerUrl, setServerUrl, testServerConnection, DEFAULT_SERVER_URL } from '../config/serverConfig';
import { COLORS } from '../theme/colors';
import { IconShield, IconWifi, IconCheckCircle, IconXCircle } from '../components/Icon';

export default function SettingsScreen() {
  const [address, setAddress] = useState('');
  const [saved, setSaved]     = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus]   = useState(null);

  useEffect(() => {
    (async () => {
      const current = await getServerUrl();
      setAddress(current.replace(/^https?:\/\//i, ''));
      setSaved(current);
    })();
  }, []);

  const normalize = (value) => {
    let v = value.trim();
    if (!v) return '';
    v = v.replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    return `http://${v}`;
  };

  const handleSave = async () => {
    const normalized = normalize(address);
    if (!normalized || normalized === 'http://') {
      Alert.alert('Adresse invalide', "Veuillez saisir l'adresse du serveur.");
      return;
    }
    await setServerUrl(normalized);
    setSaved(normalized);
    setStatus(null);
    Alert.alert('✓ Enregistré', "L'adresse du serveur a été mise à jour.");
  };

  const handleTest = async () => {
    const normalized = normalize(address);
    if (!normalized || normalized === 'http://') {
      Alert.alert('Adresse invalide', "Veuillez saisir l'adresse du serveur.");
      return;
    }
    setTesting(true); setStatus(null);
    try {
      await testServerConnection(normalized);
      setStatus('ok');
    } catch { setStatus('error'); }
    finally { setTesting(false); }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      <View style={styles.header}>
        <View style={styles.logoBox}>
          <IconShield size={22} color="#fff" />
        </View>
        <View>
          <Text style={styles.headerTitle}>Paramètres</Text>
          <Text style={styles.headerSub}>Configuration de l'application</Text>
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>

        {/* Server section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconWifi size={16} color={COLORS.primary} />
            <Text style={styles.sectionTitle}>Adresse du serveur SHIELD</Text>
          </View>
          <Text style={styles.helpText}>
            Adresse IP locale de la machine hébergeant le backend FastAPI.
            Votre téléphone et l'ordinateur doivent être sur le même réseau Wi-Fi.
          </Text>

          <Text style={styles.inputLabel}>Adresse IP et port</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={(t) => { setAddress(t); setStatus(null); }}
            placeholder="192.168.1.100:8000"
            placeholderTextColor={COLORS.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          {status === 'ok' && (
            <View style={[styles.statusBox, styles.statusOk]}>
              <IconCheckCircle size={16} color={COLORS.validIcon} />
              <Text style={styles.statusOkText}>Connexion réussie au serveur SHIELD</Text>
            </View>
          )}
          {status === 'error' && (
            <View style={[styles.statusBox, styles.statusError]}>
              <IconXCircle size={16} color={COLORS.alertIcon} />
              <Text style={styles.statusErrorText}>
                Impossible de joindre ce serveur. Vérifiez l'adresse et le réseau.
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.testBtn} onPress={handleTest} disabled={testing}>
            {testing
              ? <ActivityIndicator color={COLORS.primary} size="small" />
              : <><IconWifi size={15} color={COLORS.primary} /><Text style={styles.testBtnText}>Tester la connexion</Text></>
            }
          </TouchableOpacity>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Enregistrer</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.resetBtn} onPress={() => setAddress(DEFAULT_SERVER_URL.replace(/^https?:\/\//i, ''))}>
            <Text style={styles.resetBtnText}>Réinitialiser par défaut</Text>
          </TouchableOpacity>
        </View>

        {/* Current address */}
        <View style={styles.currentCard}>
          <Text style={styles.currentLabel}>ADRESSE ACTIVE</Text>
          <Text style={styles.currentValue}>{saved || '—'}</Text>
        </View>

        {/* App info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>CommuniSigne Mobile</Text>
          <Text style={styles.infoVersion}>Version 1.0.0</Text>
          <Text style={styles.infoDesc}>
            Plateforme officielle de vérification de documents gouvernementaux signés numériquement.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgDeep },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 16,
    backgroundColor: COLORS.bgDeep,
  },
  logoBox: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  headerTitle: { color: COLORS.textWhite, fontSize: 18, fontWeight: '700' },
  headerSub:   { color: COLORS.tabInactive, fontSize: 12, marginTop: 1 },

  body: {
    flex: 1, backgroundColor: COLORS.bgPage,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },
  bodyContent: { padding: 18, gap: 16, paddingBottom: 32 },

  section: {
    backgroundColor: COLORS.bgCard, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 16, gap: 10,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle:  { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  helpText:      { fontSize: 12, color: COLORS.textMuted, lineHeight: 18 },

  inputLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: COLORS.textPrimary, backgroundColor: COLORS.bgInput,
  },

  statusBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 12, padding: 12 },
  statusOk:    { backgroundColor: COLORS.validBg, borderWidth: 1, borderColor: COLORS.validBorder },
  statusError: { backgroundColor: COLORS.alertBg, borderWidth: 1, borderColor: COLORS.alertBorder },
  statusOkText:    { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.validText },
  statusErrorText: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.alertText },

  testBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: COLORS.primaryBorder, borderRadius: 12,
    paddingVertical: 12,
  },
  testBtnText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },

  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  resetBtn:    { alignItems: 'center', paddingVertical: 4 },
  resetBtnText:{ color: COLORS.textMuted, fontSize: 12, textDecorationLine: 'underline' },

  currentCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 14,
  },
  currentLabel: { fontSize: 10, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  currentValue: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  infoCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border, padding: 14, gap: 4,
  },
  infoTitle:   { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  infoVersion: { fontSize: 11, color: COLORS.textMuted },
  infoDesc:    { fontSize: 12, color: COLORS.textMuted, lineHeight: 18, marginTop: 4 },
});