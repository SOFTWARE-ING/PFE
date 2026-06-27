// src/components/CropScreen.js
// Écran de recadrage manuel du document avant vérification.
// L'utilisateur déplace 4 coins pour aligner le document
// puis confirme. L'image est recadrée avant envoi au backend.

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  PanResponder, Dimensions, Image, StatusBar,
  SafeAreaView, ActivityIndicator,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { COLORS } from '../theme/colors';
import { IconCheckCircle, IconXCircle, IconRefresh } from './Icon';

const { width: SW, height: SH } = Dimensions.get('window');
const CORNER_SIZE = 28;
const HANDLE_HIT  = 44; // zone tactile élargie pour le doigt

/**
 * Écran de recadrage manuel.
 *
 * Props:
 *   imageUri    — URI de l'image à recadrer
 *   onConfirm   — callback(croppedUri) appelé quand l'utilisateur confirme
 *   onCancel    — callback() appelé si l'utilisateur annule
 */
export default function CropScreen({ imageUri, imageWidth, imageHeight, onConfirm, onCancel }) {
  // Zone d'affichage de l'image (tient compte des marges)
  const PREVIEW_W = SW - 32;
  const PREVIEW_H = Math.min(SH * 0.55, (PREVIEW_W * imageHeight) / Math.max(imageWidth, 1));

  // Rapport image réelle / zone d'affichage
  const scaleX = imageWidth  / PREVIEW_W;
  const scaleY = imageHeight / PREVIEW_H;

  // Coins initiaux : cadre légèrement rentré (5% de marge)
  const PAD = 0.08;
  const initCorners = {
    tl: { x: PREVIEW_W * PAD,       y: PREVIEW_H * PAD },
    tr: { x: PREVIEW_W * (1 - PAD), y: PREVIEW_H * PAD },
    bl: { x: PREVIEW_W * PAD,       y: PREVIEW_H * (1 - PAD) },
    br: { x: PREVIEW_W * (1 - PAD), y: PREVIEW_H * (1 - PAD) },
  };

  const [corners, setCorners] = useState(initCorners);
  const [processing, setProcessing] = useState(false);
  const cornersRef = useRef(corners);
  cornersRef.current = corners;

  // Crée un PanResponder pour un coin donné
  const makePanResponder = useCallback((key) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderMove: (_, gs) => {
        const prev = cornersRef.current[key];
        const nx = Math.max(0, Math.min(PREVIEW_W, prev.x + gs.dx));
        const ny = Math.max(0, Math.min(PREVIEW_H, prev.y + gs.dy));
        setCorners(c => ({ ...c, [key]: { x: nx, y: ny } }));
      },
    });
  }, [PREVIEW_W, PREVIEW_H]);

  const panTL = useRef(makePanResponder('tl')).current;
  const panTR = useRef(makePanResponder('tr')).current;
  const panBL = useRef(makePanResponder('bl')).current;
  const panBR = useRef(makePanResponder('br')).current;
  const pans  = { tl: panTL, tr: panTR, bl: panBL, br: panBR };

  const handleConfirm = async () => {
    setProcessing(true);
    try {
      // Calcule le rectangle englobant les 4 coins
      const xs = [corners.tl.x, corners.tr.x, corners.bl.x, corners.br.x];
      const ys = [corners.tl.y, corners.tr.y, corners.bl.y, corners.br.y];
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const maxX = Math.max(...xs);
      const maxY = Math.max(...ys);

      // Convertit les coordonnées de la préview en coordonnées de l'image réelle
      const cropX = Math.round(minX * scaleX);
      const cropY = Math.round(minY * scaleY);
      const cropW = Math.round((maxX - minX) * scaleX);
      const cropH = Math.round((maxY - minY) * scaleY);

      // Sécurité : ne pas rogner à 0
      if (cropW < 100 || cropH < 100) {
        // Zone trop petite — retourner l'image originale
        onConfirm(imageUri);
        return;
      }

      const cropped = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: { originX: cropX, originY: cropY, width: cropW, height: cropH } }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
      );
      onConfirm(cropped.uri);
    } catch (error) {
      console.warn('[CropScreen] Crop failed:', error.message);
      onConfirm(imageUri); // fallback : image non recadrée
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => setCorners(initCorners);

  // Dessine les lignes du quadrilatère entre les 4 coins
  const { tl, tr, bl, br } = corners;

  // Lignes SVG-like en absolute positionnement
  function Edge({ x1, y1, x2, y2 }) {
    const len   = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
    return (
      <View
        style={{
          position: 'absolute',
          left: x1, top: y1,
          width: len, height: 2,
          backgroundColor: COLORS.tabActive,
          opacity: 0.85,
          transformOrigin: '0 50%',
          transform: [{ rotate: `${angle}deg` }],
        }}
      />
    );
  }

  function CornerHandle({ pos, panHandlers }) {
    return (
      <View
        {...panHandlers}
        style={[
          styles.cornerHandle,
          {
            left: pos.x - CORNER_SIZE / 2,
            top:  pos.y - CORNER_SIZE / 2,
          },
        ]}
      >
        <View style={styles.cornerDot} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bgDeep} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cadrer le document</Text>
        <Text style={styles.headerSub}>Déplacez les coins pour aligner le document</Text>
      </View>

      {/* Zone de prévisualisation + coins */}
      <View style={styles.previewContainer}>
        <View style={[styles.previewBox, { width: PREVIEW_W, height: PREVIEW_H }]}>
          <Image
            source={{ uri: imageUri }}
            style={{ width: PREVIEW_W, height: PREVIEW_H }}
            resizeMode="stretch"
          />

          {/* Lignes du cadre */}
          <Edge x1={tl.x} y1={tl.y} x2={tr.x} y2={tr.y} />
          <Edge x1={tr.x} y1={tr.y} x2={br.x} y2={br.y} />
          <Edge x1={br.x} y1={br.y} x2={bl.x} y2={bl.y} />
          <Edge x1={bl.x} y1={bl.y} x2={tl.x} y2={tl.y} />

          {/* Coins déplaçables */}
          {Object.entries(pans).map(([key, pan]) => (
            <CornerHandle key={key} pos={corners[key]} panHandlers={pan.panHandlers} />
          ))}
        </View>
      </View>

      <Text style={styles.hint}>
        Faites glisser chaque coin pour que le cadre vert épouse exactement les bords du document
      </Text>

      {/* Boutons */}
      <View style={styles.btnRow}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={processing}>
          <IconXCircle size={18} color={COLORS.alertText} />
          <Text style={styles.cancelBtnText}>Annuler</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.resetBtn} onPress={handleReset} disabled={processing}>
          <IconRefresh size={16} color={COLORS.textMuted} />
          <Text style={styles.resetBtnText}>Réinitialiser</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm} disabled={processing}>
          {processing
            ? <ActivityIndicator color="#fff" size="small" />
            : <IconCheckCircle size={18} color="#fff" />
          }
          <Text style={styles.confirmBtnText}>
            {processing ? 'Traitement...' : 'Confirmer'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:  { flex: 1, backgroundColor: COLORS.bgDeep },

  header: { paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center' },
  headerTitle: { color: COLORS.textWhite, fontSize: 16, fontWeight: '700' },
  headerSub:   { color: COLORS.tabInactive, fontSize: 12, marginTop: 3, textAlign: 'center' },

  previewContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 16,
  },
  previewBox: {
    position: 'relative', overflow: 'hidden',
    borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.primaryBorder,
  },

  hint: {
    color: COLORS.tabInactive, fontSize: 12, textAlign: 'center',
    paddingHorizontal: 24, paddingVertical: 10, lineHeight: 18,
  },

  cornerHandle: {
    position: 'absolute',
    width: HANDLE_HIT, height: HANDLE_HIT,
    justifyContent: 'center', alignItems: 'center',
    zIndex: 10,
  },
  cornerDot: {
    width: CORNER_SIZE, height: CORNER_SIZE, borderRadius: CORNER_SIZE / 2,
    backgroundColor: COLORS.tabActive,
    borderWidth: 3, borderColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 4, elevation: 6,
  },

  btnRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8,
  },
  cancelBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.alertBorder, borderRadius: 14,
    paddingVertical: 12, backgroundColor: COLORS.alertBg,
  },
  cancelBtnText: { color: COLORS.alertText, fontSize: 13, fontWeight: '700' },

  resetBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 14,
  },
  resetBtnText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },

  confirmBtn: {
    flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 12,
    shadowColor: COLORS.primary, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6,
  },
  confirmBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});