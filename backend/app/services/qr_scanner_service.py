"""
qr_scanner_service.py — Détection et décodage automatique du QR code
=====================================================================
Utilise pyzbar pour détecter le QR code dans l'image/PDF et retourner :
  - Le contenu JSON du QR
  - Les coordonnées (x, y, w, h) pour masquer la zone lors de l'OCR

Inclut :
  - Détection multi-tentatives avec prétraitement
  - Amélioration d'image pour QR codes basse résolution
  - Logging détaillé pour diagnostiquer les échecs
"""

import json
import logging
from io import BytesIO
from typing import Optional, Tuple, Dict, Any

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

logger = logging.getLogger(__name__)


# ─── Enhancement & Preprocessing ─────────────────────────────────────────────

def _enhance_image_for_qr(img: Image.Image) -> Image.Image:
    """
    Prétraite l'image pour améliorer la détection du QR code.
    - Augmente le contraste
    - Améliore la netteté
    - Corrige la luminosité
    """
    try:
        # Augmenter le contraste
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(2.0)
        
        # Améliorer la netteté
        enhancer = ImageEnhance.Sharpness(img)
        img = enhancer.enhance(2.0)
        
        # Ajuster la luminosité si nécessaire
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(1.1)
        
        logger.debug("Image enhancement applied: contrast +100%, sharpness +100%")
        return img
    except Exception as e:
        logger.warning(f"Image enhancement failed: {e}")
        return img


def _upscale_image(img: Image.Image, scale_factor: int = 2) -> Image.Image:
    """
    Agrandit l'image par un facteur pour améliorer la détection 
    sur les QR codes basse résolution.
    """
    try:
        new_size = (
            img.width * scale_factor,
            img.height * scale_factor
        )
        upscaled = img.resize(new_size, Image.Resampling.LANCZOS)
        logger.debug(f"Image upscaled from {img.size} to {upscaled.size}")
        return upscaled
    except Exception as e:
        logger.warning(f"Image upscaling failed: {e}")
        return img


def _pdf_to_images(file_bytes: bytes) -> list:
    """Convertit un PDF en liste d'images PIL (une par page)."""
    try:
        from pdf2image import convert_from_bytes
        pages = convert_from_bytes(file_bytes, dpi=200)
        logger.info(f"PDF converted: {len(pages)} page(s) detected at 200 DPI")
        return pages
    except Exception as e:
        logger.error(f"PDF conversion failed: {e}")
        return []


def _load_image(file_bytes: bytes, filename: str) -> Optional[Image.Image]:
    """Charge un fichier (image ou PDF première page) en PIL Image."""
    fname = filename.lower()
    try:
        if fname.endswith(".pdf"):
            logger.info(f"Loading PDF: {filename}")
            pages = _pdf_to_images(file_bytes)
            if pages:
                logger.info(f"First page extracted: {pages[0].size}")
                return pages[0]
            else:
                logger.warning("PDF conversion returned no pages")
                return None
        else:
            logger.info(f"Loading image: {filename}")
            img = Image.open(BytesIO(file_bytes)).convert("RGB")
            logger.info(f"Image loaded: {img.size} pixels")
            return img
    except Exception as e:
        logger.error(f"Failed to load image {filename}: {e}")
        return None


