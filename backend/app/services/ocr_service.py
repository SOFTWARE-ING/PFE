import pytesseract
from PIL import Image
import io
import logging
from pdf2image import convert_from_bytes
from docx import Document

logger = logging.getLogger(__name__)



class OCRService:
    @staticmethod
    def extract_text(file_bytes: bytes, filname: str) -> str:

        extension = filname.split('.')[-1].lower()

        # Cas 1: Image (PNG, JPG, JPEG...)
        # Liste des extension a tester
        ext_list = ['png', 'jpg', 'jpeg']

        if extension in ext_list:

            # Converion des octects en image PIL
            image = Image.open(io.BytesIO(file_bytes))

            # Extraction de texte en Francais et en Anglais (Le Cameroun est billingue)
            # Cela permet de remplir l'objectif de recherche par contenu [1]
            text = pytesseract.image_to_string(image, lang = 'fra+eng')

            return text.strip()
        
        # Cas 2 : Fichiers PDF (Scannés ou numériques)
        elif extension == 'pdf':
            
            # Conversion des pages PDF en Image (Scanner ou numérique)
            pages = convert_from_bytes(file_bytes)

            # Initialisation de la variable qui contiendra le texte extraite
            text_content  = ""

            for page in pages:
                # Extraction de texte en Francais et en Anglais (Le Cameroun est billingue)
                # Cela permet de remplir l'objectif de recherche par contenu 
                text_content += pytesseract.image_to_string(page, lang='fra+eng')

            return text_content.strip()
            
        # Cas 3 : Fichiers Word (DOCX)
        elif extension == 'docx':

            doc = Document(io.BytesIO(file_bytes))
            redoc = "\n".join([para.text for para in doc.paragraphs])

            return redoc
        else:
            raise Exception("Erreur: Format de fichier non supporté.")
