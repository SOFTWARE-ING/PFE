"""
login.py - Routes d'authentification avec 2FA
==============================================
Ce fichier contient TOUS les endpoints d'authentification :
1. Login classique (email + mot de passe)
2. Vérification 2FA (Google Authenticator)
3. Activation / désactivation du 2FA
4. Statut du 2FA
"""

from datetime import datetime

from fastapi import HTTPException, Depends, APIRouter, Header
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.services.auth_service import AuthService, authenticate_user, verify_2fa_code
from app.schemas.schemas import BackupCodesResponse, Enable2FAResponse, LoginRequest, LoginResponse, Verify2FARequest, Verify2FAResponse


router = APIRouter(prefix='/auth', tags=['AUTHENTIFICATION'])


class RequestEmail2FARequest(BaseModel):
    """Requête pour demander un code 2FA par email."""
    temp_token: str = Field(..., description="Token temporaire reçu au login")


class Verify2FAWithEmailRequest(BaseModel):
    """Vérification 2FA avec option email."""
    temp_token: str = Field(..., description="Token temporaire")
    code_2fa: str = Field(..., min_length=6, max_length=6)
    use_email: bool = Field(default=False, description="True si code reçu par email")
# ============================================================================
# 1. ENDPOINT DE LOGIN CLASSIQUE (avec support 2FA)
# ============================================================================

@router.post("/login", response_model=LoginResponse)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    ÉTAPE 1 : Authentification avec email + mot de passe.
    
    DEUX CAS POSSIBLES :
    
    CAS 1 - 2FA NON activé :
        Réponse directe avec le token JWT final.
        {
            "success": true,
            "message": "Connexion réussie",
            "access_token": "eyJhbGciOiJIUzI1NiIs...",
            "token_type": "bearer",
            "id_utilisateur": "uuid",
            "requires_2fa": false
        }
    
    CAS 2 - 2FA activé :
        Réponse avec un token TEMPORAIRE (valable 5 minutes).
        L'on doit ensuite appeler /auth/verify-2fa.
        {
            "success": true,
            "message": "Code 2FA requis",
            "access_token": "temp_token_5_minutes",
            "token_type": "temp",
            "id_utilisateur": "uuid",
            "requires_2fa": true
        }
    
    CAS 3 - Erreur :
        {
            "success": false,
            "message": "Email ou mot de passe incorrect"
        }
    """
    auth_service = AuthService(db)
    success, message, token, user_id, extra = auth_service.login(
        request.email, 
        request.mot_de_passe
    )
    
    if not success:
        raise HTTPException(status_code=401, detail=message)
    
    # Vérifie si le 2FA est requis
    requires_2fa = extra.get("requires_2fa", False) if extra else False
    
    return LoginResponse(
        success=True,
        message=message,
        access_token=token,
        token_type="temp" if requires_2fa else "bearer",
        id_utilisateur=user_id,
        requires_2fa=requires_2fa
    )


# ============================================================================
# 2. ENDPOINT DE VÉRIFICATION 2FA
# ============================================================================



@router.post("/2fa/request-email")
def request_email_2fa(request: RequestEmail2FARequest, db: Session = Depends(get_db)):
    """
    Demande l'envoi du code 2FA par email.
    
    À utiliser quand l'utilisateur n'a pas Google Authenticator sous la main.
    """
    from app.core.jwt_utils import decode_access_token
    
    # Décode le token temporaire
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
    
    return {
        "success": True,
        "message": message
    }



@router.post("/verify-2fa", response_model=Verify2FAResponse)
def verify_2fa(request: Verify2FAWithEmailRequest, db: Session = Depends(get_db)):
    """
    ÉTAPE 2 : Vérification du code 2FA (Google Auth OU Email).
    
    Requête :
        {
            "temp_token": "token_temp",
            "code_2fa": "123456",
            "use_email": false  // false = Google Auth, true = Email
        }
    """
    auth_service = AuthService(db)
    success, message, final_token, user_id = auth_service.verify_2fa_with_email_option(
        request.temp_token,
        request.code_2fa,
        request.use_email
    )
    
    if not success:
        raise HTTPException(status_code=401, detail=message)
    
    return Verify2FAResponse(
        success=True,
        message=message,
        access_token=final_token,
        token_type="bearer",
        id_utilisateur=user_id,
        expires_in=1800
    )

# ============================================================================
# 3. ENDPOINTS DE GESTION DU 2FA (pour utilisateur connecté)
# ============================================================================


@router.post("/2fa/enable", response_model=Enable2FAResponse)
def enable_2fa(
    authorization: str = Header(..., alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    Active le 2FA avec Google Authenticator pour l'utilisateur connecté.
    
    En-tête requis :
        Authorization: Bearer <token_jwt>
    
    Réponse :
        {
            "success": true,
            "message": "2FA activé avec succès",
            "secret": "JBSWY3DPEHPK3PXP",
            "qr_code": "data:image/png;base64,iVBORw0KG...",
            "instruction": "Scannez ce QR code avec Google Authenticator"
        }
    
    L'utilisateur doit ensuite :
        1. Scanner le QR code avec Google Authenticator
        2. Garder le secret en lieu sûr (codes de secours)
    """
    from app.core.jwt_utils import decode_access_token
    
    # Extrait le token (enlève "Bearer ")
    token = authorization
    if token.startswith("Bearer "):
        token = token[7:]
    
    # Vérifie le token
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Utilisateur non identifié")
    
    # Active le 2FA
    auth_service = AuthService(db)
    success, message, secret, qr_code = auth_service.enable_2fa(user_id)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return Enable2FAResponse(
        success=True,
        message=message,
        secret=secret,
        qr_code=qr_code
    )


