from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.ocr_service import OCRService

router = APIRouter(prefix="/ocr", tags=["Extraction"])

@router.post("/extract")
async def extract_content(file: UploadFile = File(...)):
    
    # Liste des formats autorisés selon les besoins du projet
    allowed_extensions = {'pdf', 'docx', 'png', 'jpg', 'jpeg'}

    # Recuperation de l'extention du fichier fournit
    ext = file.filename.split('.')[-1].lower()

    # Verification du type de fichier
    if ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail=f"Erreur de format .{ext}")

    try:
        # Lecture du fichier 
        content = await file.read()

        # Extraction du text
        extracted_text = OCRService.extract_text(content, file.filename)
        
        return{
            "filname" : file.filename,
            "extracted_text" : extracted_text,
            "message" : "Contenu extrait avec succes pour indexation et recherche."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

