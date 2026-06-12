// src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, ScrollView,
  StatusBar, SafeAreaView,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { useAuth } from '../context/AuthContext';
import { loginWithGoogle } from '../api/apiClient';
import { COLORS } from '../theme/colors';

WebBrowser.maybeCompleteAuthSession();

// ─── FLAG DEV : passer à false quand le backend est prêt ─────────────
const DEV_BYPASS = true;

const DEV_USER = {
  name:  'Dev User',
  email: 'dev@communi-signe.test',
  role:  'admin',
};
const DEV_TOKEN = 'dev-bypass-token-000';

// ─── Icônes ───────────────────────────────────────────────────────────
const ShieldIcon = () => (
  <View style={styles.logoBox}>
    <Text style={styles.logoIcon}>🛡</Text>
  </View>
);

const GoogleIcon = () => (
  <View style={styles.googleIconBox}>
    <Text style={styles.googleIconText}>G</Text>
  </View>
);

export default function LoginScreen() {
  const { login }             = useAuth();
  const [loading, setLoading] = useState(false);
  const [email, setEmail]     = useState('');

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: 'VOTRE_ANDROID_CLIENT_ID.apps.googleusercontent.com',
    iosClientId:     'VOTRE_IOS_CLIENT_ID.apps.googleusercontent.com',
    webClientId:     'VOTRE_WEB_CLIENT_ID.apps.googleusercontent.com',
    redirectUri: makeRedirectUri({ useProxy: true }),
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleSuccess(response.authentication.accessToken);
    } else if (response?.type === 'error') {
      Alert.alert('Erreur', 'Connexion Google annulée ou échouée.');
    }
  }, [response]);

  const handleGoogleSuccess = async (googleToken) => {
    setLoading(true);
    try {
      const data = await loginWithGoogle(googleToken);
      await login(data.user, data.token);
    } catch (error) {
      Alert.alert(
        'Erreur de connexion',
        error.response?.data?.message || 'Impossible de se connecter au serveur.',
      );
    } finally {
      setLoading(false);
    }
  };

  // ─── Bypass dev ───────────────────────────────────────────────────
  const handleDevBypass = async () => {
    setLoading(true);
    // Petite pause pour simuler un appel réseau
    await new Promise(r => setTimeout(r, 600));
    await login(DEV_USER, DEV_TOKEN);
    setLoading(false);
  };

  const handleEmailContinue = () => {
    if (!email.trim()) {
      Alert.alert('Champ requis', 'Veuillez saisir votre adresse e-mail.');
      return;
    }
    Alert.alert('Info', 'Authentification par e-mail à venir.');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Zone logo / titre ── */}
        <View style={styles.topSection}>
          <ShieldIcon />
          <Text style={styles.appName}>CommuniSigne</Text>
          <Text style={styles.appSub}>Plateforme officielle de vérification</Text>
        </View>

        {/* ── Carte de connexion ── */}
        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.accent} style={{ margin: 24 }} />
          ) : (
            <>
              {/* Bouton Google */}
              <TouchableOpacity
                style={[styles.googleBtn, !request && styles.disabled]}
                onPress={() => promptAsync()}
                disabled={!request}
                activeOpacity={0.8}
              >
                <GoogleIcon />
                <Text style={styles.googleBtnText}>Continuer avec Google</Text>
              </TouchableOpacity>

              {/* Séparateur OU */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OU</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Champ e-mail */}
              <TextInput
                style={styles.input}
                placeholder="Adresse e-mail"
                placeholderTextColor="#9AABB8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              {/* Bouton e-mail */}
              <TouchableOpacity
                style={styles.emailBtn}
                onPress={handleEmailContinue}
                activeOpacity={0.85}
              >
                <Text style={styles.emailBtnText}>Continuer par e-mail</Text>
              </TouchableOpacity>

              <Text style={styles.privacy}>
                En continuant, vous acceptez la politique de confidentialité de CommuniSigne
              </Text>

              {/* ── Bouton DEV BYPASS (visible uniquement si DEV_BYPASS = true) ── */}
              {DEV_BYPASS && (
                <TouchableOpacity
                  style={styles.devBtn}
                  onPress={handleDevBypass}
                  activeOpacity={0.75}
                >
                  <Text style={styles.devBtnText}>⚙️  Accès développeur (bypass)</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bgDeep },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

  // ── Top ──────────────────────────────────────────────
  topSection: { alignItems: 'center', marginBottom: 32 },
  logoBox: {
    width: 64, height: 64, borderRadius: 18,
    backgroundColor: COLORS.accent,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  logoIcon:   { fontSize: 34, color: '#fff' },
  appName: {
    fontSize: 22, fontWeight: '700', color: COLORS.textWhite,
    letterSpacing: 0.5, marginBottom: 4,
  },
  appSub: { fontSize: 13, color: COLORS.accentMuted, textAlign: 'center' },

  // ── Card ─────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.bgWhite,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  // ── Google btn ───────────────────────────────────────
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E2E4E8',
    borderRadius: 12, padding: 12, gap: 10, marginBottom: 16,
    backgroundColor: '#fff',
  },
  googleIconBox: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#4285F4',
    justifyContent: 'center', alignItems: 'center',
  },
  googleIconText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  googleBtnText:  { fontSize: 14, fontWeight: '600', color: '#222' },
  disabled:       { opacity: 0.45 },

  // ── Divider ──────────────────────────────────────────
  divider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E2E4E8' },
  dividerText: { fontSize: 11, color: '#999' },

  // ── Input ────────────────────────────────────────────
  input: {
    borderWidth: 1, borderColor: '#E2E4E8', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#222',
    marginBottom: 12, backgroundColor: '#FAFBFC',
  },

  // ── Email btn ────────────────────────────────────────
  emailBtn: {
    backgroundColor: COLORS.bgDeep, borderRadius: 10,
    padding: 13, alignItems: 'center', marginBottom: 14,
  },
  emailBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  privacy: { fontSize: 11, color: '#AAA', textAlign: 'center', lineHeight: 16 },

  // ── Dev bypass btn ───────────────────────────────────
  devBtn: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#F0A500',
    borderRadius: 10,
    borderStyle: 'dashed',
    padding: 11,
    alignItems: 'center',
    backgroundColor: '#FFFBF0',
  },
  devBtnText: { fontSize: 13, color: '#B87800', fontWeight: '600' },
});