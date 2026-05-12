"""
login.py - Routes d'authentification avec 2FA
"""

from datetime import datetime
from fastapi import HTTPException, Depends, APIRouter
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional

from app.core.database import get_db
from app.core.jwt_utils import decode_access_token
from app.services.auth_service import AuthService, authenticate_user, verify_2fa_code
from app.schemas.schemas import BackupCodesResponse, Enable2FAResponse, LoginRequest, LoginResponse, Verify2FARequest, Verify2FAResponse

router = APIRouter(prefix='/auth', tags=['AUTHENTIFICATION'])
security = HTTPBearer()


class RequestEmail2FARequest(BaseModel):
    temp_token: str = Field(..., description="Token temporaire reçu au login")


class Verify2FAWithEmailRequest(BaseModel):
    temp_token: str = Field(..., description="Token temporaire")
    code_2fa: str = Field(..., min_length=6, max_length=6)
    use_email: bool = Field(default=False)


class Disable2FARequest(BaseModel):
    code_2fa: Optional[str] = Field(None, min_length=6, max_length=6)


class Status2FAResponse(BaseModel):
    enabled: bool
    activated_at: Optional[datetime] = None


@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    success, message, token, user_id, extra = auth_service.login(request.email, request.mot_de_passe)
    if not success:
        raise HTTPException(status_code=401, detail=message)
    requires_2fa = extra.get("requires_2fa", False) if extra else False
    return LoginResponse(
        success=True, message=message, access_token=token,
        token_type="temp" if requires_2fa else "bearer",
        id_utilisateur=user_id, requires_2fa=requires_2fa
    )


@router.post("/2fa/request-email")
def request_email_2fa(request: RequestEmail2FARequest, db: Session = Depends(get_db)):
    payload = decode_access_token(request.temp_token)
    if not payload or not payload.get("temp", False):
        raise HTTPException(status_code=401, detail="Token invalide")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Utilisateur non identifié")
    auth_service = AuthService(db)
    success, message = auth_service.request_email_2fa(user_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message}


@router.post("/verify-2fa", response_model=Verify2FAResponse)
def verify_2fa(request: Verify2FAWithEmailRequest, db: Session = Depends(get_db)):
    auth_service = AuthService(db)
    success, message, final_token, user_id = auth_service.verify_2fa_with_email_option(
        request.temp_token, request.code_2fa, request.use_email
    )
    if not success:
        raise HTTPException(status_code=401, detail=message)
    return Verify2FAResponse(
        success=True, message=message, access_token=final_token,
        token_type="bearer", id_utilisateur=user_id, expires_in=1800
    )


@router.post("/2fa/enable", response_model=Enable2FAResponse)
def enable_2fa(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Utilisateur non identifié")
    auth_service = AuthService(db)
    success, message, secret, qr_code = auth_service.enable_2fa(user_id)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return Enable2FAResponse(success=True, message=message, secret=secret, qr_code=qr_code)


@router.post("/2fa/disable")
def disable_2fa(request: Disable2FARequest, credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Utilisateur non identifié")
    auth_service = AuthService(db)
    success, message = auth_service.disable_2fa(user_id, request.code_2fa)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message}


@router.get("/2fa/status", response_model=Status2FAResponse)
def get_2fa_status(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Utilisateur non identifié")
    auth_service = AuthService(db)
    status = auth_service.get_2fa_status(user_id)
    return Status2FAResponse(enabled=status["enabled"], activated_at=status.get("activated_at"))


@router.get("/me")
def get_me(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    from app.models.models import Utilisateur
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    user_id = payload.get("sub")
    user = db.query(Utilisateur).filter(Utilisateur.id_utilisateur == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")
    return {
        "id_utilisateur": user.id_utilisateur,
        "nom": user.nom,
        "prenom": user.prenom,
        "email": user.email,
        "role": payload.get("role"),
        "has_2fa": payload.get("has_2fa", False),
        "date_creation": user.date_creation
    }


@router.post("/2fa/backup-codes", response_model=BackupCodesResponse)
def generate_backup_codes(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    import secrets
    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    backup_codes = [secrets.token_hex(4).upper() for _ in range(10)]
    return BackupCodesResponse(backup_codes=backup_codes)