class Disable2FARequest(BaseModel):
    """Requête pour désactiver le 2FA."""
    code_2fa: Optional[str] = Field(None, min_length=6, max_length=6, description="Code 2FA (optionnel mais recommandé)")


@router.post("/2fa/disable")
def disable_2fa(
    request: Disable2FARequest,
    authorization: str = Header(..., alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    Désactive le 2FA pour l'utilisateur connecté.
    
    En-tête requis :
        Authorization: Bearer <token_jwt>
    
    Corps (optionnel mais recommandé) :
        {
            "code_2fa": "123456"  # Vérifie le code avant désactivation
        }
    """
    from app.core.jwt_utils import decode_access_token
    
    token = authorization
    if token.startswith("Bearer "):
        token = token[7:]
    
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Utilisateur non identifié")
    
    auth_service = AuthService(db)
    success, message = auth_service.disable_2fa(user_id, request.code_2fa)
    
    if not success:
        raise HTTPException(status_code=400, detail=message)
    
    return {
        "success": True,
        "message": message
    }


class Status2FAResponse(BaseModel):
    """Réponse pour le statut du 2FA."""
    enabled: bool
    activated_at: Optional[datetime] = None


@router.get("/2fa/status", response_model=Status2FAResponse)
def get_2fa_status(
    authorization: str = Header(..., alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    Vérifie si le 2FA est activé pour l'utilisateur connecté.
    
    En-tête requis :
        Authorization: Bearer <token_jwt>
    
    Réponse :
        {
            "enabled": true,
            "activated_at": "2024-01-15T10:30:00"
        }
    """
    from app.core.jwt_utils import decode_access_token
    
    token = authorization
    if token.startswith("Bearer "):
        token = token[7:]
    
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Utilisateur non identifié")
    
    auth_service = AuthService(db)
    status = auth_service.get_2fa_status(user_id)
    
    return Status2FAResponse(
        enabled=status["enabled"],
        activated_at=status.get("activated_at")
    )


# ============================================================================
# 4. ENDPOINT DE TEST (optionnel)
# ============================================================================

@router.get("/me")
def get_current_user_info(
    authorization: str = Header(..., alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    Retourne les informations de l'utilisateur connecté.
    Utile pour tester que le token fonctionne.
    
    En-tête requis :
        Authorization: Bearer <token_jwt>
    """
    from app.core.jwt_utils import decode_access_token
    from app.models.models import Utilisateur
    
    token = authorization
    if token.startswith("Bearer "):
        token = token[7:]
    
    payload = decode_access_token(token)
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


# ============================================================================
# 5. ENDPOINT DE RÉCUPÉRATION (codes de secours - optionnel)
# ============================================================================


@router.post("/2fa/backup-codes", response_model=BackupCodesResponse)
def generate_backup_codes(
    authorization: str = Header(..., alias="Authorization"),
    db: Session = Depends(get_db)
):
    """
    Génère des codes de secours à usage unique (optionnel).
    À utiliser si l'utilisateur perd l'accès à Google Authenticator.
    
    En-tête requis :
        Authorization: Bearer <token_jwt>
    """
    from app.core.jwt_utils import decode_access_token
    import secrets
    
    token = authorization
    if token.startswith("Bearer "):
        token = token[7:]
    
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")
    
    user_id = payload.get("sub")
    
    # Génère 10 codes de secours de 8 caractères
    backup_codes = [secrets.token_hex(4).upper() for _ in range(10)]
    
    # TODO: Stocker les codes de secours en base de données
    # (créer une table backup_codes si nécessaire)
    
    return BackupCodesResponse(backup_codes=backup_codes)