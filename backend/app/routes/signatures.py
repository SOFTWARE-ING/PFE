"""
signatures.py — Endpoints de Signature Numérique SHIELD
========================================================
Routes API pour :
- Signer un communiqué
- Vérifier une signature
- Valider l'intégrité d'un document
- Dashboard des signatures agent
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.jwt_utils import get_current_user
from app.services.signature_service import SignatureService
from app.schemas.schemas import (
    SignatureResponse, 
    SignatureVerifyResponse,
    AgentOfficielSummary
)
from app.models.models import Signature, Communique


router = APIRouter(
    prefix="/signatures",
    tags=["SIGNATURES NUMÉRIQUES"]
)


# ============================================================
# SCHÉMAS SPÉCIFIQUES À LA SIGNATURE
# ============================================================

class SignRequest(BaseModel):
    """Requête pour signer un communiqué."""
    communique_id: str = Field(
        ..., 
        min_length=36, 
        max_length=36,
        description="UUID du communiqué à signer"
    )
    commentaire: str | None = Field(
        None, 
        max_length=500,
        description="Commentaire optionnel (enregistré dans les logs)"
    )


class SignResponse(BaseModel):
    """Réponse après signature."""
    success: bool
    message: str
    signature_id: str | None = None
    signature_value: str | None = None
    hash_document: str | None = None
    timestamp: str | None = None
    verified: bool | None = None


class VerifyRequest(BaseModel):
    """Requête de vérification de signature."""
    signature_id: str = Field(..., min_length=36, max_length=36)


class VerifyResponse(BaseModel):
    """Réponse de vérification."""
    success: bool
    message: str
    signature_id: str | None = None
    verified: bool | None = None
    hash_document: str | None = None
    details: str | None = None


class IntegrityResponse(BaseModel):
    """Réponse de validation d'intégrité complète."""
    communique_id: str
    titre: str
    statut: str
    total_signatures: int
    valid_signatures: int
    integrity_verified: bool
    details: list[dict]


class SignatureListItem(BaseModel):
    """Item pour la liste des signatures."""
    id_signature: str
    id_communique: str
    titre_communique: str
    date_signature: str
    est_valide: bool
    algorithme: str


# ============================================================
# 1. SIGNER UN COMMUNIQUÉ
# ============================================================

@router.post(
    "/sign",
    response_model=SignResponse,
    summary="✍️ Signer un communiqué officiel",
    description="""
    Appose une signature numérique RSA-PSS sur un communiqué.
    
    **Prérequis :**
    - Être un Agent Officiel authentifié
    - Avoir généré une clé cryptographique active
    - Le communiqué doit être en statut BROUILLON ou PUBLIE
    
    **Processus :**
    1. Vérifie l'identité de l'agent
    2. Récupère sa clé privée active
    3. Calcule le hash SHA256 du document
    4. Signe avec RSA-2048-PSS
    5. Stocke la signature en base
    6. Passe le communiqué en PUBLIE si première signature
    """
)
def sign_communique(
    request: SignRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint de signature numérique.
    
    Header requis : Authorization: Bearer <JWT>
    """
    # 1. Vérification du rôle
    role = current_user.get("role", "").lower().replace(" ", "_")
    
    if role != "agent_officiel":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les Agents Officiels sont habilités à signer des documents"
        )
    
    agent_id = current_user["sub"]
    
    # 2. Appel du service de signature
    signature_service = SignatureService(db)
    result = signature_service.sign_communique(
        communique_id=request.communique_id,
        agent_id=agent_id
    )
    
    # 3. Gestion des erreurs métier
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.message
        )
    
    # 4. Réponse formatée
    return SignResponse(
        success=True,
        message=f"✅ {result.message}",
        signature_id=result.signature_id,
        signature_value=result.signature_value,
        hash_document=result.hash_document,
        timestamp=result.timestamp.isoformat() if result.timestamp else None,
        verified=result.verified
    )


# ============================================================
# 2. VÉRIFIER UNE SIGNATURE
# ============================================================

@router.post(
    "/verify",
    response_model=VerifyResponse,
    summary="Vérifier une signature",
    description="""
    Vérifie la validité cryptographique d'une signature existante.
    
    **Vérifications effectuées :**
    - La signature correspond au contenu actuel du document
    - La clé publique de l'agent correspond à la signature
    - Le document n'a pas été modifié depuis la signature
    
    **Résultat :** `verified: true` si le document est authentique et intact.
    """
)
def verify_signature(
    request: VerifyRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Endpoint de vérification de signature.
    Accessible à tous les utilisateurs authentifiés.
    """
    signature_service = SignatureService(db)
    result = signature_service.verify_signature(request.signature_id)
    
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result.message
        )
    
    return VerifyResponse(
        success=True,
        message=result.message,
        signature_id=result.signature_id,
        verified=result.verified,
        hash_document=result.hash_document,
        details="Document authentique et intact" if result.verified else "Document可能 modifié"
    )


# ============================================================
# 3. VALIDER L'INTÉGRITÉ COMPLÈTE D'UN DOCUMENT
# ============================================================

