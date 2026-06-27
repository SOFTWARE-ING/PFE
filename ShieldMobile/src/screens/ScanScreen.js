// src/screens/ScanScreen.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, StatusBar,
  SafeAreaView, ActivityIndicator, Dimensions, Animated, Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { verifyDocument } from '../api/apiClient';
import { preprocessImage } from '../utils/imagePreprocessor';
import CropScreen from '../components/CropScreen';
import { COLORS } from '../theme/colors';
import { IconZap, IconZapOff, IconImage, IconFolderOpen, IconShield, IconScan } from '../components/Icon';

const { width: W, height: H } = Dimensions.get('window');

// Frame exactly centered — fixed size avoids off-center issues on any device
const FRAME_W = Math.min(W * 0.72, 280);
const FRAME_H = FRAME_W * 1.4;
const FRAME_X = (W - FRAME_W) / 2;
const FRAME_Y = (H - FRAME_H) / 2 - 40; // slight upward offset to leave room for bottom bar

const LOADING_STEPS = [
  'Prétraitement de l\'image…',
  'Extraction du QR code SHIELD…',
  'Décodage des métadonnées…',
  'Vérification RSA-PSS…',
  'Comparaison du contenu…',
];

function ScanFrame({ torchOn, onTorch }) {
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const lineY = scanAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [0, FRAME_H - 2],
  });

  const C = COLORS.primary;
  const cornerSize = 22;
  const cornerThick = 3;

  return (
    <View
      style={{
        position: 'absolute',
        left: FRAME_X,
        top: FRAME_Y,
        width: FRAME_W,
        height: FRAME_H,
      }}
    >
      {/* Corners */}
      {/* TL */}
      <View style={{ position: 'absolute', top: 0, left: 0 }}>
        <View style={{ width: cornerSize, height: cornerThick, backgroundColor: C, borderRadius: 2 }} />
        <View style={{ width: cornerThick, height: cornerSize, backgroundColor: C, borderRadius: 2 }} />
      </View>
      {/* TR */}
      <View style={{ position: 'absolute', top: 0, right: 0 }}>
        <View style={{ width: cornerSize, height: cornerThick, backgroundColor: C, borderRadius: 2 }} />
        <View style={{ position: 'absolute', right: 0, width: cornerThick, height: cornerSize, backgroundColor: C, borderRadius: 2 }} />
      </View>
      {/* BL */}
      <View style={{ position: 'absolute', bottom: 0, left: 0 }}>
        <View style={{ position: 'absolute', bottom: 0, width: cornerSize, height: cornerThick, backgroundColor: C, borderRadius: 2 }} />
        <View style={{ position: 'absolute', bottom: 0, width: cornerThick, height: cornerSize, backgroundColor: C, borderRadius: 2 }} />
      </View>
      {/* BR */}
      <View style={{ position: 'absolute', bottom: 0, right: 0 }}>
        <View style={{ position: 'absolute', bottom: 0, width: cornerSize, height: cornerThick, backgroundColor: C, borderRadius: 2 }} />
        <View style={{ position: 'absolute', bottom: 0, right: 0, width: cornerThick, height: cornerSize, backgroundColor: C, borderRadius: 2 }} />
      </View>

      {/* Animated scan line */}
      <Animated.View
        style={{
          position: 'absolute',
          left: 8, right: 8,
          height: 2,
          backgroundColor: COLORS.secondary,
          borderRadius: 1,
          opacity: 0.85,
          transform: [{ translateY: lineY }],
          shadowColor: COLORS.secondary,
          shadowOpacity: 0.8, shadowRadius: 6, elevation: 4,
        }}
      />

      {/* Torch button — top right of frame */}
      <TouchableOpacity
        style={{
          position: 'absolute',
          top: -48, right: 0,
          width: 40, height: 40, borderRadius: 12,
          backgroundColor: torchOn ? COLORS.primary : 'rgba(14,14,26,0.7)',
          justifyContent: 'center', alignItems: 'center',
          borderWidth: 1, borderColor: torchOn ? COLORS.primaryLight : COLORS.border,
        }}
        onPress={onTorch}
        activeOpacity={0.8}
      >
        {torchOn ? <IconZap size={18} color="#fff" /> : <IconZapOff size={18} color={COLORS.textMuted} />}
      </TouchableOpacity>
    </View>
  );
}

