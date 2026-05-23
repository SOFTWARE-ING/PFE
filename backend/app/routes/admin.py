"""
admin.py — Routes du Panneau Administrateur
==========================================
Toutes les routes /api/admin/* — protégées par JWT + vérification de rôle admin.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.jwt_utils import get_current_user
from app.models.models import Administrateur
from app.services.admin_service import AdminService, SUPER_ADMIN, ADMIN_SYSTEME
from app.services.password_reset_service import PasswordResetService

router = APIRouter(prefix="/admin", tags=["Administration"])


# ── Dépendance : vérification rôle admin ─────────────────────────────────────

def require_admin(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Vérifie que l'utilisateur est bien un administrateur (tous niveaux)."""
    if current_user.get("role") != "administrateur":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé aux administrateurs.",
        )
    return current_user


def require_admin_systeme(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Vérifie que l'utilisateur est ADMIN_SYSTEME ou SUPER_ADMIN."""
    if current_user.get("role") != "administrateur":
        raise HTTPException(status_code=403, detail="Accès refusé.")
    admin = db.query(Administrateur).filter(
        Administrateur.id_utilisateur == current_user["sub"]
    ).first()
    if not admin or admin.niveau_habilitation not in {SUPER_ADMIN, ADMIN_SYSTEME}:
        raise HTTPException(status_code=403, detail="Niveau d'habilitation insuffisant.")
    return current_user


def require_super_admin(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Vérifie que l'utilisateur est SUPER_ADMIN."""
    if current_user.get("role") != "administrateur":
        raise HTTPException(status_code=403, detail="Accès refusé.")
    admin = db.query(Administrateur).filter(
        Administrateur.id_utilisateur == current_user["sub"]
    ).first()
    if not admin or admin.niveau_habilitation != SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Réservé aux SUPER_ADMIN.")
    return current_user


# ── Schémas Pydantic ──────────────────────────────────────────────────────────

class CreateAgentRequest(BaseModel):
    nom: str
    prenom: str
    email: EmailStr
    id_institution: str
    fonction: str
    departement: Optional[str] = None
    matricule: Optional[str] = None

    @field_validator("nom", "prenom", "id_institution", "fonction")
    @classmethod
    def not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Ce champ ne peut pas être vide.")
        return v.strip()


class CreateAdminRequest(BaseModel):
    nom: str
    prenom: str
    email: EmailStr
    niveau_habilitation: str = ADMIN_SYSTEME

    @field_validator("niveau_habilitation")
    @classmethod
    def valid_niveau(cls, v: str) -> str:
        if v not in {SUPER_ADMIN, ADMIN_SYSTEME, "ADMIN_SECURITE"}:
            raise ValueError("Niveau d'habilitation invalide.")
        return v


class AdminResetPasswordRequest(BaseModel):
    target_user_id: str


# ── Endpoints : Création ──────────────────────────────────────────────────────

@router.post(
    "/users/agent",
    summary="Créer un compte Agent Officiel",
    description=(
        "ADMIN_SYSTEME ou SUPER_ADMIN uniquement. "
        "Le token est désactivé par défaut, le 2FA est activé automatiquement. "
        "Les identifiants sont envoyés par email à l'agent."
    ),
)
async def create_agent(
    payload: CreateAgentRequest,
    current_user: dict = Depends(require_admin_systeme),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    success, message, data = service.create_agent(
        admin_id=current_user["sub"],
        nom=payload.nom,
        prenom=payload.prenom,
        email=str(payload.email),
        id_institution=payload.id_institution,
        fonction=payload.fonction,
        departement=payload.departement,
        matricule=payload.matricule,
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message, "user": data}


@router.post(
    "/users/admin",
    summary="Créer un compte Administrateur",
    description="SUPER_ADMIN uniquement.",
)
async def create_admin(
    payload: CreateAdminRequest,
    current_user: dict = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    success, message, data = service.create_admin(
        actor_id=current_user["sub"],
        nom=payload.nom,
        prenom=payload.prenom,
        email=str(payload.email),
        niveau_habilitation=payload.niveau_habilitation,
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message, "user": data}


# ── Endpoints : Contrôle d'accès ──────────────────────────────────────────────

@router.patch(
    "/users/{user_id}/toggle-access",
    summary="Activer / Bloquer le token d'accès d'un utilisateur",
    description="Interdit sur les SUPER_ADMIN. ADMIN_SYSTEME ou SUPER_ADMIN requis.",
)
async def toggle_access(
    user_id: str,
    current_user: dict = Depends(require_admin_systeme),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    success, message, new_state = service.toggle_access_token(
        actor_id=current_user["sub"],
        target_user_id=user_id,
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message, "token_autorise": new_state}


@router.patch(
    "/users/{user_id}/toggle-2fa",
    summary="Activer / Désactiver le 2FA d'un utilisateur",
    description="Interdit sur les SUPER_ADMIN. ADMIN_SYSTEME ou SUPER_ADMIN requis.",
)
async def toggle_2fa(
    user_id: str,
    current_user: dict = Depends(require_admin_systeme),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    success, message, new_state = service.toggle_2fa(
        actor_id=current_user["sub"],
        target_user_id=user_id,
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message, "deux_fa_actif": new_state}


@router.post(
    "/users/{user_id}/reset-password",
    summary="Réinitialiser le mot de passe d'un utilisateur (admin)",
    description="Génère un mot de passe temporaire et l'envoie par email.",
)
async def admin_reset_password(
    user_id: str,
    current_user: dict = Depends(require_admin_systeme),
    db: Session = Depends(get_db),
):
    service = PasswordResetService(db)
    success, message, generated = service.admin_reset_password(
        target_user_id=user_id,
        admin_id=current_user["sub"],
    )
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message}


# ── Endpoints : Liste & Recherche ─────────────────────────────────────────────

@router.get(
    "/users",
    summary="Lister tous les utilisateurs avec filtres et pagination",
)
async def list_users(
    search: Optional[str] = Query(None, description="Recherche nom, prénom, email"),
    role: Optional[str] = Query(None, description="Filtrer par rôle"),
    token_autorise: Optional[bool] = Query(None, description="Filtrer par statut d'accès"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    success, message, data = service.list_users(
        actor_id=current_user["sub"],
        search=search,
        role_filter=role,
        token_filter=token_autorise,
        page=page,
        limit=limit,
    )
    if not success:
        raise HTTPException(status_code=403, detail=message)
    return {"success": True, **data}


@router.get(
    "/users/active-sessions",
    summary="Utilisateurs avec une session active",
)
async def active_sessions(
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    success, message, data = service.list_active_sessions(actor_id=current_user["sub"])
    if not success:
        raise HTTPException(status_code=403, detail=message)
    return {"success": True, "sessions": data, "total": len(data)}


# ── Endpoints : Logs & Stats ──────────────────────────────────────────────────

@router.get(
    "/logs",
    summary="Logs d'audit centralisés (tous les utilisateurs)",
)
async def get_logs(
    user_id: Optional[str] = Query(None),
    action: Optional[str] = Query(None),
    succes: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    success, message, data = service.get_logs(
        actor_id=current_user["sub"],
        user_id_filter=user_id,
        action_filter=action,
        succes_filter=succes,
        page=page,
        limit=limit,
    )
    if not success:
        raise HTTPException(status_code=403, detail=message)
    return {"success": True, **data}


@router.get(
    "/stats",
    summary="Statistiques globales de la plateforme",
)
async def get_stats(
    current_user: dict = Depends(require_admin),
    db: Session = Depends(get_db),
):
    service = AdminService(db)
    success, message, data = service.get_stats(actor_id=current_user["sub"])
    if not success:
        raise HTTPException(status_code=403, detail=message)
    return {"success": True, **data}
