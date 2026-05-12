"""
ocr_service.py — Service d'extraction de texte (OCR)
=====================================================
Deux niveaux de sortie :
  - extract_text()       → texte lisible, propre (pour affichage)
  - extract_normalized() → texte normalisé (pour comparaison / vérification d'authenticité)

La normalisation garantit que le même document en PDF et en photo JPEG
produit une chaîne identique pour la vérification d'authenticité.

Exemple :
  PDF   → "BONJOUR V A ?"   → normalize → "bonjourva"
  Photo → "BONJOUR VA?"     → normalize → "bonjourva"
  → identiques ✅
"""

import io
import re
import logging
import unicodedata

import pytesseract
from PIL import Image, ImageFilter, ImageEnhance
from pdf2image import convert_from_bytes
from docx import Document

logger = logging.getLogger(__name__)

# ─── Extensions supportées ───────────────────────────────────────────────────
IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'bmp', 'tiff', 'tif'}
PDF_EXTENSIONS   = {'pdf'}
DOCX_EXTENSIONS  = {'docx'}
ALL_EXTENSIONS   = IMAGE_EXTENSIONS | PDF_EXTENSIONS | DOCX_EXTENSIONS

TESSERACT_CONFIG = r'--oem 3 --psm 3'
TESSERACT_LANG   = 'fra+eng'


class OCRService:

    # ─── Points d'entrée publics ──────────────────────────────────────────

    @staticmethod
    def extract_text(file_bytes: bytes, filename: str) -> str:
        """Texte propre et lisible — pour affichage à l'utilisateur."""
        ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''

        if ext in IMAGE_EXTENSIONS:
            raw = OCRService._from_image(file_bytes)
        elif ext in PDF_EXTENSIONS:
            raw = OCRService._from_pdf(file_bytes)
        elif ext in DOCX_EXTENSIONS:
            raw = OCRService._from_docx(file_bytes)
        else:
            raise ValueError(
                f"Format '.{ext}' non supporté. Acceptés : {', '.join(sorted(ALL_EXTENSIONS))}"
            )

        return OCRService._clean(raw)

    @staticmethod
    def extract_normalized(file_bytes: bytes, filename: str) -> str:
        """
        Texte normalisé pour comparaison cross-format.
        Utiliser ceci pour vérifier l'authenticité d'un document.
        """
        readable = OCRService.extract_text(file_bytes, filename)
        return OCRService.normalize(readable)

    @staticmethod
    def normalize(text: str) -> str:
        """
        Normalise un texte pour comparaison d'authenticité.

        Peut être appelé sur n'importe quel texte (contenu BD ou extrait OCR).

        Exemple d'usage dans signature_service.py :
            stored   = OCRService.normalize(communique.contenu)
            uploaded = OCRService.extract_normalized(file_bytes, filename)
            is_authentic = (stored == uploaded)
        """
        if not text:
            return ''
        # 1. Minuscules
        text = text.lower()
        # 2. Décompose les accents (é→e, à→a, ç→c …)
        text = unicodedata.normalize('NFKD', text)
        text = ''.join(c for c in text if not unicodedata.combining(c))
        # 3. Garde uniquement lettres + chiffres — supprime espaces, ponctuation, sauts de ligne
        text = re.sub(r'[^a-z0-9]', '', text)
        return text

    # ─── Image ───────────────────────────────────────────────────────────

    @staticmethod
    def _from_image(file_bytes: bytes) -> str:
        try:
            image = Image.open(io.BytesIO(file_bytes))
            image = OCRService._preprocess(image)
            return pytesseract.image_to_string(image, lang=TESSERACT_LANG, config=TESSERACT_CONFIG)
        except Exception as e:
            raise RuntimeError(f"Erreur OCR image : {e}")

    @staticmethod
    def _preprocess(image: Image.Image) -> Image.Image:
        """Améliore la qualité pour les photos mobiles de documents."""
        if image.mode not in ('L', 'RGB'):
            image = image.convert('RGB')
        image = image.convert('L')
        image = ImageEnhance.Contrast(image).enhance(1.5)
        image = image.filter(ImageFilter.SHARPEN)
        return image


    # @staticmethod
    # def _preprocess(image: Image.Image) -> Image.Image:
    #     from PIL import ImageOps
    #     if image.mode not in ('L', 'RGB'):
    #         image = image.convert('RGB')
    #     image = image.convert('L')
    #     # Auto-contrast (fixes dark/overexposed photos)
    #     image = ImageOps.autocontrast(image, cutoff=2)
    #     # Stronger contrast boost
    #     image = ImageEnhance.Contrast(image).enhance(2.5)
    #     # Stronger sharpening
    #     image = image.filter(ImageFilter.SHARPEN)
    #     image = image.filter(ImageFilter.SHARPEN)
    #     # Resize small images (improves OCR on low-res photos)
    #     w, h = image.size
    #     if w < 1500:
    #         image = image.resize((w * 2, h * 2), Image.LANCZOS)
    #     return image


    # ─── PDF ─────────────────────────────────────────────────────────────

    @staticmethod
    def _from_pdf(file_bytes: bytes) -> str:
        # Essai 1 : extraction directe (PDF numérique)
        direct = OCRService._pdf_direct(file_bytes)
        if len(direct.strip()) > 50:
            return direct
        # Essai 2 : OCR page par page (PDF scanné)
        return OCRService._pdf_ocr(file_bytes)

    @staticmethod
    def _pdf_direct(file_bytes: bytes) -> str:
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(file_bytes))
            return '\n'.join(page.extract_text() or '' for page in reader.pages)
        except Exception:
            return ''

    @staticmethod
    def _pdf_ocr(file_bytes: bytes) -> str:
        try:
            pages = convert_from_bytes(file_bytes, dpi=300)
        except Exception as e:
            raise RuntimeError(f"Conversion PDF échouée (vérifiez poppler-utils) : {e}")
        parts = []
        for i, page in enumerate(pages, 1):
            try:
                parts.append(pytesseract.image_to_string(
                    OCRService._preprocess(page), lang=TESSERACT_LANG, config=TESSERACT_CONFIG
                ))
            except Exception as e:
                logger.warning(f"OCR page {i} : {e}")
        return '\n'.join(parts)

    # ─── DOCX ────────────────────────────────────────────────────────────

    @staticmethod
    def _from_docx(file_bytes: bytes) -> str:
        try:
            doc = Document(io.BytesIO(file_bytes))
            parts = [p.text for p in doc.paragraphs if p.text.strip()]
            for table in doc.tables:
                for row in table.rows:
                    cells = [c.text.strip() for c in row.cells if c.text.strip()]
                    if cells:
                        parts.append(' | '.join(cells))
            return '\n'.join(parts)
        except Exception as e:
            raise RuntimeError(f"Erreur lecture DOCX : {e}")

    # ─── Nettoyage lisible ────────────────────────────────────────────────

    @staticmethod
    def _clean(text: str) -> str:
        """Nettoie pour affichage — garde la lisibilité humaine."""
        if not text:
            return ''
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        text = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]', '', text)
        text = re.sub(r'(?<!\S)[|~^`¬§©®™](?!\S)', '', text)
        lines = [re.sub(r'  +', ' ', l).strip() for l in text.split('\n')]
        text = '\n'.join(lines)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()