def detect_and_decode_qr(
    file_bytes: bytes,
    filename: str,
) -> Tuple[Optional[Dict[str, Any]], Optional[Tuple[int, int, int, int]]]:
    """
    Détecte et décode le QR code dans le document avec multi-tentatives.
    
    Stratégie de détection :
      1. Tentative directe sur l'image originale
      2. Tentative sur image avec amélioration (contraste/netteté)
      3. Tentative sur image agrandie (pour QR codes basse résolution)
    
    Retourne :
      (qr_data_dict, (x, y, width, height))  si QR trouvé
      (None, None)                             si pas de QR détecté
    """
    try:
        from pyzbar.pyzbar import decode as pyzbar_decode
    except ImportError:
        logger.critical("pyzbar not installed")
        raise RuntimeError(
            "pyzbar n'est pas installé. "
            "Exécutez : pip install pyzbar --break-system-packages "
            "et sur Ubuntu : sudo apt install libzbar0"
        )

    logger.info(f"QR detection starting for: {filename}")
    
    img = _load_image(file_bytes, filename)
    if img is None:
        logger.error("Failed to load image")
        return None, None

    # ─── Attempt 1: Original image ──────────────────────────────────────────
    logger.debug("Attempt 1: Scanning original image")
    result = _try_decode_qr(img, pyzbar_decode)
    if result[0] is not None:
        logger.info("✅ QR code detected on original image")
        return result

    # ─── Attempt 2: Enhanced image (contrast/sharpness) ─────────────────────
    logger.debug("Attempt 2: Scanning enhanced image (contrast/sharpness boost)")
    enhanced_img = _enhance_image_for_qr(img)
    result = _try_decode_qr(enhanced_img, pyzbar_decode)
    if result[0] is not None:
        logger.info("✅ QR code detected on enhanced image")
        return result

    # ─── Attempt 3: Upscaled image (for low-resolution QR codes) ────────────
    logger.debug("Attempt 3: Scanning upscaled image (2x resolution)")
    upscaled_img = _upscale_image(img, scale_factor=2)
    result = _try_decode_qr(upscaled_img, pyzbar_decode)
    if result[0] is not None:
        # Coordinates come from the upscaled image; scale back to original
        qr_dict, coords = result
        if coords:
            left, top, w, h = coords
            coords = (int(round(left / 2)), int(round(top / 2)), int(round(w / 2)), int(round(h / 2)))
        logger.info("✅ QR code detected on upscaled image (coords scaled to original)")
        return qr_dict, coords

    # ─── Attempt 4: Upscaled + Enhanced ─────────────────────────────────────
    logger.debug("Attempt 4: Scanning upscaled + enhanced image")
    enhanced_upscaled = _enhance_image_for_qr(upscaled_img)
    result = _try_decode_qr(enhanced_upscaled, pyzbar_decode)
    if result[0] is not None:
        qr_dict, coords = result
        if coords:
            left, top, w, h = coords
            coords = (int(round(left / 2)), int(round(top / 2)), int(round(w / 2)), int(round(h / 2)))
        logger.info("✅ QR code detected on upscaled+enhanced image (coords scaled to original)")
        return qr_dict, coords

    logger.warning("❌ QR code not detected after 4 attempts")
    logger.debug(f"Image details: size={img.size}, format={img.format}, mode={img.mode}")
    return None, None


def _try_decode_qr(img: Image.Image, pyzbar_decode) -> Tuple[Optional[Dict[str, Any]], Optional[Tuple[int, int, int, int]]]:
    """
    Tentative unique de détection et décodage du QR code.
    Compatible v1 (JSON brut) et v3 (SHIELD3: + zlib + base85).
    """
    import base64, zlib

    def _expand_uuid(short: str) -> str:
        pad = (4 - len(short) % 4) % 4
        b   = base64.urlsafe_b64decode(short + "=" * pad)
        h   = b.hex()
        return f"{h[0:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"

    def _decode_shield_payload(raw: str) -> Optional[Dict[str, Any]]:
        """
        Décode le payload QR quel que soit le format :
          - v3 : "SHIELD3:<base85(zlib(json))>"
          - v1 : JSON brut
        Retourne toujours un dict avec les clés normalisées
        sig_id, com_id, agent_id, key_fp, encrypted_hash.
        """
        # ── Format v3 — compressé ────────────────────────────────────────
        if raw.startswith("SHIELD3:"):
            try:
                compressed = base64.b85decode(raw[8:])
                data       = json.loads(zlib.decompress(compressed).decode("utf-8"))
                return {
                    "sig_id":         _expand_uuid(data["s"]),
                    "com_id":         _expand_uuid(data["c"]),
                    "agent_id":       _expand_uuid(data["a"]),
                    "key_fp":         data.get("k", ""),
                    "encrypted_hash": data.get("h", ""),
                    "algo":           "RSA-PSS-SHA256",
                    "ts":             data.get("t", ""),
                    "v":              "3",
                    "_raw":           raw,
                }
            except Exception as e:
                logger.warning(f"SHIELD3 decompression failed: {e}")
                return None

        # ── Format v1 — JSON brut ────────────────────────────────────────
        try:
            data = json.loads(raw)
            data["_raw"] = raw
            return data
        except json.JSONDecodeError:
            return None

    try:
        decoded_objects = pyzbar_decode(img)
        logger.debug(f"pyzbar scan returned {len(decoded_objects)} object(s)")

        for idx, obj in enumerate(decoded_objects):
            logger.debug(f"Object {idx}: type={obj.type}, size=({obj.rect.width}x{obj.rect.height})")

            if obj.type not in ("QRCODE", "QR"):
                logger.debug(f"Object {idx} is not a QR code (type: {obj.type}), skipping")
                continue

            try:
                raw = obj.data.decode("utf-8")
                logger.debug(f"Object {idx} decoded as UTF-8, length={len(raw)}")

                qr_dict = _decode_shield_payload(raw)
                if qr_dict is None:
                    logger.debug(f"Object {idx} is not a valid SHIELD QR payload")
                    continue

                logger.info(f"Object {idx} decoded, version={qr_dict.get('v','1')}, keys: {list(qr_dict.keys())}")

                # Vérifier les champs requis (communs v1 et v3)
                required_fields = {"sig_id", "com_id", "agent_id", "encrypted_hash"}
                missing = required_fields - set(qr_dict.keys())
                if missing:
                    logger.warning(f"QR code missing SHIELD fields: {missing}")
                    continue

                # Coordonnées dans l'image
                rect   = obj.rect
                coords = (rect.left, rect.top, rect.width, rect.height)

                logger.info(f"✅ Valid SHIELD QR code detected at {coords}, v={qr_dict.get('v','1')}")
                return qr_dict, coords

            except UnicodeDecodeError as e:
                logger.debug(f"Object {idx} cannot be decoded as UTF-8: {e}")
                continue
            except Exception as e:
                logger.warning(f"Object {idx} processing error: {e}")
                continue

        return None, None

    except Exception as e:
        logger.error(f"pyzbar scan error: {e}")
        return None, None

