// src/screens/LoginScreen.js
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, ScrollView,
  StatusBar, SafeAreaView,
} from 'react-native';
import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { useAuth } from '../context/AuthContext';
import { loginWithGoogle } from '../api/apiClient';
import { COLORS } from '../theme/colors';

// ─── FLAG DEV : passer à false une fois Google Sign-In configuré ────
const DEV_BYPASS = true;

const DEV_USER = {
  id_utilisateur: 'dev-0000',
  name:   'Dev User',
  prenom: 'Dev',
  nom:    'User',
  email:  'dev@communi-signe.test',
  role:   'citoyen',
};
const DEV_TOKEN = 'dev-bypass-token-000';

// 🔧 Web Client ID créé dans Google Cloud Console (type "Application Web").
// C'est ce client ID qui permet d'obtenir un idToken vérifiable par le backend.
const GOOGLE_WEB_CLIENT_ID = 'VOTRE_WEB_CLIENT_ID.apps.googleusercontent.com';

GoogleSignin.configure({
  webClientId: GOOGLE_WEB_CLIENT_ID,
  offlineAccess: false,
});

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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        return; // utilisateur a annulé
      }

      const idToken = response.data?.idToken;
      if (!idToken) {
        Alert.alert('Erreur', 'Aucun token reçu de Google.');
        return;
      }

      const data = await loginWithGoogle(idToken);
      await login(data.user, data.access_token);
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
          case statusCodes.IN_PROGRESS:
            return;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            Alert.alert('Erreur', 'Google Play Services indisponible sur cet appareil.');
            return;
          default:
            break;
        }
      }
      Alert.alert(
        'Erreur de connexion',
        error.response?.data?.detail || 'Impossible de se connecter avec Google.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    await login(DEV_USER, DEV_TOKEN);
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topSection}>
          <ShieldIcon />
          <Text style={styles.appName}>CommuniSigne</Text>
          <Text style={styles.appSub}>Plateforme officielle de vérification</Text>
        </View>

        <View style={styles.card}>
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.accent} style={{ margin: 24 }} />
          ) : (
            <>
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogleSignIn}
                activeOpacity={0.8}
              >
                <GoogleIcon />
                <Text style={styles.googleBtnText}>Continuer avec Google</Text>
              </TouchableOpacity>

              <Text style={styles.privacy}>
                En continuant, vous acceptez la politique de confidentialité de CommuniSigne
              </Text>

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
  logoIcon: { fontSize: 34, color: '#fff' },
  appName: {
    fontSize: 22, fontWeight: '700', color: COLORS.textWhite,
    letterSpacing: 0.5, marginBottom: 4,
  },
  appSub: { fontSize: 13, color: COLORS.accentMuted, textAlign: 'center' },

  card: {
    backgroundColor: COLORS.bgWhite,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E2E4E8',
    borderRadius: 12, padding: 14, gap: 10, marginBottom: 16,
    backgroundColor: '#fff',
  },
  googleIconBox: {
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: '#4285F4',
    justifyContent: 'center', alignItems: 'center',
  },
  googleIconText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  googleBtnText:  { fontSize: 14, fontWeight: '600', color: '#222' },

  privacy: { fontSize: 11, color: '#AAA', textAlign: 'center', lineHeight: 16 },

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