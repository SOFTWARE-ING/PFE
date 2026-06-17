// src/screens/ScanScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, StatusBar, SafeAreaView, ActivityIndicator, Dimensions,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { verifyDocument } from '../api/apiClient';
import { COLORS } from '../theme/colors';
import {
  IconZap, IconZapOff, IconImage, IconFolderOpen, IconShield,
} from '../components/Icon';

const { width: W, height: H } = Dimensions.get('window');
const FRAME_W = W * 0.78;
const FRAME_H = FRAME_W * 1.35;

function CornerFrame() {
  const c = COLORS.tabActive;
  const s = 28;
  const t = 3;
  return (
    <View style={{ width: FRAME_W, height: FRAME_H, position: 'relative' }}>
      {/* TL */}
      <View style={[frameStyles.corner, { top: 0, left: 0, borderTopWidth: t, borderLeftWidth: t, borderColor: c, width: s, height: s, borderTopLeftRadius: 6 }]} />
      {/* TR */}
      <View style={[frameStyles.corner, { top: 0, right: 0, borderTopWidth: t, borderRightWidth: t, borderColor: c, width: s, height: s, borderTopRightRadius: 6 }]} />
      {/* BL */}
      <View style={[frameStyles.corner, { bottom: 0, left: 0, borderBottomWidth: t, borderLeftWidth: t, borderColor: c, width: s, height: s, borderBottomLeftRadius: 6 }]} />
      {/* BR */}
      <View style={[frameStyles.corner, { bottom: 0, right: 0, borderBottomWidth: t, borderRightWidth: t, borderColor: c, width: s, height: s, borderBottomRightRadius: 6 }]} />
    </View>
  );
}

const frameStyles = StyleSheet.create({
  corner: { position: 'absolute' },
});

