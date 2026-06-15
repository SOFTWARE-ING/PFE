// src/screens/ScanScreen.js
import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, StatusBar, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { verifyDocument } from '../api/apiClient';
import { COLORS } from '../theme/colors';

const FRAME_SIZE = 240;

export default function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
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
        typeof detail === 'string'
          ? detail
          : "Une erreur est survenue pendant la vérification. Vérifiez votre connexion au serveur.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current || loading) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      await runVerification({
        uri: photo.uri,
        name: 'document.jpg',
        type: 'image/jpeg',
      });
    } catch {
      Alert.alert('Erreur', "Impossible de capturer la photo.");
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    await runVerification({
      uri: asset.uri,
      name: asset.fileName || 'document.jpg',
      type: asset.mimeType || 'image/jpeg',
    });
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    await runVerification({
      uri: asset.uri,
      name: asset.name || 'document.pdf',
      type: asset.mimeType || 'application/pdf',
    });
  };

  // ── Vérification en cours ──────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accentLight} />
          <Text style={styles.loadingText}>Vérification en cours…</Text>
          <Text style={styles.loadingSub}>Analyse cryptographique et OCR du document</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.permText}>Vérification des permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Permission caméra refusée → on garde quand même les boutons fichier ──
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Vérifier un document</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.permIcon}>📷</Text>
          <Text style={styles.permTitle}>Accès à la caméra requis</Text>
          <Text style={styles.permText}>
            Autorisez la caméra pour photographier un document à vérifier,
            ou choisissez un fichier ci-dessous.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Autoriser la caméra</Text>
          </TouchableOpacity>
        </View>
        <PickButtons onPickImage={handlePickImage} onPickDocument={handlePickDocument} />
      </SafeAreaView>
    );
  }

  // ── Écran principal : caméra + boutons ───────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vérifier un document</Text>
      </View>

      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.hint}>
            Cadrez l'intégralité du document, y compris le QR code SHIELD
          </Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} activeOpacity={0.85}>
          <Text style={styles.captureBtnText}>📸  Capturer et vérifier</Text>
        </TouchableOpacity>
      </View>

      <PickButtons onPickImage={handlePickImage} onPickDocument={handlePickDocument} />
    </SafeAreaView>
  );
}

// ─── Boutons "choisir un fichier existant" ────────────────────────────
function PickButtons({ onPickImage, onPickDocument }) {
  return (
    <View style={styles.pickSection}>
      <Text style={styles.pickLabel}>Ou choisissez un fichier existant</Text>
      <View style={styles.pickRow}>
        <TouchableOpacity style={styles.pickBtn} onPress={onPickImage} activeOpacity={0.85}>
          <Text style={styles.pickBtnText}>🖼️  Galerie</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pickBtn} onPress={onPickDocument} activeOpacity={0.85}>
          <Text style={styles.pickBtnText}>📄  Fichier / PDF</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#111' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  loadingText: { color: COLORS.textWhite, fontSize: 15, fontWeight: '600', marginTop: 16 },
  loadingSub:  { color: COLORS.accentMuted, fontSize: 12, marginTop: 6, textAlign: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgDeep,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  headerTitle: { color: COLORS.textWhite, fontSize: 16, fontWeight: '600' },

  cameraContainer: { flex: 1, position: 'relative' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  scanFrame: {
    width: FRAME_SIZE, height: FRAME_SIZE * 1.3,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute', width: 24, height: 24,
    borderColor: COLORS.accentLight, borderStyle: 'solid',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },

  hint: {
    color: COLORS.accentMuted, fontSize: 12, textAlign: 'center',
    marginTop: 20, paddingHorizontal: 40, lineHeight: 18,
  },

  actionsRow: { backgroundColor: COLORS.bgMid, paddingHorizontal: 16, paddingTop: 12 },
  captureBtn: {
    backgroundColor: COLORS.accent, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  captureBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  permIcon:  { fontSize: 48, marginBottom: 14 },
  permTitle: { color: COLORS.textWhite, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  permText:  { color: COLORS.accentMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  permBtn: {
    marginTop: 20, backgroundColor: COLORS.accent,
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12,
  },
  permBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  pickSection: {
    backgroundColor: COLORS.bgMid,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  pickLabel: { color: COLORS.accentMuted, fontSize: 11, marginBottom: 8 },
  pickRow:   { flexDirection: 'row', gap: 10 },
  pickBtn: {
    flex: 1, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.borderInput,
    borderRadius: 10, paddingVertical: 12, alignItems: 'center',
  },
  pickBtnText: { color: COLORS.textWhite, fontSize: 13, fontWeight: '600' },
});