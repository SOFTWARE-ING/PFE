// src/screens/SettingsScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { getServerUrl, setServerUrl, testServerConnection, DEFAULT_SERVER_URL } from '../config/serverConfig';
import { COLORS } from '../theme/colors';
import { IconShield, IconWifi, IconCheckCircleFill, IconXCircleFill, IconRefresh } from '../components/Icon';

export default function SettingsScreen() {
  const [address, setAddress] = useState('');
  const [saved, setSaved]     = useState('');
  const [testing, setTesting] = useState(false);
  const [status, setStatus]   = useState(null);

  useEffect(() => {
    (async () => {
      const cur = await getServerUrl();
      setAddress(cur.replace(/^https?:\/\//i, ''));
      setSaved(cur);
    })();
  }, []);

  const normalize = (v) => {
    let s = v.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
    return s ? `http://${s}` : '';
  };

  const handleSave = async () => {
    const url = normalize(address);
    if (!url) { Alert.alert('Adresse invalide', 'Saisissez une adresse IP valide.'); return; }
    await setServerUrl(url);
    setSaved(url); setStatus(null);
    Alert.alert('✓ Enregistré', 'Adresse du serveur mise à jour.');
  };

  const handleTest = async () => {
    const url = normalize(address);
    if (!url) { Alert.alert('Adresse invalide', 'Saisissez une adresse IP valide.'); return; }
    setTesting(true); setStatus(null);
    try { await testServerConnection(url); setStatus('ok'); }
    catch { setStatus('error'); }
    finally { setTesting(false); }
  };

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgApp} />
      <SafeAreaView style={{ backgroundColor: COLORS.bgApp }}>
        <View style={s.header}>
          <View style={s.logoBox}><IconShield size={20} color="#fff" /></View>
          <View>
            <Text style={s.title}>Paramètres</Text>
            <Text style={s.sub}>Configuration du serveur</Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}>

        {/* Server card */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <IconWifi size={16} color={COLORS.secondary} />
            <Text style={s.cardTitle}>Serveur SHIELD</Text>
          </View>
          <Text style={s.cardDesc}>
            Adresse IP locale de la machine hébergeant le backend. Votre téléphone et le PC doivent être sur le même réseau Wi-Fi.
          </Text>

          <Text style={s.inputLabel}>ADRESSE IP ET PORT</Text>
          <TextInput
            style={s.input}
            value={address}
            onChangeText={(t) => { setAddress(t); setStatus(null); }}
            placeholder="192.168.1.100:8000"
            placeholderTextColor={COLORS.textDim}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />

          {status === 'ok' && (
            <View style={[s.statusBox, s.statusOk]}>
              <IconCheckCircleFill size={16} color={COLORS.validIcon} />
              <Text style={s.statusOkText}>Serveur SHIELD joignable</Text>
            </View>
          )}
          {status === 'error' && (
            <View style={[s.statusBox, s.statusErr]}>
              <IconXCircleFill size={16} color={COLORS.alertIcon} />
              <Text style={s.statusErrText}>Serveur inaccessible. Vérifiez l'IP et le réseau.</Text>
            </View>
          )}

          <View style={s.btnRow}>
            <TouchableOpacity style={s.testBtn} onPress={handleTest} disabled={testing}>
              {testing ? <ActivityIndicator color={COLORS.primary} size="small" /> : <><IconWifi size={14} color={COLORS.primary} /><Text style={s.testBtnText}>Tester</Text></>}
            </TouchableOpacity>
            <TouchableOpacity style={s.saveBtn} onPress={handleSave}>
              <Text style={s.saveBtnText}>Enregistrer</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => setAddress(DEFAULT_SERVER_URL.replace(/^https?:\/\//i, ''))} style={s.resetBtn}>
            <IconRefresh size={12} color={COLORS.textMuted} />
            <Text style={s.resetText}>Réinitialiser</Text>
          </TouchableOpacity>
        </View>

        {/* Current address */}
        <View style={s.card}>
          <Text style={s.inputLabel}>ADRESSE ACTIVE</Text>
          <Text style={s.currentVal}>{saved || '—'}</Text>
        </View>

        {/* App info */}
        <View style={s.card}>
          <View style={s.appInfoRow}>
            <View style={s.appInfoIcon}><IconShield size={22} color={COLORS.primary} /></View>
            <View>
              <Text style={s.appInfoName}>CommuniSigne</Text>
              <Text style={s.appInfoVer}>Version 1.0.0 — Vérification officielle</Text>
            </View>
          </View>
          <Text style={s.appInfoDesc}>
            Plateforme officielle de vérification des documents gouvernementaux signés numériquement via RSA-PSS SHA-256.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: COLORS.bgApp },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14 },
  logoBox:     { width: 42, height: 42, borderRadius: 13, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
  title:       { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  sub:         { color: COLORS.textMuted, fontSize: 11, marginTop: 1 },

  scroll:       { flex: 1 },
  scrollContent:{ padding: 16, gap: 14, paddingBottom: 40 },

  card: { backgroundColor: COLORS.bgCard, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: COLORS.border, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle:  { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  cardDesc:   { color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },

  inputLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2 },
  input: {
    backgroundColor: COLORS.bgInput, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: COLORS.textPrimary,
  },

  statusBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 10 },
  statusOk:  { backgroundColor: COLORS.validBg, borderWidth: 1, borderColor: COLORS.validBorder },
  statusErr: { backgroundColor: COLORS.alertBg, borderWidth: 1, borderColor: COLORS.alertBorder },
  statusOkText:  { color: COLORS.validText, fontSize: 12, fontWeight: '600', flex: 1 },
  statusErrText: { color: COLORS.alertText, fontSize: 12, fontWeight: '600', flex: 1 },

  btnRow:   { flexDirection: 'row', gap: 10 },
  testBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5, borderColor: COLORS.primaryBorder, borderRadius: 12, paddingVertical: 11 },
  testBtnText: { color: COLORS.primary, fontSize: 13, fontWeight: '700' },
  saveBtn:  { flex: 1.3, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  resetBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  resetText: { color: COLORS.textMuted, fontSize: 11, textDecorationLine: 'underline' },

  currentVal: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },

  appInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  appInfoIcon:{ width: 44, height: 44, borderRadius: 13, backgroundColor: COLORS.primaryPale, justifyContent: 'center', alignItems: 'center' },
  appInfoName:{ color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  appInfoVer: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  appInfoDesc:{ color: COLORS.textMuted, fontSize: 12, lineHeight: 18 },
});