export default function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading]   = useState(false);
  const [torchOn, setTorchOn]   = useState(false);
  const cameraRef = useRef(null);

  const runVerification = async (file) => {
    setLoading(true);
    try {
      const result = await verifyDocument(file);
      navigation.navigate('Verify', { result });
    } catch (error) {
      const detail = error.response?.data?.detail;
      Alert.alert(
        'Vérification impossible',
        typeof detail === 'string' ? detail : 'Erreur réseau ou document non reconnu.',
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || loading) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.85 });
      await runVerification({ uri: photo.uri, name: 'document.jpg', type: 'image/jpeg' });
    } catch { Alert.alert('Erreur', 'Impossible de capturer la photo.'); }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    await runVerification({ uri: asset.uri, name: asset.fileName || 'document.jpg', type: asset.mimeType || 'image/jpeg' });
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    await runVerification({ uri: asset.uri, name: asset.name || 'document.pdf', type: asset.mimeType || 'application/pdf' });
  };

  // ── Loading overlay ──────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.loadingCard}>
          <View style={styles.loadingSpinnerWrap}>
            <View style={styles.loadingRing} />
            <View style={styles.loadingIconCenter}>
              <IconShield size={24} color={COLORS.primary} />
            </View>
          </View>
          <Text style={styles.loadingTitle}>Analyse en cours…</Text>
          <Text style={styles.loadingSub}>Vérification cryptographique RSA-PSS</Text>
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 8 }} />
        </View>
      </View>
    );
  }

  // ── Permission requise ───────────────────────────────────────────────
  if (!permission?.granted) {
    return (
      <SafeAreaView style={styles.permScreen}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />
        <View style={styles.permContent}>
          <View style={styles.permIconBox}>
            <IconShield size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.permTitle}>Accès caméra requis</Text>
          <Text style={styles.permText}>
            Autorisez la caméra pour photographier et vérifier un document officiel.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Autoriser la caméra</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.altButtons}>
          <Text style={styles.altLabel}>Ou chargez un fichier existant</Text>
          <View style={styles.altRow}>
            <TouchableOpacity style={styles.altBtn} onPress={handlePickImage}>
              <IconImage size={20} color={COLORS.primary} />
              <Text style={styles.altBtnText}>Galerie</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.altBtn} onPress={handlePickDocument}>
              <IconFolderOpen size={20} color={COLORS.primary} />
              <Text style={styles.altBtnText}>Fichier / PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Écran principal caméra ─────────────────────────────────────────
  return (
    <View style={styles.fullScreen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Camera plein écran */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
      />

      {/* Overlay semi-transparent autour du cadre */}
      <View style={styles.overlayTop} />
      <View style={styles.overlayMiddle}>
        <View style={styles.overlaySide} />
        <CornerFrame />
        <View style={styles.overlaySide} />
      </View>
      <View style={styles.overlayBottom} />

      {/* Hint texte */}
      <View style={styles.hintBox}>
        <Text style={styles.hintText}>
          Cadrez l'intégralité du document avec le QR code SHIELD
        </Text>
      </View>

      {/* Bouton flash — en haut à droite */}
      <SafeAreaView style={styles.topControls}>
        <TouchableOpacity
          style={[styles.torchBtn, torchOn && styles.torchBtnOn]}
          onPress={() => setTorchOn(t => !t)}
          activeOpacity={0.8}
        >
          {torchOn
            ? <IconZap size={20} color="#fff" />
            : <IconZapOff size={20} color="#fff" />
          }
        </TouchableOpacity>
      </SafeAreaView>

      {/* Contrôles bas : galerie | déclencheur | fichier */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.sideBtn} onPress={handlePickImage} activeOpacity={0.8}>
          <IconImage size={22} color="#fff" />
          <Text style={styles.sideBtnText}>Galerie</Text>
        </TouchableOpacity>

        {/* Déclencheur central */}
        <TouchableOpacity style={styles.captureOuter} onPress={handleCapture} activeOpacity={0.85}>
          <View style={styles.captureInner} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.sideBtn} onPress={handlePickDocument} activeOpacity={0.8}>
          <IconFolderOpen size={22} color="#fff" />
          <Text style={styles.sideBtnText}>Fichier</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const OVERLAY_COLOR = 'rgba(0,0,0,0.55)';
const TOP_H    = (H - FRAME_H) / 2 - 60;
const SIDE_W   = (W - FRAME_W) / 2;

const styles = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: '#000' },

  overlayTop:    { position: 'absolute', top: 0, left: 0, right: 0, height: TOP_H, backgroundColor: OVERLAY_COLOR },
  overlayMiddle: { position: 'absolute', top: TOP_H, left: 0, right: 0, height: FRAME_H, flexDirection: 'row' },
  overlaySide:   { width: SIDE_W, backgroundColor: OVERLAY_COLOR },
  overlayBottom: { position: 'absolute', top: TOP_H + FRAME_H, left: 0, right: 0, bottom: 0, backgroundColor: OVERLAY_COLOR },

  hintBox: {
    position: 'absolute',
    top: TOP_H + FRAME_H + 12,
    left: 0, right: 0,
    alignItems: 'center', paddingHorizontal: 30,
  },
  hintText: {
    color: 'rgba(255,255,255,0.8)', fontSize: 12,
    textAlign: 'center', lineHeight: 18,
  },

  topControls: {
    position: 'absolute', top: 0, right: 16, zIndex: 20,
    paddingTop: 48,
  },
  torchBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
  },
  torchBtnOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.tabActive,
  },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 130,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    paddingHorizontal: 30, paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sideBtn: { alignItems: 'center', gap: 5, width: 64 },
  sideBtnText: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '600' },

  captureOuter: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'transparent',
    borderWidth: 4, borderColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  captureInner: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: '#fff',
  },

  // Loading screen
  loadingScreen: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  loadingCard: {
    backgroundColor: COLORS.bgCard, borderRadius: 20, padding: 32,
    alignItems: 'center', width: W * 0.8,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, elevation: 12,
  },
  loadingSpinnerWrap: { width: 64, height: 64, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  loadingRing: {
    position: 'absolute', width: 64, height: 64, borderRadius: 32,
    borderWidth: 3, borderColor: COLORS.primaryBorder,
    borderTopColor: COLORS.primary,
  },
  loadingIconCenter: { position: 'absolute' },
  loadingTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  loadingSub:   { fontSize: 12, color: COLORS.textMuted, textAlign: 'center' },

  // Permission screen
  permScreen:  { flex: 1, backgroundColor: COLORS.bgDeep },
  permContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  permIconBox: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: COLORS.primaryPale,
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  permTitle: { color: COLORS.textWhite, fontSize: 18, fontWeight: '700', marginBottom: 10 },
  permText:  { color: COLORS.tabInactive, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  permBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingHorizontal: 30, paddingVertical: 13,
  },
  permBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  altButtons: {
    backgroundColor: COLORS.bgPage,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20,
  },
  altLabel: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  altRow:   { flexDirection: 'row', gap: 12 },
  altBtn: {
    flex: 1, backgroundColor: COLORS.bgCard,
    borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: COLORS.border,
  },
  altBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
});