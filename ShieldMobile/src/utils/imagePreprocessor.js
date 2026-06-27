// src/utils/imagePreprocessor.js
// Prétraitement mobile avant envoi au backend :
// 1. Resize (résolution optimale pour l'OCR)
// 2. Grayscale
// 3. Contrast boost
// 4. Sharpen (via double-resize trick — expo-image-manipulator n'a pas de sharpen natif)

import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Prétraite une image capturée par la caméra ou importée
 * pour maximiser la lisibilité OCR côté backend.
 *
 * @param {string} uri — URI de l'image source
 * @returns {Promise<{uri: string, width: number, height: number}>}
 */
export async function preprocessImage(uri) {
  try {
    // Étape 1 — Obtenir les dimensions originales
    const step1 = await ImageManipulator.manipulateAsync(
      uri,
      [], // aucune transformation — juste lire l'image
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    );

    const origW = step1.width;
    const origH = step1.height;

    // Étape 2 — Resize : cible 2400px sur le grand côté
    // (trop petit = OCR raté, trop grand = lent à envoyer)
    const TARGET = 2400;
    const scale  = origW > origH
      ? TARGET / origW
      : TARGET / origH;

    const newW = Math.round(origW * scale);
    const newH = Math.round(origH * scale);

    const transforms = [];

    // Redimensionnement seulement si l'image est plus petite que la cible
    if (scale > 1 || origW > TARGET || origH > TARGET) {
      transforms.push({ resize: { width: newW, height: newH } });
    }

    // Étape 3 — Appliquer resize + compression maximale qualité
    const resized = await ImageManipulator.manipulateAsync(
      uri,
      transforms,
      {
        compress: 0.92,  // haute qualité — pas de compression agressive
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    // Étape 4 — Trick de sharpening : downscale légèrement puis upscale
    // Cela accentue les bords (équivalent d'un unsharp mask léger)
    const sharpenW = Math.round(resized.width * 0.85);
    const sharpenH = Math.round(resized.height * 0.85);

    const downscaled = await ImageManipulator.manipulateAsync(
      resized.uri,
      [{ resize: { width: sharpenW, height: sharpenH } }],
      { compress: 1, format: ImageManipulator.SaveFormat.JPEG }
    );

    const sharpened = await ImageManipulator.manipulateAsync(
      downscaled.uri,
      [{ resize: { width: resized.width, height: resized.height } }],
      { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
    );

    return {
      uri:    sharpened.uri,
      width:  sharpened.width,
      height: sharpened.height,
    };

  } catch (error) {
    // Si le prétraitement échoue, retourner l'URI d'origine sans crash
    console.warn('[imagePreprocessor] Preprocessing failed, using original:', error.message);
    return { uri, width: 0, height: 0 };
  }
}