"""
qr_scanner_service.py — Détection et décodage automatique du QR code
=====================================================================
Utilise pyzbar pour détecter le QR code dans l'image/PDF et retourner :
  - Le contenu JSON du QR
  - Les coordonnées (x, y, w, h) pour masquer la zone lors de l'OCR
"""

import json
from io import BytesIO
from typing import Optional, Tuple, Dict, Any

from PIL import Image, ImageDraw


def _pdf_to_images(file_bytes: bytes) -> list:
    """Convertit un PDF en liste d'images PIL (une par page)."""
    try:
        from pdf2image import convert_from_bytes
        return convert_from_bytes(file_bytes, dpi=200)
    except Exception:
        return []


def _load_image(file_bytes: bytes, filename: str) -> Optional[Image.Image]:
    """Charge un fichier (image ou PDF première page) en PIL Image."""
    fname = filename.lower()
    if fname.endswith(".pdf"):
        pages = _pdf_to_images(file_bytes)
        return pages[0] if pages else None
    else:
        try:
            return Image.open(BytesIO(file_bytes)).convert("RGB")
        except Exception:
            return None


def detect_and_decode_qr(
    file_bytes: bytes,
    filename: str,
) -> Tuple[Optional[Dict[str, Any]], Optional[Tuple[int, int, int, int]]]:
    """
    Détecte et décode le QR code dans le document.

    Retourne :
      (qr_data_dict, (x, y, width, height))  si QR trouvé
      (None, None)                             si pas de QR détecté
    """
    try:
        from pyzbar.pyzbar import decode as pyzbar_decode
    except ImportError:
        raise RuntimeError(
            "pyzbar n'est pas installé. "
            "Exécutez : pip install pyzbar --break-system-packages "
            "et sur Ubuntu : sudo apt install libzbar0"
        )

    img = _load_image(file_bytes, filename)
    if img is None:
        return None, None

    decoded_objects = pyzbar_decode(img)

    for obj in decoded_objects:
        if obj.type not in ("QRCODE", "QR"):
            continue
        try:
            raw = obj.data.decode("utf-8")
            qr_dict = json.loads(raw)

            # Coordonnées du QR code dans l'image
            rect = obj.rect  # pyzbar.Rect(left, top, width, height)
            coords = (rect.left, rect.top, rect.width, rect.height)

            return qr_dict, coords
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue

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
    masked = img.copy()
    draw = ImageDraw.Draw(masked)
    draw.rectangle(
        [x - margin, y - margin, x + w + margin, y + h + margin],
        fill="white"
    )
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
        return ""

    # Masquer la zone QR si on la connaît
    if qr_coords:
        img = mask_qr_zone(img, qr_coords)

    # OCR bilingue français + anglais
    try:
        text = pytesseract.image_to_string(img, lang="fra+eng")
        return text.strip()
    except Exception:
        try:
            text = pytesseract.image_to_string(img)
            return text.strip()
        except Exception:
            return ""