def mask_qr_zone(
    img: Image.Image,
    coords: Tuple[int, int, int, int],
    margin: int = 10,
) -> Image.Image:
    """
    Masque la zone du QR code avec un rectangle blanc.
    margin : pixels supplémentaires autour du QR pour éviter les artefacts.
    """
    x, y, w, h = coords
    logger.debug(f"Masking QR zone at ({x}, {y}) size ({w}x{h}) with margin={margin}px")
    masked = img.copy()
    draw = ImageDraw.Draw(masked)
    draw.rectangle(
        [x - margin, y - margin, x + w + margin, y + h + margin],
        fill="white"
    )
    logger.debug("QR zone masked successfully")
    return masked


def extract_text_without_qr(
    file_bytes: bytes,
    filename: str,
    qr_coords: Optional[Tuple[int, int, int, int]] = None,
) -> str:
    """
    Extrait le texte du document en masquant la zone du QR code si connue.
    Utilise Tesseract via pytesseract.
    """
    import pytesseract

    img = _load_image(file_bytes, filename)
    if img is None:
        logger.error("extract_text_without_qr: failed to load image")
        return ""

    # Masquer la zone QR si on la connaît
    if qr_coords:
        logger.debug(f"Masking QR zone before OCR at: {qr_coords}")
        img = mask_qr_zone(img, qr_coords)

    # Multi-attempt OCR strategy with logging and fallbacks
    attempts = []

    # Attempt 1: original masked image
    attempts.append((img, "original masked"))

    # Attempt 2: enhanced (contrast/sharpness)
    try:
        enhanced = _enhance_image_for_qr(img)
        attempts.append((enhanced, "enhanced"))
    except Exception as e:
        logger.debug(f"Failed to prepare enhanced image for OCR: {e}")

    # Attempt 3: upscaled
    try:
        upscaled = _upscale_image(img, scale_factor=2)
        attempts.append((upscaled, "upscaled 2x"))
    except Exception as e:
        logger.debug(f"Failed to prepare upscaled image for OCR: {e}")

    # Attempt 4: upscaled + enhanced
    try:
        if 'upscaled' in locals():
            enhanced_up = _enhance_image_for_qr(upscaled)
            attempts.append((enhanced_up, "upscaled+enhanced"))
    except Exception as e:
        logger.debug(f"Failed to prepare upscaled+enhanced image for OCR: {e}")

    for idx, (candidate, label) in enumerate(attempts, 1):
        try:
            logger.debug(f"OCR attempt {idx} ({label}): image size={candidate.size}")
            text = pytesseract.image_to_string(candidate, lang="fra+eng", config='--oem 3 --psm 3')
            if text and text.strip():
                logger.info(f"OCR success on attempt {idx} ({label}), {len(text.strip())} chars extracted")
                return text.strip()
            else:
                logger.debug(f"OCR attempt {idx} ({label}) returned empty text")
        except Exception as e:
            logger.warning(f"OCR attempt {idx} ({label}) failed: {e}")

    # Final fallback: try default pytesseract with no lang
    try:
        logger.debug("Final OCR fallback: default pytesseract with no lang")
        text = pytesseract.image_to_string(img)
        return text.strip()
    except Exception as e:
        logger.error(f"Final OCR fallback failed: {e}")
        return ""
