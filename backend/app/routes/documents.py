"""
documents.py - Complete document signing workflow
POST /api/documents/upload     → Upload PDF, extract text, create communique
POST /api/documents/sign       → Sign communique, generate QR with metadata
POST /api/documents/finalize   → Embed QR at given coordinates, save signed PDF
POST /api/documents/archive    → Archive document (makes it searchable)
GET  /api/documents/my         → List agent's documents
GET  /api/documents/{id}/download → Download signed PDF
DELETE /api/documents/{id}     → Delete document
PATCH /api/documents/{id}/unarchive → Unarchive
GET  /api/documents/{id}/verify → Verify document authenticity (public)
"""

import base64
import hashlib
import json
import os
import uuid
from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.jwt_utils import decode_access_token
from app.models.models import (
    AgentOfficiel, Archive, CleCryptographique,
    Communique, Signature, Utilisateur
)
from app.services.ocr_service import OCRService
from app.services.signature_service import SignatureService

router = APIRouter(prefix='/documents', tags=['DOCUMENTS'])
security = HTTPBearer()

UPLOAD_DIR = Path("uploads/signed")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


def _get_agent(token: str, db: Session):
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide")
    user_id = payload.get("sub")
    agent = db.query(AgentOfficiel).filter(AgentOfficiel.id_utilisateur == user_id).first()
    if not agent:
        raise HTTPException(status_code=403, detail="Accès réservé aux agents officiels")
    return user_id, agent


