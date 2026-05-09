"""
jwt_utils.py — Gestion des tokens JWT pour FastAPI
==================================================
Utilisé par : login.py, keys.py, etc.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.core.config import settings


# ===================================================================
# Configuration JWT (chargée depuis .env)
# ===================================================================
SECRET_KEY = settings.JWT_SECRET_KEY
ALGORITHM = getattr(settings, "JWT_ALGORITHM", "HS256")

if not SECRET_KEY:
    raise ValueError("❌ JWT_SECRET_KEY n'est pas définie dans le fichier .env")

security = HTTPBearer()


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Crée un token JWT"""
    to_encode = data.copy()

    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire, "iat": datetime.utcnow()})

    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Décode et vérifie un token JWT"""
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> Dict[str, Any]:
    """
    Dépendance FastAPI utilisée dans keys.py et toutes les routes protégées.
    Retourne le payload du token.
    """
    token = credentials.credentials

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide ou expiré",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return payload