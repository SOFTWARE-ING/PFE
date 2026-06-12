// src/screens/ScanScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, StatusBar, SafeAreaView, Animated, Easing,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { verifyByQRCode } from '../api/apiClient';
import { COLORS } from '../theme/colors';

export default function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned]           = useState(false);
  const [manualCode, setManualCode]     = useState('');
  const [loading, setLoading]           = useState(false);

  // Animation ligne de scan
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1, duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0, duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const scanLineTranslate = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 50],
  });

  const handleBarcodeScanned = async ({ data }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    try {
      const result = await verifyByQRCode(data);
      navigation.navigate('Verify', { result, qrData: data });
    } catch {
      Alert.alert(
        'Erreur de vérification',
        'Impossible de vérifier ce QR code. Vérifiez votre connexion.',
        [{ text: 'Réessayer', onPress: () => setScanned(false) }],
      );
    } finally {
      setLoading(false);
    }
  };

  const handleManualVerify = async () => {
    if (!manualCode.trim()) {
      Alert.alert('Code requis', 'Veuillez saisir un code de vérification.');
      return;
    }
    setLoading(true);
    try {
      const result = await verifyByQRCode(manualCode.trim());
      navigation.navigate('Verify', { result, qrData: manualCode.trim() });
    } catch {
      Alert.alert('Erreur', 'Code invalide ou serveur inaccessible.');
    } finally {
      setLoading(false);
    }
  };

  // ── Permission refusée ────────────────────────────────────────────
  if (!permission) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.permText}>Vérification des permissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scanner un QR code</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.permIcon}>📷</Text>
          <Text style={styles.permTitle}>Accès à la caméra requis</Text>
          <Text style={styles.permText}>
            Pour scanner des QR codes, autorisez l'accès à la caméra.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Autoriser la caméra</Text>
          </TouchableOpacity>
        </View>
        <ManualInput
          manualCode={manualCode}
          setManualCode={setManualCode}
          onVerify={handleManualVerify}
          loading={loading}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scanner un QR code</Text>
        <View style={{ width: 32 }} />
      </View>

      {/* ── Caméra ── */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />

        {/* Overlay sombre autour du cadre */}
        <View style={styles.overlay}>
          {/* Cadre de scan */}
          <View style={styles.scanFrame}>
            {/* Coins */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Ligne de scan animée */}
            <Animated.View
              style={[
                styles.scanLine,
                { transform: [{ translateY: scanLineTranslate }] },
              ]}
            />
          </View>
          <Text style={styles.hint}>
            Positionnez le QR code du communiqué dans le cadre
          </Text>
          {scanned && (
            <TouchableOpacity
              style={styles.rescanBtn}
              onPress={() => setScanned(false)}
            >
              <Text style={styles.rescanText}>Rescanner</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Saisie manuelle ── */}
      <ManualInput
        manualCode={manualCode}
        setManualCode={setManualCode}
        onVerify={handleManualVerify}
        loading={loading}
      />
    </SafeAreaView>
  );
}

// ─── Composant saisie manuelle ────────────────────────────────────────
function ManualInput({ manualCode, setManualCode, onVerify, loading }) {
  return (
    <View style={styles.manualSection}>
      <Text style={styles.manualLabel}>Ou entrez le code manuellement</Text>
      <View style={styles.manualRow}>
        <TextInput
          style={styles.manualInput}
          placeholder="Code de vérification"
          placeholderTextColor={COLORS.accentDim}
          value={manualCode}
          onChangeText={setManualCode}
          autoCapitalize="none"
          returnKeyType="done"
          onSubmitEditing={onVerify}
        />
        <TouchableOpacity
          style={[styles.verifyBtn, loading && styles.disabled]}
          onPress={onVerify}
          disabled={loading}
          activeOpacity={0.85}
        >
          <Text style={styles.verifyBtnText}>{loading ? '...' : 'Vérifier'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const FRAME_SIZE = 220;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#111' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  // ── Header ────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgDeep,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backBtn:     { width: 32, height: 32, justifyContent: 'center' },
  backIcon:    { color: COLORS.accentMuted, fontSize: 28, lineHeight: 30 },
  headerTitle: { color: COLORS.textWhite, fontSize: 16, fontWeight: '600' },

  // ── Camera ────────────────────────────────────────────────────
  cameraContainer: { flex: 1, position: 'relative' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center',
  },
  scanFrame: {
    width: FRAME_SIZE, height: FRAME_SIZE,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },

  // Coins du cadre
  corner: {
    position: 'absolute', width: 24, height: 24,
    borderColor: COLORS.accentLight, borderStyle: 'solid',
  },
  cornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  cornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },

  scanLine: {
    position: 'absolute', left: 6, right: 6, height: 2,
    backgroundColor: COLORS.accentLight,
    opacity: 0.9, borderRadius: 1,
  },
  hint: {
    color: COLORS.accentMuted, fontSize: 12, textAlign: 'center',
    marginTop: 20, paddingHorizontal: 40, lineHeight: 18,
  },
  rescanBtn: {
    marginTop: 16, backgroundColor: COLORS.accent,
    paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20,
  },
  rescanText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // ── Permission ────────────────────────────────────────────────
  permIcon:    { fontSize: 48, marginBottom: 14 },
  permTitle:   { color: COLORS.textWhite, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  permText:    { color: COLORS.accentMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  permBtn: {
    marginTop: 20, backgroundColor: COLORS.accent,
    paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12,
  },
  permBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // ── Manual input ──────────────────────────────────────────────
  manualSection: {
    backgroundColor: COLORS.bgMid,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  manualLabel: { color: COLORS.accentMuted, fontSize: 11, marginBottom: 8 },
  manualRow:   { flexDirection: 'row', gap: 8 },
  manualInput: {
    flex: 1, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.borderInput,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    color: COLORS.textWhite, fontSize: 13,
  },
  verifyBtn: {
    backgroundColor: COLORS.accent, borderRadius: 10,
    paddingHorizontal: 16, justifyContent: 'center',
  },
  verifyBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  disabled:      { opacity: 0.5 },
});
