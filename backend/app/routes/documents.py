"""
documents.py — SHIELD — Workflow complet de signature
=====================================================
CORRECTION v3 — Endpoint /verify :
  Implémentation du vrai flux cryptographique de vérification :
  1. Lecture des métadonnées du QR code (sig chiffrée + key_fp)
  2. Recherche de la clé publique via key_fp (empreinte)
  3. Déchiffrement RSA-PSS de la signature → hash_original
  4. OCR + normalisation du document scanné uploadé
  5. SHA256 du texte normalisé → hash_nouveau
  6. Comparaison hash_original == hash_nouveau → verdict

Tous les autres endpoints sont inchangés.
"""

import base64
import hashlib
import json
import os
import uuid

import zlib
import qrcode
import qrcode.constants

from datetime import datetime
from io import BytesIO
from pathlib import Path
from typing import Optional

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

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


# ── 1. UPLOAD PDF ───────────────────────────────────────────────────────────

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    titre: str = Form(...),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    user_id, agent = _get_agent(credentials.credentials, db)

    if not file.filename.lower().endswith(('.pdf', '.docx', '.png', '.jpg', '.jpeg')):
        raise HTTPException(status_code=400, detail="Format non supporté. PDF, DOCX, PNG, JPG acceptés.")

    content = await file.read()

    extracted_text = OCRService.extract_text(content, file.filename)
    if not extracted_text.strip():
        raise HTTPException(status_code=400, detail="Impossible d'extraire le texte du document.")

    normalized_text = OCRService.normalize(extracted_text)
    content_hash = hashlib.sha256(normalized_text.encode('utf-8')).hexdigest()

    communique = Communique(
        id_communique=str(uuid.uuid4()),
        titre=titre,
        contenu=extracted_text,
        contenu_normalise=normalized_text,
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
    user_id, agent = _get_agent(credentials.credentials, db)

    sig_service = SignatureService(db)
    result = sig_service.sign_communique(communique_id, user_id)

    if not result.success:
        raise HTTPException(status_code=400, detail=result.message)

    cle = db.query(CleCryptographique).filter(
        CleCryptographique.id_agent_officiel == user_id
    ).order_by(CleCryptographique.date_creation.desc()).first()

    key_fingerprint = ""
    if cle:
        key_fingerprint = hashlib.sha256(cle.cle_publique.encode()).hexdigest()[:16]

    sig = db.query(Signature).filter(
        Signature.id_signature == result.signature_id
    ).first()


    def _compress_uuid(uid: str) -> str:
        raw = bytes.fromhex(uid.replace("-", ""))
        return base64.urlsafe_b64encode(raw).decode().rstrip("=")

    payload = {
        "v": "3",
        "s": _compress_uuid(result.signature_id),
        "c": _compress_uuid(communique_id),
        "a": _compress_uuid(user_id),
        "k": key_fingerprint,
        "h": sig.valeur_signature if sig else "",
        "t": datetime.utcnow().strftime("%Y-%m-%dT%H:%M"),
    }

    json_str   = json.dumps(payload, separators=(",", ":"))
    compressed = zlib.compress(json_str.encode("utf-8"), level=9)
    qr_data    = "SHIELD3:" + base64.b85encode(compressed).decode("ascii")

    if sig:
        sig.metadata_qr = qr_data
        db.commit()

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=12,
        border=4,
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
        "qr_metadata": qr_data,
        "message": "Document signé. Placez le QR code sur le document."
    }