@router.get(
    "/validate/{communique_id}",
    response_model=IntegrityResponse,
    summary="Validation complète d'intégrité",
    description="""
    Vérifie TOUTES les signatures d'un communiqué.
    
    **Retourne :**
    - Nombre total de signatures
    - Nombre de signatures valides
    - Statut global d'intégrité
    - Détail signature par signature
    
    **Usage typique :** Avant publication officielle ou audit.
    """
)
def validate_document_integrity(
    communique_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Validation complète de toutes les signatures d'un document.
    """
    signature_service = SignatureService(db)
    result = signature_service.validate_document_integrity(communique_id)
    
    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result["error"]
        )
    
    return IntegrityResponse(**result)


# ============================================================
# 4. LISTER MES SIGNATURES (AGENT CONNECTÉ)
# ============================================================

@router.get(
    "/my-signatures",
    response_model=List[SignatureListItem],
    summary="Mes signatures",
    description="Liste toutes les signatures effectuées par l'agent connecté."
)
def get_my_signatures(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    limit: int = Query(50, ge=1, le=200, description="Nombre maximum de résultats"),
    offset: int = Query(0, ge=0, description="Décalage pour pagination")
):
    """
    Retourne l'historique des signatures de l'agent connecté.
    """
    role = current_user.get("role", "").lower().replace(" ", "_")
    
    if role != "agent_officiel":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Réservé aux Agents Officiels"
        )
    
    agent_id = current_user["sub"]
    
    # Requête avec jointure pour avoir le titre du communiqué
    signatures = (
        db.query(
            Signature.id_signature,
            Signature.id_communique,
            Communique.titre.label("titre_communique"),
            Signature.date_signature,
            Signature.est_valide,
            Signature.algorithme_hachage
        )
        .join(Communique, Signature.id_communique == Communique.id_communique)
        .filter(Signature.id_agent_officiel == agent_id)
        .order_by(Signature.date_signature.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    
    return [
        SignatureListItem(
            id_signature=sig.id_signature,
            id_communique=sig.id_communique,
            titre_communique=sig.titre_communique,
            date_signature=sig.date_signature.isoformat(),
            est_valide=sig.est_valide,
            algorithme=sig.algorithme_hachage
        )
        for sig in signatures
    ]


# ============================================================
# 5. SIGNATURES D'UN COMMUNIQUÉ SPÉCIFIQUE
# ============================================================

@router.get(
    "/communique/{communique_id}",
    response_model=List[SignatureResponse],
    summary="Signatures d'un communiqué",
    description="Liste toutes les signatures apposées sur un communiqué spécifique."
)
def get_communique_signatures(
    communique_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Retourne toutes les signatures d'un communiqué donné.
    Accessible à tous les utilisateurs authentifiés.
    """
    # Vérifie que le communiqué existe
    communique = db.query(Communique).filter(
        Communique.id_communique == communique_id
    ).first()
    
    if not communique:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Communiqué introuvable"
        )
    
    signatures = (
        db.query(Signature)
        .filter(Signature.id_communique == communique_id)
        .order_by(Signature.date_signature.desc())
        .all()
    )
    
    return signatures


# ============================================================
# 6. DOCUMENTS EN ATTENTE DE MA SIGNATURE
# ============================================================

@router.get(
    "/pending",
    response_model=List[dict],
    summary="Documents en attente de signature",
    description="Liste des communiqués qui n'ont pas encore été signés par l'agent connecté."
)
def get_pending_documents(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Dashboard agent : documents nécessitant une signature.
    """
    role = current_user.get("role", "").lower().replace(" ", "_")
    
    if role != "agent_officiel":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Réservé aux Agents Officiels"
        )
    
    agent_id = current_user["sub"]
    signature_service = SignatureService(db)
    
    unsigned = signature_service.get_unsigned_communiques(agent_id)
    
    return [
        {
            "id_communique": doc.id_communique,
            "titre": doc.titre,
            "statut": doc.statut,
            "date_publication": doc.date_publication.isoformat(),
            "nb_signatures_existantes": len([
                s for s in doc.signatures if s.est_valide
            ])
        }
        for doc in unsigned
    ]


# ============================================================
# 7. STATISTIQUES DE SIGNATURE (POUR TABLEAU DE BORD)
# ============================================================

@router.get(
    "/stats",
    summary="Statistiques de signature",
    description="Statistiques globales des signatures pour l'agent connecté."
)
def get_signature_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Retourne les statistiques de signature de l'agent.
    """
    role = current_user.get("role", "").lower().replace(" ", "_")
    
    if role != "agent_officiel":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Réservé aux Agents Officiels"
        )
    
    agent_id = current_user["sub"]
    
    from sqlalchemy import func
    
    total = db.query(Signature).filter(
        Signature.id_agent_officiel == agent_id
    ).count()
    
    valides = db.query(Signature).filter(
        Signature.id_agent_officiel == agent_id,
        Signature.est_valide == True
    ).count()
    
    derniere = db.query(Signature).filter(
        Signature.id_agent_officiel == agent_id
    ).order_by(Signature.date_signature.desc()).first()
    
    return {
        "agent_id": agent_id,
        "total_signatures": total,
        "signatures_valides": valides,
        "signatures_invalides": total - valides,
        "taux_validite": f"{(valides / total * 100):.1f}%" if total > 0 else "N/A",
        "derniere_signature": derniere.date_signature.isoformat() if derniere else None,
        "algorithme": "RSA-2048-PSS / SHA256"
    }