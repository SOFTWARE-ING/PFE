"""
ocr_service.py — Service d'extraction de texte (OCR)
=====================================================
Supporte :
  - Images scannées ou photographiées : PNG, JPG, JPEG, WEBP, BMP, TIFF
  - PDF numérique ou scanné (converti en images avant OCR)
  - DOCX Word (extraction directe sans OCR)

Nettoyage automatique du texte extrait :
  - Suppression des caractères parasites
  - Normalisation des espaces et sauts de ligne
  - Suppression des lignes vides excessives
"""

import io
import re
import logging

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


# ─── Configuration Tesseract ─────────────────────────────────────────────────
# PSM 3  = détection automatique de la mise en page (meilleur pour documents)
# PSM 6  = bloc de texte uniforme (bon pour formulaires simples)
# OEM 3  = utilise le moteur LSTM (le plus précis)
TESSERACT_CONFIG = r'--oem 3 --psm 3'
TESSERACT_LANG   = 'fra+eng'   # Français + Anglais (Cameroun bilingue)


class OCRService:

    # ─── Point d'entrée principal ─────────────────────────────────────────

    @staticmethod
    def extract_text(file_bytes: bytes, filename: str) -> str:
        """
        Extrait le texte d'un fichier (image, PDF, DOCX).

        Args:
            file_bytes : contenu binaire du fichier
            filename   : nom du fichier avec extension

        Returns:
            Texte extrait, nettoyé et normalisé.

        Raises:
            ValueError : format non supporté
            RuntimeError : erreur lors de l'extraction
        """
        ext = filename.rsplit('.', 1)[-1].lower()

        if ext in IMAGE_EXTENSIONS:
            return OCRService._extract_from_image_bytes(file_bytes)

        elif ext in PDF_EXTENSIONS:
            return OCRService._extract_from_pdf(file_bytes)

        elif ext in DOCX_EXTENSIONS:
            return OCRService._extract_from_docx(file_bytes)

        else:
            supported = ', '.join(sorted(ALL_EXTENSIONS))
            raise ValueError(
                f"Format '.{ext}' non supporté. Formats acceptés : {supported}"
            )

    # ─── Image (PNG, JPG, JPEG, WEBP, BMP, TIFF) ─────────────────────────

    @staticmethod
    def _extract_from_image_bytes(file_bytes: bytes) -> str:
        """
        OCR sur une image uploadée (photo, scan, screenshot).
        Applique un prétraitement pour améliorer la précision :
          1. Conversion en niveaux de gris
          2. Amélioration du contraste
          3. Légère netteté
        """
        try:
            image = Image.open(io.BytesIO(file_bytes))
            image = OCRService._preprocess_image(image)
            raw_text = pytesseract.image_to_string(
                image,
                lang=TESSERACT_LANG,
                config=TESSERACT_CONFIG
            )
            return OCRService._clean_text(raw_text)
        except Exception as e:
            logger.error(f"Erreur OCR image : {e}")
            raise RuntimeError(f"Impossible d'extraire le texte de l'image : {e}")

    @staticmethod
    def _preprocess_image(image: Image.Image) -> Image.Image:
        """
        Prétraite l'image pour améliorer la reconnaissance OCR.
        Particulièrement utile pour les photos de documents (mobile).
        """
        # 1. S'assurer que l'image est en RGB (certains PNG ont un canal alpha)
        if image.mode not in ('L', 'RGB'):
            image = image.convert('RGB')

        # 2. Conversion en niveaux de gris
        image = image.convert('L')

        # 3. Amélioration du contraste (aide pour les photos sous-exposées)
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(1.5)

        # 4. Légère netteté (réduit le flou de mise au point)
        image = image.filter(ImageFilter.SHARPEN)

        return image

    # ─── PDF (numérique ou scanné) ────────────────────────────────────────

    @staticmethod
    def _extract_from_pdf(file_bytes: bytes) -> str:
        """
        Extrait le texte d'un PDF.
        Stratégie en 2 temps :
          1. Essaie d'abord l'extraction directe du texte (PDF numérique)
          2. Si le texte est vide ou trop court → convertit en images et fait OCR
             (PDF scanné ou PDF d'images)
        """
        # Tentative 1 : extraction directe (rapide, propre)
        direct_text = OCRService._extract_pdf_direct(file_bytes)

        if len(direct_text.strip()) > 50:
            # Assez de texte → PDF numérique, on utilise le résultat direct
            return OCRService._clean_text(direct_text)

        # Tentative 2 : OCR page par page (PDF scanné)
        logger.info("PDF semble scanné → passage en mode OCR image")
        return OCRService._extract_pdf_via_ocr(file_bytes)

    @staticmethod
    def _extract_pdf_direct(file_bytes: bytes) -> str:
        """Extraction directe du texte numérique d'un PDF via PyPDF2."""
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(io.BytesIO(file_bytes))
            pages_text = []
            for page in reader.pages:
                page_text = page.extract_text() or ''
                pages_text.append(page_text)
            return '\n'.join(pages_text)
        except Exception as e:
            logger.warning(f"Extraction PDF directe échouée : {e}")
            return ''

    @staticmethod
    def _extract_pdf_via_ocr(file_bytes: bytes) -> str:
        """Convertit chaque page du PDF en image, puis applique Tesseract."""
        try:
            # dpi=300 → qualité suffisante pour l'OCR sans être trop lourd
            pages = convert_from_bytes(file_bytes, dpi=300)
        except Exception as e:
            raise RuntimeError(
                f"Impossible de convertir le PDF en images. "
                f"Vérifiez que 'poppler-utils' est installé. Erreur : {e}"
            )

        pages_text = []
        for page_num, page_image in enumerate(pages, start=1):
            try:
                preprocessed = OCRService._preprocess_image(page_image)
                page_text = pytesseract.image_to_string(
                    preprocessed,
                    lang=TESSERACT_LANG,
                    config=TESSERACT_CONFIG
                )
                pages_text.append(page_text)
            except Exception as e:
                logger.warning(f"OCR échoué sur la page {page_num} : {e}")
                pages_text.append('')

        raw = '\n'.join(pages_text)
        return OCRService._clean_text(raw)

    # ─── DOCX ────────────────────────────────────────────────────────────

    @staticmethod
    def _extract_from_docx(file_bytes: bytes) -> str:
        """
        Extraction directe du texte d'un fichier Word DOCX.
        Inclut les paragraphes + le texte des tableaux.
        """
        try:
            doc = Document(io.BytesIO(file_bytes))

            parts = []

            # Paragraphes normaux
            for para in doc.paragraphs:
                if para.text.strip():
                    parts.append(para.text)

            # Texte dans les tableaux
            for table in doc.tables:
                for row in table.rows:
                    row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_cells:
                        parts.append(' | '.join(row_cells))

            raw = '\n'.join(parts)
            return OCRService._clean_text(raw)

        except Exception as e:
            raise RuntimeError(f"Impossible de lire le fichier DOCX : {e}")

    # ─── Nettoyage du texte extrait ───────────────────────────────────────

    @staticmethod
    def _clean_text(text: str) -> str:
        """
        Nettoie le texte brut sorti de Tesseract ou PyPDF2.

        Suppressions :
          - Caractères de contrôle inutiles (sauf \n)
          - Caractères parasites courants en OCR  (|, ~, ^, `, ¬, §, ©, ®, ™)
          - Espaces en début/fin de chaque ligne
          - Lignes vides consécutives (max 2 sauts de ligne)
          - Espaces multiples sur une même ligne

        Conservation :
          - Accents et caractères français
          - Ponctuation standard
          - Structure en paragraphes (sauts de ligne)
        """
        if not text:
            return ''

        # 1. Supprimer les retours chariot Windows
        text = text.replace('\r\n', '\n').replace('\r', '\n')

        # 2. Supprimer les caractères de contrôle (sauf \n et \t)
        text = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]', '', text)

        # 3. Supprimer les caractères parasites typiques de l'OCR
        #    (barres verticales isolées, tildes, carets, guillemets angulaires parasites)
        text = re.sub(r'(?<!\S)[|~^`¬§©®™](?!\S)', '', text)

        # 4. Nettoyer chaque ligne individuellement
        lines = text.split('\n')
        cleaned_lines = []
        for line in lines:
            # Supprimer les espaces multiples dans la ligne
            line = re.sub(r'  +', ' ', line)
            # Supprimer les espaces en début et fin de ligne
            line = line.strip()
            cleaned_lines.append(line)

        # 5. Reconstruire en supprimant les lignes vides excessives
        #    (garder au maximum 1 ligne vide entre deux blocs de texte)
        text = '\n'.join(cleaned_lines)
        text = re.sub(r'\n{3,}', '\n\n', text)

        return text.strip()
