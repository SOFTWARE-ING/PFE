# backend/app/services/ocr_service.py
"""
ocr_service.py - Service OCR pour l'extraction de texte
=======================================================
Extrait le texte des documents (PDF, DOCX, images)
"""

import io
import os
from typing import Optional
import logging
from PIL import Image
import pytesseract
from pdf2image import convert_from_bytes
from docx import Document
import PyPDF2

logger = logging.getLogger(__name__)


class OCRService:
    """Service d'extraction OCR pour différents formats"""
    
    @staticmethod
    def extract_text(file_content: bytes, filename: str) -> Optional[str]:
        """
        Extrait le texte d'un fichier selon son extension
        
        Args:
            file_content: Contenu binaire du fichier
            filename: Nom du fichier (pour l'extension)
        
        Returns:
            Texte extrait ou None si erreur
        """
        ext = filename.split('.')[-1].lower()
        
        try:
            if ext == 'pdf':
                return OCRService._extract_from_pdf(file_content)
            elif ext == 'docx':
                return OCRService._extract_from_docx(file_content)
            elif ext in ['png', 'jpg', 'jpeg']:
                return OCRService._extract_from_image(file_content)
            else:
                logger.warning(f"Format non supporté: {ext}")
                return None
                
        except Exception as e:
            logger.error(f"Erreur extraction OCR pour {filename}: {str(e)}")
            return None
    
    @staticmethod
    def _extract_from_pdf(content: bytes) -> Optional[str]:
        """Extrait le texte d'un PDF (texte + OCR si nécessaire)"""
        text_parts = []
        
        # Tentative d'extraction de texte natif du PDF
        try:
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(content))
            for page in pdf_reader.pages:
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    text_parts.append(page_text)
        except Exception as e:
            logger.warning(f"Extraction texte natif PDF échouée: {e}")
        
        # Si peu ou pas de texte trouvé, utiliser OCR
        if not text_parts or sum(len(t) for t in text_parts) < 100:
            try:
                # Convertir PDF en images
                images = convert_from_bytes(content, dpi=300)
                
                for image in images:
                    # OCR sur l'image
                    ocr_text = pytesseract.image_to_string(
                        image, 
                        lang='fra+eng'  # Français + Anglais
                    )
                    if ocr_text and ocr_text.strip():
                        text_parts.append(ocr_text)
                        
            except Exception as e:
                logger.warning(f"OCR PDF échoué: {e}")
        
        return "\n".join(text_parts) if text_parts else None
    
    @staticmethod
    def _extract_from_docx(content: bytes) -> Optional[str]:
        """Extrait le texte d'un document DOCX"""
        try:
            doc = Document(io.BytesIO(content))
            text_parts = []
            
            for paragraph in doc.paragraphs:
                if paragraph.text and paragraph.text.strip():
                    text_parts.append(paragraph.text)
            
            # Extraire aussi le texte des tableaux
            for table in doc.tables:
                for row in table.rows:
                    for cell in row.cells:
                        if cell.text and cell.text.strip():
                            text_parts.append(cell.text)
            
            return "\n".join(text_parts) if text_parts else None
            
        except Exception as e:
            logger.error(f"Erreur extraction DOCX: {e}")
            return None
    
    @staticmethod
    def _extract_from_image(content: bytes) -> Optional[str]:
        """Extrait le texte d'une image"""
        try:
            image = Image.open(io.BytesIO(content))
            
            # Prétraitement de l'image pour meilleure OCR
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Amélioration du contraste
            from PIL import ImageEnhance
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(2.0)
            
            # OCR avec configuration optimisée
            text = pytesseract.image_to_string(
                image,
                lang='fra+eng',
                config='--psm 3 --oem 3'  # Auto segmentation + mode par défaut
            )
            
            return text.strip() if text else None
            
        except Exception as e:
            logger.error(f"Erreur extraction image: {e}")
            return None
    
    @staticmethod
    def extract_text_batch(files: list) -> dict:
        """
        Extrait le texte de plusieurs fichiers en batch
        
        Args:
            files: Liste de tuples (content, filename)
        
        Returns:
            Dictionnaire {filename: extracted_text}
        """
        results = {}
        for content, filename in files:
            results[filename] = OCRService.extract_text(content, filename)
        return results
    