# ── 3. FINALIZE ─────────────────────────────────────────────────────────────

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

    import qrcode
    from PIL import Image as PILImage
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas
    import PyPDF2

    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=12,
        border=4,
    )
    qr.add_data(sig.metadata_qr)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")
    qr_buffer = BytesIO()
    qr_img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)

    qr_pil = PILImage.open(qr_buffer)
    qr_reader = ImageReader(qr_pil)

    pdf_content = await pdf_file.read()
    original_pdf = PyPDF2.PdfReader(BytesIO(pdf_content))

    overlay_buffer = BytesIO()
    page = original_pdf.pages[0]
    page_width = float(page.mediabox.width)
    page_height = float(page.mediabox.height)

    c = canvas.Canvas(overlay_buffer, pagesize=(page_width, page_height))
    c.drawImage(qr_reader, qr_x, qr_y, width=qr_size, height=qr_size)
    c.save()

    overlay_buffer.seek(0)
    overlay_pdf = PyPDF2.PdfReader(overlay_buffer)
    writer = PyPDF2.PdfWriter()

    for i, page in enumerate(original_pdf.pages):
        if i == 0:
            page.merge_page(overlay_pdf.pages[0])
        writer.add_page(page)

    output_buffer = BytesIO()
    writer.write(output_buffer)
    output_buffer.seek(0)

    filename = f"{communique_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}_signed.pdf"
    file_path = UPLOAD_DIR / filename
    with open(file_path, 'wb') as f:
        f.write(output_buffer.getvalue())

    file_size = os.path.getsize(file_path)
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
    user_id, _ = _get_agent(credentials.credentials, db)

    communique = db.query(Communique).filter(
        Communique.id_communique == communique_id,
        Communique.id_auteur == user_id
    ).first()
    if not communique:
        raise HTTPException(status_code=404, detail="Communiqué non trouvé")

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


# ── 5. LIST MY DOCUMENTS ────────────────────────────────────────────────────

