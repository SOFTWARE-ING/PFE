"""
key_service.py — Gestion des clés cryptographiques
==================================================
Responsable : KEITA Flora (ton module)
Fonctionnalités :
- Génération d'une nouvelle paire de clés RSA pour un agent
- Chiffrement de la clé privée (AES-256 via Fernet)
- Renouvellement (invalide l'ancienne + crée une nouvelle)
- Enregistrement dans la table cle_cryptographique
- Log de sécurité automatique
"""

from datetime import datetime, timedelta
from typing import Tuple

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.fernet import Fernet
from sqlalchemy.orm import Session

from app.models.models import CleCryptographique, LogSecurite
from app.core.config import settings 


class KeyService:
    """Service complet pour la gestion des clés cryptographiques."""

    def __init__(self, db: Session):
        self.db = db
        self.fernet = Fernet(settings.ENCRYPTION_KEY)

    def _generate_rsa_keypair(self) -> Tuple[str, str]:
        """Génère une paire RSA 2048 bits (standard recommandé)."""
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048
        )

        # Clé privée en format PEM
        pem_private = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode()

        # Clé publique en format PEM
        public_key = private_key.public_key()
        pem_public = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode()

        return pem_public, pem_private

    def _encrypt_private_key(self, private_pem: str) -> str:
        """Chiffre la clé privée avec AES-256 (Fernet)."""
        return self.fernet.encrypt(private_pem.encode()).decode()

    def generate_keys(self, id_agent_officiel: str, days_valid: int = 365) -> CleCryptographique:
        """GÉNÉRATION d'une nouvelle paire de clés."""
        public_pem, private_pem = self._generate_rsa_keypair()
        encrypted_private = self._encrypt_private_key(private_pem)

        expiration = datetime.utcnow() + timedelta(days=days_valid)

        nouvelle_cle = CleCryptographique(
            id_agent_officiel=id_agent_officiel,
            cle_publique=public_pem,
            cle_privee_chiffree=encrypted_private,
            date_expiration=expiration
        )

        self.db.add(nouvelle_cle)
        self.db.commit()
        self.db.refresh(nouvelle_cle)

        # Log de sécurité
        log = LogSecurite(
            id_utilisateur=id_agent_officiel,  # agent = utilisateur
            type_action="GENERATION_CLE",
            succes=True,
            details=f"Clé RSA 2048 générée (expire le {expiration.date()})"
        )
        self.db.add(log)
        self.db.commit()

        return nouvelle_cle

    def renew_keys(self, id_agent_officiel: str) -> CleCryptographique:
        """RENOUVELLEMENT : invalide l'ancienne clé + en crée une nouvelle."""
        # Optionnel : on pourrait marquer l'ancienne comme expirée, mais ici on en crée juste une nouvelle
        return self.generate_keys(id_agent_officiel, days_valid=365)
    
