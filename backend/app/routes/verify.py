"""
verify.py — Vérification publique d'un document signé (3 niveaux)
=================================================================
V2 — Upload unique : le citoyen uploade le document signé,
le backend détecte automatiquement le QR code et extrait le texte
en ignorant la zone QR.

Accessible sans authentification (public / citoyen).

NIVEAU 1 — Vérification cryptographique RSA-PSS
  QR détecté → encrypted_hash + sig_id + key_fp
  RSA_PSS_verify(encrypted_hash, SHA256(contenu_original), clé_publique)

NIVEAU 2 — Comparaison hash (QR vs OCR du scan sans zone QR)
  SHA256(texte_extrait_sans_qr) == SHA256(contenu_original) ?

NIVEAU 3 — Diff textuel fin si niveau 2 échoue
  difflib char par char → similarité % + liste anomalies localisées
"""

import base64
import difflib
import hashlib
import json
import logging
from typing import Optional, Tuple, Dict, Any

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import (
    AgentOfficiel, CleCryptographique,
    Communique, Signature, Utilisateur,
)
from app.services.ocr_service import OCRService
from app.services.qr_scanner_service import (
    detect_and_decode_qr,
    extract_text_without_qr,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/verify", tags=["Vérification Publique"])

RSA_PADDING = padding.PSS(
    mgf=padding.MGF1(hashes.SHA256()),
    salt_length=padding.PSS.MAX_LENGTH,
)

SUPPORTED_FORMATS = (".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".bmp")


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _find_public_key(db: Session, agent_id: str, key_fp: str):
    cles = (
        db.query(CleCryptographique)
        .filter(CleCryptographique.id_agent_officiel == agent_id)
        .order_by(CleCryptographique.date_creation.desc())
        .all()
    )
    for cle in cles:
        fp = hashlib.sha256(cle.cle_publique.encode()).hexdigest()[:16]
        if fp == key_fp:
            try:
                return serialization.load_pem_public_key(cle.cle_publique.encode())
            except Exception:
                continue
    # Fallback clé la plus récente
    for cle in cles:
        try:
            return serialization.load_pem_public_key(cle.cle_publique.encode())
        except Exception:
            continue
    return None


def _compute_diff(original: str, scanned: str) -> Dict[str, Any]:
    """Diff caractère par caractère avec localisation des anomalies."""
    CONTEXT = 25
    orig_n = OCRService.normalize(original)
    scan_n = OCRService.normalize(scanned)

    matcher = difflib.SequenceMatcher(None, orig_n, scan_n, autojunk=False)
    total_orig = max(len(orig_n), 1)
    anomalies = []
    chars_modifies = 0

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == "equal":
            continue
        ctx_start = max(0, i1 - CONTEXT)
        ctx_end   = min(len(orig_n), i2 + CONTEXT)
        contexte  = orig_n[ctx_start:ctx_end]

        if tag == "replace":
            n = max(i2 - i1, j2 - j1)
            chars_modifies += n
            anomalies.append({
                "type":     "substitution",
                "label":    "Caractère(s) modifié(s)",
                "position": i1,
                "original": orig_n[i1:i2],
                "scanned":  scan_n[j1:j2],
                "contexte": contexte,
                "gravite":  "haute" if n > 3 else "faible",
            })
        elif tag == "delete":
            n = i2 - i1
            chars_modifies += n
            anomalies.append({
                "type":     "omission",
                "label":    "Caractère(s) supprimé(s) dans le scan",
                "position": i1,
                "original": orig_n[i1:i2],
                "scanned":  "",
                "contexte": contexte,
                "gravite":  "haute" if n > 3 else "faible",
            })
        elif tag == "insert":
            n = j2 - j1
            chars_modifies += n
            anomalies.append({
                "type":     "ajout",
                "label":    "Caractère(s) ajouté(s) absent(s) de l'original",
                "position": i1,
                "original": "",
                "scanned":  scan_n[j1:j2],
                "contexte": contexte,
                "gravite":  "haute" if n > 3 else "faible",
            })

    chars_identiques = max(0, total_orig - chars_modifies)
    similarite = round((chars_identiques / total_orig) * 100, 2)

    return {
        "similarite_pct":   similarite,
        "chars_total":      total_orig,
        "chars_identiques": chars_identiques,
        "chars_modifies":   chars_modifies,
        "nb_anomalies":     len(anomalies),
        "anomalies":        anomalies[:50],
    }


# ─── Endpoint principal ───────────────────────────────────────────────────────

@router.post(
    "/document",
    summary="Vérification automatique d'un document signé (upload unique)",
    description=(
        "Le citoyen uploade le document signé (PDF ou image). "
        "Le backend détecte automatiquement le QR code, décode son contenu JSON, "
        "extrait le texte en ignorant la zone QR, puis effectue la vérification "
        "en 3 niveaux progressifs. Aucune saisie manuelle requise."
    ),
)
async def verify_document(
    file: UploadFile = File(..., description="Document signé : PDF, PNG, JPG, TIFF"),
    db: Session = Depends(get_db),
):
    # ── Validation format ────────────────────────────────────────────────────
    fname = (file.filename or "").lower()
    if not any(fname.endswith(ext) for ext in SUPPORTED_FORMATS):
        raise HTTPException(
            status_code=400,
            detail=f"Format non supporté. Acceptés : {', '.join(SUPPORTED_FORMATS)}",
        )

    file_bytes = await file.read()
    logger.info(f"Verification request: {file.filename} ({len(file_bytes)} bytes)")

    # ════════════════════════════════════════════════════════════════════════
    # ÉTAPE 0 — Détection automatique du QR code
    # ════════════════════════════════════════════════════════════════════════
    try:
        qr_dict, qr_coords = detect_and_decode_qr(file_bytes, file.filename)
    except RuntimeError as e:
        logger.error(f"QR detection runtime error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    if qr_dict is None:
        logger.warning(f"No SHIELD QR code detected in {file.filename}")
        raise HTTPException(
            status_code=422,
            detail=(
                "Aucun QR code SHIELD détecté dans ce document. "
                "Vérifiez que le document est bien un communiqué signé par SHIELD "
                "et que le scan est de bonne qualité (résolution suffisante, pas trop flou)."
            ),
        )

    logger.info(f"QR code detected at coordinates: {qr_coords}")
    
    # Valider les champs requis du QR
    sig_id         = qr_dict.get("sig_id")
    com_id         = qr_dict.get("com_id")
    agent_id       = qr_dict.get("agent_id")
    key_fp         = qr_dict.get("key_fp", "")
    encrypted_hash = qr_dict.get("encrypted_hash", "")

    if not all([sig_id, com_id, agent_id, encrypted_hash]):
        raise HTTPException(
            status_code=422,
            detail=(
                "QR code détecté mais incomplet. "
                "Champs manquants : sig_id, com_id, agent_id ou encrypted_hash. "
                "Ce document n'a peut-être pas été signé par SHIELD."
            ),
        )

    # ── Récupérer entités en base ────────────────────────────────────────────
    sig_record = db.query(Signature).filter(Signature.id_signature == sig_id).first()
    communique  = db.query(Communique).filter(Communique.id_communique == com_id).first()
    agent_user  = db.query(Utilisateur).filter(Utilisateur.id_utilisateur == agent_id).first()
    agent_info  = db.query(AgentOfficiel).filter(AgentOfficiel.id_utilisateur == agent_id).first()

    document_info = {
        "sig_id":         sig_id,
        "com_id":         com_id,
        "titre":          communique.titre if communique else "Inconnu",
        "date_signature": sig_record.date_signature.isoformat() if sig_record else qr_dict.get("ts", ""),
        "algorithme":     qr_dict.get("algo", "RSA-PSS-SHA256"),
        "signe_par":      f"{agent_user.prenom} {agent_user.nom}" if agent_user else "Inconnu",
        "institution":    agent_info.id_institution if agent_info else "",
        "fonction":       agent_info.fonction if agent_info else "",
        "qr_detecte":     True,
        "qr_position":    qr_coords,
    }

    # ════════════════════════════════════════════════════════════════════════
    # NIVEAU 1 — Vérification cryptographique RSA-PSS
    # ════════════════════════════════════════════════════════════════════════
    niveau1 = {
        "execute":        True,
        "valide":         False,
        "hash_reference": None,
        "detail":         "",
        "etapes":         {},
    }

    public_key = _find_public_key(db, agent_id, key_fp)
    niveau1["etapes"]["cle_trouvee"] = public_key is not None

    if not public_key:
        niveau1["detail"] = "Clé publique de l'agent introuvable en base de données."
    elif not communique:
        niveau1["detail"] = "Communiqué introuvable en base de données."
    else:
        try:
            sig_bytes   = base64.b64decode(encrypted_hash)
            # hash_orig   = hashlib.sha256(OCRService.normalize(communique.contenu).encode("utf-8")).digest()
            contenu_ref = communique.contenu_normalise or OCRService.normalize(communique.contenu)
            hash_orig = hashlib.sha256(contenu_ref.encode("utf-8")).digest()
            hash_orig_b64 = base64.b64encode(hash_orig).decode()
            niveau1["hash_reference"] = hash_orig_b64

            try:
                public_key.verify(sig_bytes, hash_orig, RSA_PADDING, hashes.SHA256())
                niveau1["valide"] = True
                niveau1["etapes"]["rsa_verify"] = True
                niveau1["detail"] = (
                    "✅ Signature cryptographique authentique. "
                    "L'agent a bien signé ce document avec sa clé privée."
                )
            except InvalidSignature:
                niveau1["etapes"]["rsa_verify"] = False
                niveau1["detail"] = (
                    "❌ Signature cryptographique invalide. "
                    "La signature du QR ne correspond pas à la clé publique de l'agent. "
                    "Le QR code a peut-être été falsifié."
                )
        except Exception as e:
            niveau1["detail"] = f"Erreur technique lors de la vérification RSA : {str(e)}"

    # ════════════════════════════════════════════════════════════════════════
    # ÉTAPE OCR — Extraction du texte en masquant la zone QR
    # ════════════════════════════════════════════════════════════════════════
    texte_scan = ""
    ocr_info   = {"zone_qr_masquee": False, "chars_extraits": 0}

    if niveau1["valide"]:
        # Use masked OCR that removes the QR zone and applies fallbacks
        try:
            texte_scan = extract_text_without_qr(file_bytes, file.filename, qr_coords)
        except Exception as e:
            logger.warning(f"extract_text_without_qr failed: {e}")
            # fallback to the generic OCRService
            try:
                texte_scan = OCRService.extract_text(file_bytes, file.filename)
            except Exception as e2:
                logger.error(f"Fallback OCRService.extract_text failed: {e2}")
                texte_scan = ""
        ocr_info["zone_qr_masquee"] = qr_coords is not None
        ocr_info["chars_extraits"]  = len(texte_scan)

    # ════════════════════════════════════════════════════════════════════════
    # NIVEAU 2 — Comparaison hash OCR vs hash original
    # ════════════════════════════════════════════════════════════════════════
    niveau2 = {
        "execute":          False,
        "valide":           False,
        "detail":           "",
        "similarite_hash":  None,
        "ocr_info":         ocr_info,
    }

    if niveau1["valide"] and texte_scan.strip():
        niveau2["execute"] = True
        # hash_scan     = hashlib.sha256(OCRService.normalize(texte_scan).encode("utf-8")).digest()
        # Ensure we compute hash from OCR that had QR zone masked
        try:
            texte_extrait = extract_text_without_qr(file_bytes, file.filename, qr_coords)
        except Exception:
            texte_extrait = texte_scan
        hash_scan = hashlib.sha256(
        OCRService.normalize(texte_extrait).encode("utf-8")
        ).digest()
        hash_scan_b64 = base64.b64encode(hash_scan).decode()

        if hash_scan_b64 == niveau1["hash_reference"]:
            niveau2["valide"]          = True
            niveau2["similarite_hash"] = 100.0
            niveau2["detail"] = (
                "✅ Le hash du contenu extrait correspond exactement "
                "au hash du document original signé."
            )
        else:
            niveau2["valide"] = False
            niveau2["detail"] = (
                "⚠️ Le hash du scan ne correspond pas exactement au hash original. "
                "Cela peut être dû à la qualité du scan (résolution, angle, bruit). "
                "Analyse textuelle fine en cours (Niveau 3)..."
            )

    elif niveau1["valide"] and not texte_scan.strip():
        niveau2["execute"] = True
        niveau2["detail"]  = (
            "Impossible d'extraire le texte du document. "
            "Vérifiez que le scan est lisible (résolution ≥ 150 dpi recommandé)."
        )

    # ════════════════════════════════════════════════════════════════════════
    # NIVEAU 3 — Diff textuel fin
    # ════════════════════════════════════════════════════════════════════════
    niveau3 = {"execute": False, "valide": False, "detail": "", "diff": None}

    if (
        niveau2["execute"]
        and not niveau2["valide"]
        and texte_scan.strip()
        and communique
        and communique.contenu
    ):
        niveau3["execute"] = True
        try:
            diff = _compute_diff(communique.contenu, texte_scan)
            niveau3["diff"] = diff
            sim = diff["similarite_pct"]

            if sim >= 98.0:
                niveau3["valide"] = True
                niveau3["detail"] = (
                    f"✅ Similarité très haute ({sim}%). "
                    f"Les {diff['nb_anomalies']} différence(s) sont probablement "
                    f"dues à la dégradation du scan. Document considéré authentique."
                )
            elif sim >= 90.0:
                niveau3["valide"] = False
                niveau3["detail"] = (
                    f"⚠️ Similarité moyenne ({sim}%). "
                    f"{diff['nb_anomalies']} anomalie(s) détectée(s). "
                    f"Des modifications significatives ont peut-être été apportées."
                )
            else:
                niveau3["valide"] = False
                niveau3["detail"] = (
                    f"❌ Similarité faible ({sim}%). "
                    f"{diff['nb_anomalies']} anomalie(s) détectée(s). "
                    f"Le contenu présente des écarts majeurs avec l'original. "
                    f"Altération probable."
                )
        except Exception as e:
            niveau3["detail"] = f"Erreur lors de l'analyse textuelle : {str(e)}"

    # ════════════════════════════════════════════════════════════════════════
    # VERDICT GLOBAL
    # ════════════════════════════════════════════════════════════════════════
    if not niveau1["valide"]:
        verdict = {
            "code":      "FALSIFIE",
            "label":     "❌ Document non authentique",
            "couleur":   "rouge",
            "detail":    "La signature cryptographique est invalide. Ce document n'a pas été signé par l'agent mentionné, ou le QR code a été altéré.",
            "confiance": 0,
        }
    elif not niveau2["execute"]:
        verdict = {
            "code":      "AUTHENTIQUE_QR",
            "label":     "✅ Signature authentique",
            "couleur":   "vert",
            "detail":    "La signature cryptographique est valide.",
            "confiance": 85,
        }
    elif niveau2["valide"]:
        verdict = {
            "code":      "AUTHENTIQUE_COMPLET",
            "label":     "✅ Document authentique et intègre",
            "couleur":   "vert",
            "detail":    "La signature cryptographique est valide ET le contenu correspond exactement à l'original signé.",
            "confiance": 100,
        }
    elif niveau3["execute"] and niveau3["valide"]:
        sim = niveau3["diff"]["similarite_pct"] if niveau3["diff"] else 0
        verdict = {
            "code":      "AUTHENTIQUE_SCAN_DEGRADE",
            "label":     f"✅ Document authentique (scan dégradé — {sim}%)",
            "couleur":   "orange",
            "detail":    f"Signature valide. Légères imperfections OCR ({sim}% de similarité), probablement dues au scan.",
            "confiance": int(sim),
        }
    elif niveau3["execute"] and not niveau3["valide"]:
        sim = niveau3["diff"]["similarite_pct"] if niveau3["diff"] else 0
        verdict = {
            "code":      "SUSPECT" if sim >= 90 else "ALTERE",
            "label":     f"⚠️ Suspect ({sim}%)" if sim >= 90 else f"❌ Contenu altéré ({sim}%)",
            "couleur":   "orange" if sim >= 90 else "rouge",
            "detail":    f"Signature valide mais contenu divergent ({sim}% de similarité). Consultez le détail des anomalies.",
            "confiance": int(sim),
        }
    else:
        verdict = {
            "code":      "INCONNU",
            "label":     "⚠️ Vérification incomplète",
            "couleur":   "gris",
            "detail":    "Impossible de compléter la vérification. Essayez avec un scan de meilleure qualité.",
            "confiance": 0,
        }

    return {
        "document_info": document_info,
        "niveau1":       niveau1,
        "niveau2":       niveau2,
        "niveau3":       niveau3,
        "verdict":       verdict,
    }