@router.get("/my")
def list_my_documents(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
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


# ── 6. DOWNLOAD ─────────────────────────────────────────────────────────────

@router.get("/{communique_id}/download")
def download_document(communique_id: str, db: Session = Depends(get_db)):
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

    return StreamingResponse(
        iter_file(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=communique_{communique_id[:8]}.pdf"}
    )


# ── 7. DELETE ───────────────────────────────────────────────────────────────

@router.delete("/{communique_id}")
def delete_document(
    communique_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
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
    return {"success": True, "message": "Document désarchivé."}


# ── 9. VERIFY (public) — FLUX CRYPTOGRAPHIQUE COMPLET ──────────────────────

@router.post("/verify")
async def verify_document(
    file: UploadFile = File(...),
    qr_data: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Vérification cryptographique complète d'un document signé.

    Flux :
    ① Lecture des métadonnées du QR code
    ② Récupération de la clé publique de l'agent via key_fp (empreinte)
    ③ Déchiffrement RSA-PSS de encrypted_hash → hash_original
    ④ OCR + normalisation du document uploadé → texte_scan
    ⑤ SHA256(texte_scan) → hash_nouveau
    ⑥ hash_original == hash_nouveau → verdict final

    Cela garantit que :
    - La signature vient bien de l'agent (clé privée)
    - Le contenu du document n'a pas été modifié depuis la signature
    """

    # ── ① Parser le QR code ─────────────────────────────────────────────
    try:
        metadata = json.loads(qr_data)
    except Exception:
        raise HTTPException(status_code=400, detail="QR code invalide ou illisible.")

    sig_id        = metadata.get("sig_id")
    agent_id      = metadata.get("agent_id")
    key_fp        = metadata.get("key_fp")       # empreinte SHA256[:16] de la clé publique
    encrypted_hash = metadata.get("encrypted_hash")  # signature RSA base64

    if not all([sig_id, agent_id, key_fp, encrypted_hash]):
        return {
            "verified": False,
            "etape_echouee": "lecture_qr",
            "message": "❌ QR code incomplet ou corrompu. Données manquantes.",
        }

    # ── ② Trouver la clé publique de l'agent via key_fp ─────────────────
    # On cherche toutes les clés de cet agent et on compare l'empreinte
    cles = db.query(CleCryptographique).filter(
        CleCryptographique.id_agent_officiel == agent_id
    ).order_by(CleCryptographique.date_creation.desc()).all()

    public_key_obj = None
    for cle in cles:
        fp = hashlib.sha256(cle.cle_publique.encode()).hexdigest()[:16]
        if fp == key_fp:
            try:
                public_key_obj = serialization.load_pem_public_key(
                    cle.cle_publique.encode()
                )
            except Exception:
                pass
            break

    if public_key_obj is None:
        # Fallback : essayer la clé la plus récente
        if cles:
            try:
                public_key_obj = serialization.load_pem_public_key(
                    cles[0].cle_publique.encode()
                )
            except Exception:
                pass

    if public_key_obj is None:
        return {
            "verified": False,
            "etape_echouee": "recherche_cle",
            "message": "❌ Clé publique de l'agent introuvable.",
        }

    # ── ③ Extraire le texte du document scanné uploadé (OCR) ─────────────
    try:
        file_bytes = await file.read()
        texte_scan = OCRService.extract_text(file_bytes, file.filename)
        if not texte_scan.strip():
            return {
                "verified": False,
                "etape_echouee": "ocr",
                "message": "❌ Impossible d'extraire le texte du document. Vérifiez la qualité du scan.",
            }
        texte_normalise = OCRService.normalize(texte_scan)
    except Exception as e:
        return {
            "verified": False,
            "etape_echouee": "ocr",
            "message": f"❌ Erreur lors de l'extraction du texte : {str(e)}",
        }

    # ── ④ Calculer le hash SHA256 du texte normalisé extrait ─────────────
    hash_nouveau = hashlib.sha256(texte_normalise.encode('utf-8')).digest()

    # ── ⑤ Vérification RSA-PSS : déchiffrer encrypted_hash avec clé publique
    #    et comparer avec hash_nouveau
    signature_valid = False
    try:
        signature_bytes = base64.b64decode(encrypted_hash)
        public_key_obj.verify(
            signature_bytes,
            hash_nouveau,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        signature_valid = True
    except InvalidSignature:
        signature_valid = False
    except Exception as e:
        return {
            "verified": False,
            "etape_echouee": "verification_rsa",
            "message": f"❌ Erreur lors de la vérification cryptographique : {str(e)}",
        }

    # ── ⑥ Construire la réponse détaillée ────────────────────────────────
    agent_user  = db.query(Utilisateur).filter(Utilisateur.id_utilisateur == agent_id).first()
    agent_info  = db.query(AgentOfficiel).filter(AgentOfficiel.id_utilisateur == agent_id).first()
    sig_record  = db.query(Signature).filter(Signature.id_signature == sig_id).first()
    communique  = db.query(Communique).filter(
        Communique.id_communique == metadata.get("com_id")
    ).first()

    if signature_valid:
        message = "✅ Document authentique et intègre. La signature est cryptographiquement valide."
    else:
        message = (
            "❌ Vérification échouée. Le contenu du document ne correspond pas à la signature. "
            "Le document a peut-être été modifié après signature."
        )

    return {
        "verified": signature_valid,
        "signature_valid": signature_valid,
        # Infos sur le document
        "communique_titre": communique.titre if communique else metadata.get("com_id"),
        "date_signature": sig_record.date_signature.isoformat() if sig_record else metadata.get("ts"),
        "algorithme": metadata.get("algo", "RSA-PSS-SHA256"),
        # Infos sur le signataire
        "signed_by": f"{agent_user.prenom} {agent_user.nom}" if agent_user else "Inconnu",
        "institution": agent_info.id_institution if agent_info else "",
        "fonction": agent_info.fonction if agent_info else "",
        # Diagnostic des étapes
        "etapes": {
            "qr_lu": True,
            "cle_trouvee": public_key_obj is not None,
            "ocr_reussi": bool(texte_normalise),
            "signature_valide": signature_valid,
        },
        "message": message,
    }
