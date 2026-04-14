"""
keys.py — Endpoints pour la gestion des clés cryptographiques
===========================================================
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.key_service import KeyService
from app.schemas.schemas import CleCryptographiqueResponse
from app.core.jwt_utils import get_current_user

from app.core.jwt_utils import get_current_user

# ==================== CORRECTION ICI ====================
router = APIRouter(
    prefix="/keys",                    # reste comme ça
    tags=["CLÉS CRYPTOGRAPHIQUES"]
)


@router.post("/generate", response_model=CleCryptographiqueResponse)
def generate_keys(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Génère une nouvelle paire de clés RSA"""
    
    # Correction du rôle (accepte plusieurs formats)
    role = current_user.get("role", "").lower().replace(" ", "_")
    
    if role != "agent_officiel":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Seuls les agents officiels peuvent générer des clés"
        )

    key_service = KeyService(db)
    nouvelle_cle = key_service.generate_keys(current_user["sub"])

    return nouvelle_cle


@router.post("/renew", response_model=CleCryptographiqueResponse)
def renew_keys(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Renouvelle les clés"""
    
    role = current_user.get("role", "").lower().replace(" ", "_")
    
    if role != "agent_officiel":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé"
        )

    key_service = KeyService(db)
    nouvelle_cle = key_service.renew_keys(current_user["sub"])

    return nouvelle_cle


@router.get("/my-keys", response_model=list[CleCryptographiqueResponse])
def get_my_keys(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """Liste toutes les clés de l'agent connecté."""
    from app.models.models import CleCryptographique

    keys = (
        db.query(CleCryptographique)
        .filter(CleCryptographique.id_agent_officiel == current_user["sub"])
        .all()
    )
    return keys
