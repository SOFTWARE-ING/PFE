// src/screens/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import {
  getServerUrl, setServerUrl, testServerConnection, DEFAULT_SERVER_URL,
} from '../config/serverConfig';
import { COLORS } from '../theme/colors';

export default function SettingsScreen() {
  const [address, setAddress] = useState('');
  const [saved, setSaved]     = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus]   = useState(null); // 'ok' | 'error' | null

  useEffect(() => {
    (async () => {
      const current = await getServerUrl();
      setAddress(current);
      setSaved(current);
    })();
  }, []);

  const normalize = (value) => {
    let v = value.trim();
    if (!v) return '';
    // Retire tout schéma existant puis force http://
    v = v.replace(/^https?:\/\//i, '');
    v = v.replace(/\/+$/, '');
    return `http://${v}`;
  };

  const handleSave = async () => {
    const normalized = normalize(address);
    if (!normalized) {
      Alert.alert('Adresse invalide', "Veuillez saisir l'adresse du serveur.");
      return;
    }
    await setServerUrl(normalized);
    setAddress(normalized);
    setSaved(normalized);
    setStatus(null);
    Alert.alert('Enregistré', "L'adresse du serveur a été mise à jour.");
  };

  const handleTest = async () => {
    const normalized = normalize(address);
    if (!normalized) {
      Alert.alert('Adresse invalide', "Veuillez saisir l'adresse du serveur.");
      return;
    }
    setTesting(true);
    setStatus(null);
    try {
      await testServerConnection(normalized);
      setStatus('ok');
    } catch {
      setStatus('error');
    } finally {
      setTesting(false);
    }
  };

  const handleReset = () => setAddress(DEFAULT_SERVER_URL);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Paramètres</Text>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: 18 }}>
        <Text style={styles.sectionLabel}>Adresse du serveur SHIELD</Text>
        <Text style={styles.helpText}>
          Adresse IP locale (et port) de la machine qui héberge le backend,
          par exemple 192.168.1.42:8000. Le téléphone et l'ordinateur doivent
          être sur le même réseau Wi-Fi.
        </Text>

        <TextInput
          style={styles.input}
          value={address}
          onChangeText={(t) => { setAddress(t); setStatus(null); }}
          placeholder="192.168.1.42:8000"
          placeholderTextColor={COLORS.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />

        {status === 'ok' && (
          <View style={[styles.statusBox, styles.statusOk]}>
            <Text style={styles.statusOkText}>✓  Connexion réussie au serveur</Text>
          </View>
        )}
        {status === 'error' && (
          <View style={[styles.statusBox, styles.statusError]}>
            <Text style={styles.statusErrorText}>
              ✕  Impossible de joindre ce serveur. Vérifiez l'adresse et le réseau.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.testBtn} onPress={handleTest} disabled={testing}>
          {testing
            ? <ActivityIndicator color={COLORS.accent} />
            : <Text style={styles.testBtnText}>Tester la connexion</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Enregistrer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
          <Text style={styles.resetBtnText}>Réinitialiser par défaut</Text>
        </TouchableOpacity>

        <View style={styles.currentBox}>
          <Text style={styles.currentLabel}>Adresse active actuellement</Text>
          <Text style={styles.currentValue}>{saved || '—'}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgDeep },

  header: {
    backgroundColor: COLORS.bgDeep,
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  headerTitle: { color: COLORS.textWhite, fontSize: 20, fontWeight: '700' },

  body: {
    flex: 1, backgroundColor: COLORS.bgWhite,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
  },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textPrimary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
  },
  helpText: {
    fontSize: 12, color: COLORS.textSecondary, lineHeight: 18, marginBottom: 14,
  },

  input: {
    borderWidth: 1.5, borderColor: COLORS.borderLight,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: COLORS.textPrimary, marginBottom: 12,
  },

  statusBox: { borderRadius: 10, padding: 10, marginBottom: 12 },
  statusOk:    { backgroundColor: COLORS.validBg },
  statusError: { backgroundColor: COLORS.alertBg },
  statusOkText:    { color: COLORS.validText, fontSize: 12, fontWeight: '600' },
  statusErrorText: { color: COLORS.alertText, fontSize: 12, fontWeight: '600' },

  testBtn: {
    borderWidth: 1.5, borderColor: COLORS.accent, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginBottom: 10,
  },
  testBtnText: { color: COLORS.accent, fontSize: 14, fontWeight: '700' },

  saveBtn: {
    backgroundColor: COLORS.accent, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', marginBottom: 10,
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  resetBtn: { alignItems: 'center', paddingVertical: 8, marginBottom: 24 },
  resetBtnText: { color: COLORS.textSecondary, fontSize: 12, textDecorationLine: 'underline' },

  currentBox: {
    backgroundColor: COLORS.bgLight, borderRadius: 12, padding: 14,
  },
  currentLabel: { fontSize: 10, color: '#AAA', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  currentValue: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
});