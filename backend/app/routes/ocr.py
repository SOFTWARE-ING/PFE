"""
ocr.py — Endpoint d'extraction de texte (OCR)
==============================================
Supporte : PDF, DOCX, PNG, JPG, JPEG, WEBP, BMP, TIFF
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.ocr_service import OCRService, ALL_EXTENSIONS

router = APIRouter(prefix="/ocr", tags=["Extraction OCR"])


@router.post("/extract")
async def extract_content(file: UploadFile = File(...)):
    """
    Extrait le texte d'un document uploadé.

    Formats supportés :
      - Images  : PNG, JPG, JPEG, WEBP, BMP, TIFF  (y compris photos mobiles)
      - PDF     : numérique ou scanné
      - Word    : DOCX

    Le texte retourné est nettoyé (sans caractères parasites OCR).
    """
    # Récupération de l'extension
    ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''

    # Vérification du format
    if ext not in ALL_EXTENSIONS:
        supported = ', '.join(sorted(ALL_EXTENSIONS))
        raise HTTPException(
            status_code=400,
            detail=f"Format '.{ext}' non supporté. Formats acceptés : {supported}"
        )

    try:
        content = await file.read()

        if not content:
            raise HTTPException(status_code=400, detail="Le fichier est vide.")

        extracted_text = OCRService.extract_text(content, file.filename)

        if not extracted_text:
            return {
                "filename": file.filename,
                "extracted_text": "",
                "message": "Aucun texte détecté dans le document.",
                "char_count": 0
            }

        return {
            "filename": file.filename,
            "extracted_text": extracted_text,
            "message": "Texte extrait avec succès.",
            "char_count": len(extracted_text)
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur inattendue lors de l'extraction : {str(e)}"
        )
