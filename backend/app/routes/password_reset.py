"""
password_reset.py — Routes de réinitialisation du mot de passe
POST /api/auth/forgot-password  → demande de reset (tous les rôles)
POST /api/auth/reset-password   → application du nouveau MDP
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.password_reset_service import PasswordResetService

router = APIRouter(prefix="/auth", tags=["Password Reset"])


# ── Schémas ──────────────────────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Le mot de passe doit contenir au moins 8 caractères.")
        return v

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "new_password" in info.data and v != info.data["new_password"]:
            raise ValueError("Les mots de passe ne correspondent pas.")
        return v


class GenericResponse(BaseModel):
    success: bool
    message: str


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.post(
    "/forgot-password",
    response_model=GenericResponse,
    summary="Demander la réinitialisation du mot de passe",
    description=(
        "Envoie un email avec un lien de réinitialisation valable "
        "PASSWORD_RESET_EXPIRE_MINUTES minutes (défaut : 30 min). "
        "Retourne toujours le même message pour ne pas révéler l'existence du compte."
    ),
)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    service = PasswordResetService(db)
    success, message = service.request_reset(payload.email)
    # Toujours 200 pour ne pas énumérer les emails
    return GenericResponse(success=True, message=message)


@router.post(
    "/reset-password",
    response_model=GenericResponse,
    summary="Réinitialiser le mot de passe avec le token reçu par email",
)
async def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    service = PasswordResetService(db)
    success, message = service.reset_password(payload.token, payload.new_password)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return GenericResponse(success=True, message=message)