function LoadingOverlay({ step }) {
  return (
    <View style={ls.overlay}>
      <View style={ls.card}>
        <View style={ls.iconWrap}>
          <IconShield size={32} color={COLORS.primary} />
        </View>
        <Text style={ls.title}>Analyse SHIELD</Text>
        <Text style={ls.step}>{LOADING_STEPS[step]}</Text>
        <View style={ls.progressTrack}>
          <Animated.View style={[ls.progressBar, { width: `${((step + 1) / LOADING_STEPS.length) * 100}%` }]} />
        </View>
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 10 }} />
      </View>
    </View>
  );
}

const ls = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(14,14,26,0.92)', justifyContent: 'center', alignItems: 'center', zIndex: 100 },
  card:    { backgroundColor: COLORS.bgCard, borderRadius: 24, padding: 28, width: W * 0.78, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  iconWrap:{ width: 60, height: 60, borderRadius: 18, backgroundColor: COLORS.primaryPale, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  title:   { color: COLORS.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 6 },
  step:    { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 14 },
  progressTrack: { width: '100%', height: 4, borderRadius: 2, backgroundColor: COLORS.bgApp, overflow: 'hidden' },
  progressBar:   { height: '100%', borderRadius: 2, backgroundColor: COLORS.primary },
});

export default function ScanScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase]         = useState('camera');
  const [torchOn, setTorchOn]     = useState(false);
  const [loadStep, setLoadStep]   = useState(0);
  const [pendingFile, setPending] = useState(null);
  const cameraRef = useRef(null);
  const timerRef  = useRef(null);

  const startLoadingAnim = () => {
    let i = 0;
    setLoadStep(0);
    timerRef.current = setInterval(() => {
      i = Math.min(i + 1, LOADING_STEPS.length - 1);
      setLoadStep(i);
    }, 1000);
  };

  const stopLoadingAnim = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const runVerification = async (file) => {
    setPhase('loading');
    startLoadingAnim();
    try {
      const processed = await preprocessImage(file.uri);
      const result = await verifyDocument({
        uri: processed.uri,
        name: file.name || 'document.jpg',
        type: file.type || 'image/jpeg',
      });
      stopLoadingAnim();
      navigation.navigate('Verify', { result });
    } catch (error) {
      stopLoadingAnim();
      const detail = error.response?.data?.detail;
      Alert.alert('Vérification impossible',
        typeof detail === 'string' ? detail : 'Erreur réseau ou document non reconnu.');
      setPhase('camera');
    }
  };

  const handleCropConfirm = async (croppedUri) => {
    if (!pendingFile) return;
    await runVerification({ ...pendingFile, uri: croppedUri });
  };

  const handleCapture = async () => {
    if (!cameraRef.current || phase !== 'camera') return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      setPending({ uri: photo.uri, name: 'document.jpg', type: 'image/jpeg', width: photo.width, height: photo.height });
      setPhase('crop');
    } catch {
      Alert.alert('Erreur', 'Impossible de capturer la photo.');
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setPending({ uri: asset.uri, name: asset.fileName || 'document.jpg', type: asset.mimeType || 'image/jpeg', width: asset.width, height: asset.height });
    setPhase('crop');
  };

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    if (asset.mimeType === 'application/pdf') {
      await runVerification({ uri: asset.uri, name: asset.name || 'document.pdf', type: 'application/pdf' });
    } else {
      setPending({ uri: asset.uri, name: asset.name || 'document.jpg', type: asset.mimeType || 'image/jpeg', width: 0, height: 0 });
      setPhase('crop');
    }
  };

  if (phase === 'crop' && pendingFile) {
    return (
      <CropScreen
        imageUri={pendingFile.uri}
        imageWidth={pendingFile.width || W}
        imageHeight={pendingFile.height || H}
        onConfirm={handleCropConfirm}
        onCancel={() => { setPending(null); setPhase('camera'); }}
      />
    );
  }

  if (!permission?.granted) {
    return (
      <SafeAreaView style={s.permScreen}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bgApp} />
        <View style={s.permContent}>
          <View style={s.permIconBox}><IconShield size={44} color={COLORS.primary} /></View>
          <Text style={s.permTitle}>Accès caméra requis</Text>
          <Text style={s.permText}>Autorisez la caméra pour photographier et vérifier un document officiel SHIELD.</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
            <Text style={s.permBtnText}>Autoriser</Text>
          </TouchableOpacity>
        </View>
        <View style={s.altSection}>
          <Text style={s.altLabel}>IMPORTER UN FICHIER</Text>
          <View style={s.altRow}>
            <TouchableOpacity style={s.altBtn} onPress={handlePickImage}>
              <IconImage size={22} color={COLORS.primary} />
              <Text style={s.altBtnText}>Galerie</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.altBtn} onPress={handlePickDocument}>
              <IconFolderOpen size={22} color={COLORS.secondary} />
              <Text style={s.altBtnText}>Fichier</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={s.fullScreen}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Camera — full screen */}
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" enableTorch={torchOn} />

      {/* Dark overlay — 4 pieces around the frame */}
      <View style={[s.overlay, { top: 0, height: FRAME_Y }]} />
      <View style={[s.overlay, { top: FRAME_Y, left: 0, width: FRAME_X, height: FRAME_H }]} />
      <View style={[s.overlay, { top: FRAME_Y, right: 0, width: FRAME_X, height: FRAME_H }]} />
      <View style={[s.overlay, { top: FRAME_Y + FRAME_H, bottom: 0 }]} />

      {/* Scan frame + animated line + torch button */}
      <ScanFrame torchOn={torchOn} onTorch={() => setTorchOn(t => !t)} />

      {/* Hint below frame */}
      <View style={[s.hintBox, { top: FRAME_Y + FRAME_H + 16 }]}>
        <View style={s.hintPill}>
          <IconScan size={13} color={COLORS.secondary} />
          <Text style={s.hintText}>Alignez le document avec le QR code visible</Text>
        </View>
      </View>

      {/* Bottom sheet */}
      <View style={s.bottomSheet}>
        {/* Side buttons */}
        <View style={s.bottomRow}>
          <TouchableOpacity style={s.sideBtn} onPress={handlePickImage} activeOpacity={0.8}>
            <View style={s.sideBtnIcon}>
              <IconImage size={20} color={COLORS.textPrimary} />
            </View>
            <Text style={s.sideBtnText}>Galerie</Text>
          </TouchableOpacity>

          {/* Main capture button */}
          <TouchableOpacity style={s.captureBtn} onPress={handleCapture} activeOpacity={0.85}>
            <View style={s.captureRing}>
              <View style={s.captureCore} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={s.sideBtn} onPress={handlePickDocument} activeOpacity={0.8}>
            <View style={s.sideBtnIcon}>
              <IconFolderOpen size={20} color={COLORS.textPrimary} />
            </View>
            <Text style={s.sideBtnText}>Fichier</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading overlay */}
      {phase === 'loading' && <LoadingOverlay step={loadStep} />}
    </View>
  );
}