# ── 1. UPLOAD PDF ──────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    titre: str = Form(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Upload a PDF, extract text, create communique record."""
    user_id, agent = _get_agent(credentials.credentials, db)

    if not file.filename.lower().endswith(('.pdf', '.docx', '.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="Format non supporté. PDF, DOCX, PNG, JPG acceptés.")

    content = await file.read()

    # Extract text via OCR
    extracted_text = OCRService.extract_text(content, file.filename)
    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="Impossible d'extraire le texte du document.")

    normalized_text = OCRService.normalize(extracted_text)
    content_hash = hashlib.sha256(extracted_text.encode('utf-8')).hexdigest()

    communique = Communique(
        id_communique=str(uuid.uuid4()),
        titre=titre,
        contenu=extracted_text,
        hash_contenu=content_hash,
        statut='BROUILLON',
        id_auteur=user_id,
        est_archive=False
    )
    db.add(communique)
    db.commit()
    db.refresh(communique)

    return {
        "success": True,
        "communique_id": communique.id_communique,
        "titre": titre,
        "char_count": len(extracted_text),
        "hash": content_hash[:16] + "...",
        "message": "Document téléversé et texte extrait avec succès."
    }


# ── 2. SIGN & GENERATE QR ──────────────────────────────────────────────────

@router.post("/sign")
def sign_document(
    communique_id: str = Form(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Sign the communique and generate QR code with full metadata."""
    user_id, agent = _get_agent(credentials.credentials, db)

    sig_service = SignatureService(db)
    result = sig_service.sign_communique(communique_id, user_id)

    if not result.success:
        raise HTTPException(status_code=400, detail=result.message)

    # Get public key fingerprint
    cle = db.query(CleCryptographique).filter(
        CleCryptographique.id_agent_officiel == user_id
    ).order_by(CleCryptographique.date_creation.desc()).first()

    key_fingerprint = ""
    if cle:
        key_fingerprint = hashlib.sha256(cle.cle_publique.encode()).hexdigest()[:16]

    # Get the signature just created
    sig = db.query(Signature).filter(
        Signature.id_signature == result.signature_id
    ).first()

    # Build QR metadata — this is what gets embedded in QR code
    qr_metadata = {
        "v": "1",
        "sig_id": result.signature_id,
        "com_id": communique_id,
        "agent_id": user_id,
        "key_fp": key_fingerprint,
        "encrypted_hash": sig.valeur_signature if sig else "",
        "algo": "RSA-PSS-SHA256",
        "ts": datetime.utcnow().isoformat()
    }

    # Store metadata in signature
    if sig:
        sig.metadata_qr = json.dumps(qr_metadata)
        db.commit()

    # Generate QR code image
    import qrcode
    qr_data = json.dumps(qr_metadata)
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=8,
        border=2
    )
    qr.add_data(qr_data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = BytesIO()
    img.save(buffer, format='PNG')
    qr_base64 = base64.b64encode(buffer.getvalue()).decode()

    return {
        "success": True,
        "signature_id": result.signature_id,
        "communique_id": communique_id,
        "qr_code": f"data:image/png;base64,{qr_base64}",
        "qr_metadata": qr_metadata,
        "message": "Document signé. Placez le QR code sur le document."
    }


# ── 3. FINALIZE (embed QR at coordinates) ──────────────────────────────────

@router.post("/finalize")
async def finalize_document(
    communique_id: str = Form(...),
    signature_id: str = Form(...),
    pdf_file: UploadFile = File(...),
    qr_x: float = Form(default=50.0),
    qr_y: float = Form(default=50.0),
    qr_size: float = Form(default=80.0),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Embed QR code into PDF at given coordinates, save signed PDF."""
    user_id, _ = _get_agent(credentials.credentials, db)

    communique = db.query(Communique).filter(
        Communique.id_communique == communique_id,
        Communique.id_auteur == user_id
    ).first()
    if not communique:
        raise HTTPException(status_code=404, detail="Communiqué non trouvé")

    sig = db.query(Signature).filter(
        Signature.id_signature == signature_id,
        Signature.id_agent_officiel == user_id
    ).first()
    if not sig or not sig.metadata_qr:
        raise HTTPException(status_code=404, detail="Signature non trouvée")

    # Generate QR image
    import qrcode
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas
    import PyPDF2

    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=8, border=2)
    qr.add_data(sig.metadata_qr)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_buffer = BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)

    # Read original PDF
    pdf_content = await pdf_file.read()
    original_pdf = PyPDF2.PdfReader(BytesIO(pdf_content))

    # Create overlay with QR code
    overlay_buffer = BytesIO()
    c = canvas.Canvas(overlay_buffer, pagesize=A4)
    page = original_pdf.pages[0]
    page_width = float(page.mediabox.width)
    page_height = float(page.mediabox.height)
    c.setPageSize((page_width, page_height))
    # Draw QR at position (qr_x from left, qr_y from bottom)
    c.drawImage(qr_buffer, qr_x, qr_y, width=qr_size, height=qr_size)
    c.save()

    # Merge overlay onto original PDF
    overlay_buffer.seek(0)
    overlay_pdf = PyPDF2.PdfReader(overlay_buffer)
    writer = PyPDF2.PdfWriter()

    for i, page in enumerate(original_pdf.pages):
        if i == 0:
            page.merge_page(overlay_pdf.pages[0])
        writer.add_page(page)

    # Save final PDF
    output_buffer = BytesIO()
    writer.write(output_buffer)
    output_buffer.seek(0)

    # Store file on disk
    filename = f"{communique_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_signed.pdf"
    file_path = UPLOAD_DIR / filename
    with open(file_path, 'wb') as f:
        f.write(output_buffer.getvalue())

    file_size = os.path.getsize(file_path)

    # Update DB
    communique.fichier_signe = str(file_path)
    db.commit()

    return {
        "success": True,
        "communique_id": communique_id,
        "file_path": str(file_path),
        "file_size": file_size,
        "message": "Document signé et QR code intégré. Vous pouvez maintenant l'archiver."
    }


# ── 4. ARCHIVE ──────────────────────────────────────────────────────────────

@router.post("/archive")
async def archive_document(
    communique_id: str = Form(...),
    pdf_file: Optional[UploadFile] = File(default=None),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Archive document — makes it public and searchable."""
    user_id, _ = _get_agent(credentials.credentials, db)

    communique = db.query(Communique).filter(
        Communique.id_communique == communique_id,
        Communique.id_auteur == user_id
    ).first()
    if not communique:
        raise HTTPException(status_code=404, detail="Communiqué non trouvé")

    # If a new file is provided (re-upload case)
    if pdf_file:
        content = await pdf_file.read()
        filename = f"{communique_id}_archived.pdf"
        file_path = UPLOAD_DIR / filename
        with open(file_path, 'wb') as f:
            f.write(content)
        communique.fichier_signe = str(file_path)
        file_size = len(content)
    else:
        if not communique.fichier_signe:
            raise HTTPException(status_code=400, detail="Aucun fichier signé disponible.")
        file_size = os.path.getsize(communique.fichier_signe) if os.path.exists(communique.fichier_signe) else 0

    communique.statut = 'PUBLIE'
    communique.est_archive = True
    communique.date_publication = datetime.utcnow()

    # Create archive record
    archive = Archive(
        id_archive=str(uuid.uuid4()),
        id_communique=communique_id,
        chemin_stockage=communique.fichier_signe or "",
        taille_fichier=file_size,
        date_archivage=datetime.utcnow()
    )
    db.add(archive)
    db.commit()

    return {
        "success": True,
        "communique_id": communique_id,
        "message": "Document archivé. Il est maintenant visible dans les recherches."
    }


# ── 5. LIST MY DOCUMENTS ───────────────────────────────────────────────────

@router.get("/my")
def list_my_documents(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """List all documents signed by the authenticated agent."""
    user_id, _ = _get_agent(credentials.credentials, db)

    communiques = db.query(Communique).filter(
        Communique.id_auteur == user_id
    ).order_by(Communique.date_publication.desc()).all()

    results = []
    for c in communiques:
        sig = db.query(Signature).filter(
            Signature.id_communique == c.id_communique,
            Signature.id_agent_officiel == user_id
        ).first()
        results.append({
            "id_communique": c.id_communique,
            "titre": c.titre,
            "statut": c.statut,
            "est_archive": c.est_archive,
            "date_publication": c.date_publication,
            "has_file": bool(c.fichier_signe),
            "signature_id": sig.id_signature if sig else None,
            "date_signature": sig.date_signature if sig else None,
        })

    return {"success": True, "total": len(results), "documents": results}


# ── 6. DOWNLOAD SIGNED PDF ─────────────────────────────────────────────────

@router.get("/{communique_id}/download")
def download_document(
    communique_id: str,
    db: Session = Depends(get_db)
):
    """Download signed PDF — public for archived documents."""
    communique = db.query(Communique).filter(
        Communique.id_communique == communique_id,
        Communique.est_archive == True
    ).first()
    if not communique:
        raise HTTPException(status_code=404, detail="Document non trouvé ou non archivé.")
    if not communique.fichier_signe or not os.path.exists(communique.fichier_signe):
        raise HTTPException(status_code=404, detail="Fichier introuvable.")

    def iter_file():
        with open(communique.fichier_signe, 'rb') as f:
            yield from f

    filename = f"communique_{communique_id[:8]}.pdf"
    return StreamingResponse(
        iter_file(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# ── 7. DELETE ───────────────────────────────────────────────────────────────

@router.delete("/{communique_id}")
def delete_document(
    communique_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Delete a document and its signatures."""
    user_id, _ = _get_agent(credentials.credentials, db)

    communique = db.query(Communique).filter(
        Communique.id_communique == communique_id,
        Communique.id_auteur == user_id
    ).first()
    if not communique:
        raise HTTPException(status_code=404, detail="Document non trouvé.")

    if communique.fichier_signe and os.path.exists(communique.fichier_signe):
        os.remove(communique.fichier_signe)

    db.delete(communique)
    db.commit()
    return {"success": True, "message": "Document supprimé."}


# ── 8. UNARCHIVE ────────────────────────────────────────────────────────────

@router.patch("/{communique_id}/unarchive")
def unarchive_document(
    communique_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Unarchive a document — removes it from search results."""
    user_id, _ = _get_agent(credentials.credentials, db)

    communique = db.query(Communique).filter(
        Communique.id_communique == communique_id,
        Communique.id_auteur == user_id
    ).first()
    if not communique:
        raise HTTPException(status_code=404, detail="Document non trouvé.")

    communique.statut = 'BROUILLON'
    communique.est_archive = False
    db.commit()
    return {"success": True, "message": "Document désarchivé. Il n'apparaît plus dans les recherches."}


# ── 9. VERIFY (public) ──────────────────────────────────────────────────────

@router.post("/verify")
async def verify_document(
    file: UploadFile = File(...),
    qr_data: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Verify document authenticity by comparing QR data with document content.
    QR data = JSON string read from QR code.
    File = scanned document or image.
    """
    try:
        metadata = json.loads(qr_data)
    except Exception:
        raise HTTPException(status_code=400, detail="QR code invalide ou illisible.")

    sig_id = metadata.get("sig_id")
    com_id = metadata.get("com_id")
    encrypted_hash = metadata.get("encrypted_hash", "")
    key_fp = metadata.get("key_fp", "")

    # Get signature and communique from DB
    sig = db.query(Signature).filter(Signature.id_signature == sig_id).first()
    communique = db.query(Communique).filter(Communique.id_communique == com_id).first()

    if not sig or not communique:
        return {"verified": False, "message": "❌ Document introuvable dans la base de données."}

    # Verify cryptographic signature
    sig_service = SignatureService(db)
    result = sig_service.verify_signature(sig_id)

    # Also compare with uploaded document text
    content = await file.read()
    extracted_text = OCRService.extract_text(content, file.filename)
    uploaded_normalized = OCRService.normalize(extracted_text)
    stored_normalized = OCRService.normalize(communique.contenu)

    content_match = (uploaded_normalized == stored_normalized) if uploaded_normalized else None

    # Get agent info
    agent_user = db.query(Utilisateur).filter(Utilisateur.id_utilisateur == sig.id_agent_officiel).first()
    agent_info = db.query(AgentOfficiel).filter(AgentOfficiel.id_utilisateur == sig.id_agent_officiel).first()

    return {
        "verified": result.verified and (content_match is not False),
        "signature_valid": result.verified,
        "content_match": content_match,
        "communique_titre": communique.titre,
        "signed_by": f"{agent_user.prenom} {agent_user.nom}" if agent_user else "Inconnu",
        "institution": agent_info.id_institution if agent_info else "",
        "fonction": agent_info.fonction if agent_info else "",
        "date_signature": sig.date_signature,
        "message": "✅ Document authentique et intègre." if result.verified else "❌ Signature invalide ou document modifié."
    }
