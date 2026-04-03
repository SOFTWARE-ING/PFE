"""
jwt_utils.py - Gestion des tokens JWT (JSON Web Tokens)
========================================================
CE FICHIER SERT À :
1. Générer un token JWT après connexion réussie
2. Vérifier et décoder un token JWT reçu

C'EST QUOI UN JWT ?
C'est un "laissez-passer" sécurisé que le serveur donne au client après
connexion. Le client l'envoie dans chaque requête pour prouver son identité.

STRUCTURE D'UN JWT : xxx.yyy.zzz
- xxx : en-tête (algorithme utilisé)
- yyy : payload (les données : id utilisateur, email, rôle...)
- zzz : signature (prouve que le token n'a pas été modifié)
"""

import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from app.core.config import SecurityConfig


# def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
#     """
#     Crée un token JWT pour un utilisateur authentifié.
    
#     Exemple :
#         token = create_access_token({
#             "sub": "123e4567-e89b-12d3-a456-426614174000",
#             "email": "agent@example.com",
#             "role": "agent_officiel"
#         })
    
#     Le token contient :
#         - sub (subject) : l'ID de l'utilisateur
#         - email : l'email de l'utilisateur
#         - role : le type d'utilisateur
#         - exp : date d'expiration (obligatoire)
#         - iat : date de création (issued at)
    
#     Le token est signé avec une clé secrète (personne ne peut le falsifier)
#     """
#     # Prépare les données à mettre dans le token
#     to_encode = data.copy()
    
#     # Définit la date d'expiration
#     if expires_delta:
#         expire = datetime.now(timezone.utc) + expires_delta
#     else:
#         expire = datetime.now(timezone.utc) + timedelta(minutes=SecurityConfig.JWT_EXPIRE_MINUTES)
    
#     # Ajoute les champs standard du JWT
#     to_encode.update({
#         "exp": expire,      # expiration
#         "iat": datetime.now(timezone.utc),  # émis à
#     })
    
#     # Crée et signe le token
#     token = jwt.encode(
#         to_encode,
#         SecurityConfig.JWT_SECRET_KEY,
#         algorithm=SecurityConfig.JWT_ALGORITHM
#     )
    
#     return token

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Crée un token JWT avec expiration personnalisable.
    
    Si expires_delta est fourni, on l'utilise.
    Sinon, on utilise la valeur par défaut de la config.
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=SecurityConfig.JWT_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    })
    
    token = jwt.encode(
        to_encode,
        SecurityConfig.JWT_SECRET_KEY,
        algorithm=SecurityConfig.JWT_ALGORITHM
    )
    
    return token


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Vérifie et décode un token JWT.
    
    Exemple :
        payload = decode_access_token(token_recu)
        if payload:
            user_id = payload.get("sub")
            print(f"Utilisateur {user_id} authentifié")
    
    Vérifications automatiques :
        - La signature est-elle valide ?
        - Le token a-t-il expiré ?
        - Le format est-il correct ?
    
    Retourne le payload (données) si tout est bon, sinon None.
    """
    try:
        # Décode et vérifie le token
        payload = jwt.decode(
            token,
            SecurityConfig.JWT_SECRET_KEY,
            algorithms=[SecurityConfig.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        print("Token expiré")
        return None
    except jwt.InvalidTokenError as e:
        print(f"Token invalide : {e}")
        return None


def get_user_id_from_token(token: str) -> Optional[str]:
    """
    Extrait l'ID utilisateur d'un token JWT.
    Fonction utilitaire pratique.
    
    Exemple :
        user_id = get_user_id_from_token(token)
        if user_id:
            print(f"L'utilisateur {user_id} a fait la requête")
    """
    payload = decode_access_token(token)
    if payload:
        return payload.get("sub")
    return None


def get_role_from_token(token: str) -> Optional[str]:
    """
    Extrait le rôle d'un token JWT.
    
    Exemple :
        role = get_role_from_token(token)
        if role == "administrateur":
            print("L'utilisateur est admin")
    """
    payload = decode_access_token(token)
    if payload:
        return payload.get("role")
    return None


# ============================================
# TEST RAPIDE
# ============================================
# if __name__ == "__main__":
#     print("=" * 50)
#     print("🎫 TEST DES TOKENS JWT")
#     print("=" * 50)
    
#     # Test 1 : Création d'un token
#     print("\n📝 Création d'un token...")
#     token = create_access_token({
#         "sub": "user_12345",
#         "email": "test@example.com",
#         "role": "agent_officiel"
#     })
#     print(f"🔑 Token généré : {token[:50]}...")
#     print(f"📏 Longueur du token : {len(token)} caractères")
    
#     # Test 2 : Décodage du token
#     print("\n🔓 Décodage du token...")
#     payload = decode_access_token(token)
#     if payload:
#         print(f"✅ Token valide !")
#         print(f"   - ID utilisateur : {payload.get('sub')}")
#         print(f"   - Email : {payload.get('email')}")
#         print(f"   - Rôle : {payload.get('role')}")
#         print(f"   - Expire le : {payload.get('exp')}")
#         print(f"   - Créé le : {payload.get('iat')}")
    
#     # Test 3 : Token invalide
#     print("\n⚠️  Test avec token invalide...")
#     payload = decode_access_token("token_invalide.xyz")
#     if payload is None:
#         print("✅ Token invalide correctement rejeté")
    
#     # Test 4 : Extraction d'infos
#     print("\n📊 Extraction des infos...")
#     user_id = get_user_id_from_token(token)
#     role = get_role_from_token(token)
#     print(f"   - ID utilisateur extrait : {user_id}")
#     print(f"   - Rôle extrait : {role}")
    
#     print("\n" + "=" * 50)
#     print("✅ JWT fonctionne correctement !")