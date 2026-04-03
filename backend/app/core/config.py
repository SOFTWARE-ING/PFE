"""
config.py — Configuration centralisée du système
=================================================
Ce fichier charge les variables d'environnement et fournit
des objets de configuration simples à utiliser partout.

TRÈS SIMPLE : chaque variable est accessible comme une propriété.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Charge le fichier .env à la racine du projet
# (cherche automatiquement dans le dossier parent)
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class DatabaseConfig:
    """
    Configuration de la connexion PostgreSQL.
    Utilisation : DatabaseConfig.get_url()
    """
    
    @staticmethod
    def get_url() -> str:
        """
        Construit l'URL de connexion PostgreSQL au format SQLAlchemy.
        Exemple : postgresql://user:password@localhost:5432/nom_bd
        """
        host = os.getenv("DB_HOST", "localhost")
        port = os.getenv("DB_PORT", "5432")
        name = os.getenv("DB_NAME", "signature_communiques")
        user = os.getenv("DB_USER", "postgres")
        password = os.getenv("DB_PASSWORD", "")
        
        # Format standard SQLAlchemy pour PostgreSQL
        return f"postgresql://{user}:{password}@{host}:{port}/{name}"
    
    @staticmethod
    def get_async_url() -> str:
        """
        URL pour connexion asynchrone (si besoin plus tard).
        """
        sync_url = DatabaseConfig.get_url()
        # postgresql:// → postgresql+asyncpg://
        return sync_url.replace("postgresql://", "postgresql+asyncpg://")


class SecurityConfig:
    """
    Configuration de la sécurité (JWT, Bcrypt, 2FA).
    TOUT est centralisé ici.
    """
    
    # JWT (JSON Web Tokens)
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "change_me_in_production")
    JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "30"))
    
    # Bcrypt (hachage des mots de passe)
    BCRYPT_ROUNDS = int(os.getenv("BCRYPT_ROUNDS", "12"))
    
    # 2FA - OTP (One-Time Password)
    OTP_EXPIRE_SECONDS = int(os.getenv("OTP_EXPIRE_SECONDS", "300"))  # 5 minutes
    OTP_LENGTH = int(os.getenv("OTP_LENGTH", "6"))  # 6 chiffres


# Vérification simple : est-ce que la clé JWT a été changée ?
def is_production_ready() -> bool:
    """Vérifie si la configuration est prête pour la production."""
    return SecurityConfig.JWT_SECRET_KEY != "change_me_in_production"
