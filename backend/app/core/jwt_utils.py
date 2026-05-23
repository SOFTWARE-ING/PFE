"""
jwt_utils.py — Gestion JWT + middleware de contrôle d'accès
============================================================
NOUVEAUTÉ v3 :
  - get_current_user vérifie token_autorise en base
  - Mise à jour derniere_connexion + session_token_hash au login
"""

import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db

SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM  = getattr(settings, "JWT_ALGORITHM", "HS256")

if not SECRET_KEY:
    raise ValueError("JWT_SECRET_KEY n'est pas définie dans .env")

security = HTTPBearer()


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


def _hash_token(token: str) -> str:
    """SHA256 du token pour stocker en base sans stocker le token brut."""
    return hashlib.sha256(token.encode()).hexdigest()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Dépendance FastAPI.
    1. Décode le JWT.
    2. Vérifie que ce n'est pas un token temporaire (2FA).
    3. Vérifie que token_autorise == True en base.
    Retourne le payload du token si tout est valide.
    """
    token = credentials.credentials

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Refuser les tokens temporaires (2FA en cours)
    if payload.get("temp"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentification incomplète. Code 2FA requis.",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token sans identité utilisateur.")

    # ── Vérification token_autorise en base ──────────────────────────────────
    # Import différé pour éviter les imports circulaires
    from app.models.models import Utilisateur

    utilisateur = db.query(Utilisateur).filter(
        Utilisateur.id_utilisateur == user_id
    ).first()

    if not utilisateur:
        raise HTTPException(status_code=401, detail="Utilisateur introuvable.")

    if not utilisateur.token_autorise:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé. Votre compte est en attente d'activation par un administrateur.",
        )

    return payload


def update_session(db: Session, user_id: str, token: str):
    """
    Met à jour derniere_connexion et session_token_hash.
    À appeler après un login réussi (final token émis).
    """
    from app.models.models import Utilisateur

    utilisateur = db.query(Utilisateur).filter(
        Utilisateur.id_utilisateur == user_id
    ).first()
    if utilisateur:
        utilisateur.derniere_connexion = datetime.now()
        utilisateur.session_token_hash = _hash_token(token)
        db.commit()


def clear_session(db: Session, user_id: str):
    """Efface la session active (logout ou blocage)."""
    from app.models.models import Utilisateur

    utilisateur = db.query(Utilisateur).filter(
        Utilisateur.id_utilisateur == user_id
    ).first()
    if utilisateur:
        utilisateur.session_token_hash = None
        db.commit()