const OVERLAY_COLOR = 'rgba(14,14,26,0.72)';

const s = StyleSheet.create({
  fullScreen: { flex: 1, backgroundColor: '#000' },
  overlay:    { position: 'absolute', left: 0, right: 0, backgroundColor: OVERLAY_COLOR },

  hintBox:    { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  hintPill:   { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(14,14,26,0.8)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  hintText:   { color: 'rgba(255,255,255,0.75)', fontSize: 12 },

  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.bgSheet,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 20, paddingBottom: Platform.OS === 'android' ? 28 : 36,
    paddingHorizontal: 32,
    borderWidth: 1, borderColor: COLORS.border,
  },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sideBtn:   { alignItems: 'center', gap: 6 },
  sideBtnIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: COLORS.bgCardElevated, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  sideBtnText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '500' },

  captureBtn: { alignItems: 'center', justifyContent: 'center' },
  captureRing: {
    width: 76, height: 76, borderRadius: 38,
    borderWidth: 3, borderColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: COLORS.primary, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  captureCore: {
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: COLORS.primary,
  },

  // Permission screen
  permScreen:  { flex: 1, backgroundColor: COLORS.bgApp },
  permContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permIconBox: {
    width: 90, height: 90, borderRadius: 26, backgroundColor: COLORS.primaryPale,
    justifyContent: 'center', alignItems: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: COLORS.primaryBorder,
  },
  permTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: '700', marginBottom: 10 },
  permText:  { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20, marginBottom: 28, maxWidth: 260 },
  permBtn: {
    backgroundColor: COLORS.primary, borderRadius: 16,
    paddingHorizontal: 36, paddingVertical: 14,
  },
  permBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  altSection: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  altLabel:   { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 14, textAlign: 'center' },
  altRow:     { flexDirection: 'row', gap: 12 },
  altBtn: {
    flex: 1, backgroundColor: COLORS.bgCardElevated, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  altBtnText: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
});