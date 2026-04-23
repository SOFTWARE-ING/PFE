"""
signature_service.py — Service de Signature Numérique SHIELD
=============================================================
Fonctionnalités :
- Signature numérique RSA-PSS (SHA256)
- Vérification de signature
- Double validation (clé + document)
- Intégration avec la base de données (table Signature)
- Logs de sécurité automatiques
- Support de co-signature (plusieurs agents)
- Horodatage certifié
"""

import base64
import hashlib
from datetime import datetime, timezone
from typing import Optional, Tuple, Dict, Any
from dataclasses import dataclass

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.asymmetric.utils import Prehashed
from cryptography.exceptions import InvalidSignature
from cryptography.fernet import Fernet
from sqlalchemy.orm import Session

from app.models.models import (
    Signature, CleCryptographique, Communique, 
    AgentOfficiel, LogSecurite
)
from app.core.config import settings


@dataclass
class SignatureResult:
    """Résultat complet d'une opération de signature."""
    success: bool
    message: str
    signature_id: Optional[str] = None
    signature_value: Optional[str] = None
    hash_document: Optional[str] = None
    timestamp: Optional[datetime] = None
    verified: Optional[bool] = None


class SignatureService:
    """
    Service complet de signature numérique pour SHIELD.
    
    Architecture :
    - RSA-2048 bits minimum (4096 recommandé en production)
    - Padding PSS avec MGF1 (standard moderne, plus sécurisé que PKCS1v15)
    - Hash SHA256 (conforme aux standards gouvernementaux)
    - Stockage base64 dans la base de données
    - Vérification croisée (document + clé publique)
    """
    
    # Constantes de sécurité
    REQUIRED_KEY_SIZE = 2048  # bits minimum
    HASH_ALGORITHM = hashes.SHA256()
    PADDING = padding.PSS(
        mgf=padding.MGF1(hashes.SHA256()),
        salt_length=padding.PSS.MAX_LENGTH
    )
    
    def __init__(self, db: Session):
        """
        Initialise le service de signature.
        
        Args:
            db: Session SQLAlchemy active
        """
        self.db = db
        self.fernet = Fernet(settings.ENCRYPTION_KEY)
    
    # ============================================================
    # 1. SIGNATURE PRINCIPALE
    # ============================================================
    
    def sign_communique(
        self,
        communique_id: str,
        agent_id: str,
        password_private_key: Optional[str] = None
    ) -> SignatureResult:
        """
        Signe numériquement un communiqué officiel.
        
        Processus complet :
        1. Récupère le communiqué et vérifie son statut
        2. Calcule le hash SHA256 du contenu
        3. Récupère la clé privée active de l'agent
        4. Déchiffre la clé privée (si nécessaire)
        5. Signe le hash avec RSA-PSS
        6. Stocke la signature dans la base de données
        7. Log l'opération
        
        Args:
            communique_id: UUID du communiqué à signer
            agent_id: UUID de l'agent qui signe
            password_private_key: Mot de passe optionnel pour la clé privée
            
        Returns:
            SignatureResult avec le statut et les détails
        """
        try:
            # 1. Récupère le communiqué
            communique = self.db.query(Communique).filter(
                Communique.id_communique == communique_id
            ).first()
            
            if not communique:
                return SignatureResult(False, "Communiqué introuvable")
            
            if communique.statut not in ["BROUILLON", "PUBLIE"]:
                return SignatureResult(
                    False, 
                    f"Impossible de signer un communiqué avec le statut '{communique.statut}'"
                )
            
            # 2. Vérifie que l'agent n'a pas déjà signé
            existing_signature = self.db.query(Signature).filter(
                Signature.id_communique == communique_id,
                Signature.id_agent_officiel == agent_id,
                Signature.est_valide == True
            ).first()
            
            if existing_signature:
                return SignatureResult(
                    False, 
                    "Vous avez déjà signé ce communiqué"
                )
            
            # 3. Calcule le hash du document
            document_hash = self._hash_content(communique.contenu.encode('utf-8'))
            
            # 4. Récupère la clé privée active de l'agent
            cle = self._get_active_key(agent_id)
            if not cle:
                return SignatureResult(
                    False,
                    "Aucune clé cryptographique active trouvée. Générez d'abord une clé."
                )
            
            # 5. Vérifie que la clé n'est pas expirée
            if cle.date_expiration.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
                return SignatureResult(
                    False,
                    f"Clé expirée depuis le {cle.date_expiration.strftime('%d/%m/%Y')}. Renouvelez-la."
                )
            
            # 6. Déchiffre la clé privée
            try:
                private_key_pem = self.fernet.decrypt(
                    cle.cle_privee_chiffree.encode()
                )
                private_key = serialization.load_pem_private_key(
                    private_key_pem,
                    password=password_private_key.encode() if password_private_key else None
                )
            except Exception as e:
                return SignatureResult(
                    False,
                    f"Impossible de déchiffrer la clé privée : {str(e)}"
                )
            
            # 7. Vérifie la taille de la clé
            if private_key.key_size < self.REQUIRED_KEY_SIZE:
                return SignatureResult(
                    False,
                    f"Clé trop faible ({private_key.key_size} bits). Minimum requis : {self.REQUIRED_KEY_SIZE} bits."
                )
            
            # 8. Signe le hash du document
            signature_bytes = private_key.sign(
                document_hash,
                self.PADDING,
                self.HASH_ALGORITHM
            )
            
            # 9. Encode en base64 pour stockage
            signature_b64 = base64.b64encode(signature_bytes).decode('utf-8')
            
            # 10. Stocke la signature dans la base de données
            nouvelle_signature = Signature(
                id_communique=communique_id,
                id_agent_officiel=agent_id,
                valeur_signature=signature_b64,
                algorithme_hachage="RSA-SHA256-PSS",
                est_valide=True
            )
            
            self.db.add(nouvelle_signature)
            
            # 11. Si c'est la première signature, passe le statut à PUBLIE
            if communique.statut == "BROUILLON":
                communique.statut = "PUBLIE"
            
            # 12. Log de sécurité
            self._log_action(
                agent_id,
                "SIGNATURE_COMMUNIQUE",
                True,
                f"Signature du communiqué '{communique.titre}' (ID: {communique_id[:8]}...)"
            )
            
            self.db.commit()
            self.db.refresh(nouvelle_signature)
            
            return SignatureResult(
                success=True,
                message="✅ Document signé avec succès",
                signature_id=nouvelle_signature.id_signature,
                signature_value=signature_b64[:50] + "...",
                hash_document=base64.b64encode(document_hash).decode(),
                timestamp=nouvelle_signature.date_signature,
                verified=True
            )
            
        except Exception as e:
            self.db.rollback()
            self._log_action(
                agent_id,
                "SIGNATURE_COMMUNIQUE",
                False,
                f"Erreur : {str(e)}"
            )
            return SignatureResult(False, f"Erreur lors de la signature : {str(e)}")
    
    # ============================================================
    # 2. VÉRIFICATION DE SIGNATURE
    # ============================================================
    
    def verify_signature(self, signature_id: str) -> SignatureResult:
        """
        Vérifie la validité d'une signature existante.
        
        Processus :
        1. Récupère la signature en base
        2. Récupère le communiqué associé
        3. Récupère la clé publique de l'agent
        4. Recalcule le hash du document
        5. Vérifie la signature cryptographique
        6. Met à jour le statut si nécessaire
        
        Args:
            signature_id: UUID de la signature à vérifier
            
        Returns:
            SignatureResult avec le résultat de la vérification
        """
        try:
            # 1. Récupère la signature
            signature = self.db.query(Signature).filter(
                Signature.id_signature == signature_id
            ).first()
            
            if not signature:
                return SignatureResult(False, "Signature introuvable")
            
            # 2. Récupère le communiqué
            communique = self.db.query(Communique).filter(
                Communique.id_communique == signature.id_communique
            ).first()
            
            if not communique:
                return SignatureResult(False, "Communiqué associé introuvable")
            
            # 3. Récupère la clé publique de l'agent
            cle = self._get_key_for_signature(signature.id_agent_officiel)
            if not cle:
                return SignatureResult(False, "Clé publique introuvable pour cet agent")
            
            # 4. Charge la clé publique
            public_key = serialization.load_pem_public_key(
                cle.cle_publique.encode()
            )
            
            # 5. Recalcule le hash actuel du document
            current_hash = self._hash_content(communique.contenu.encode('utf-8'))
            
            # 6. Décode la signature stockée
            signature_bytes = base64.b64decode(signature.valeur_signature)
            
            # 7. Vérifie la signature
            try:
                public_key.verify(
                    signature_bytes,
                    current_hash,
                    self.PADDING,
                    self.HASH_ALGORITHM
                )
                is_valid = True
                message = "✅ Signature vérifiée : le document est authentique et intact"
            except InvalidSignature:
                is_valid = False
                message = "❌ Signature invalide : le document a peut-être été modifié"
            
            # 8. Met à jour le statut en base
            if signature.est_valide != is_valid:
                signature.est_valide = is_valid
                self.db.commit()
            
            # 9. Log
            self._log_action(
                signature.id_agent_officiel,
                "VERIFICATION_SIGNATURE",
                is_valid,
                f"Vérification signature ID: {signature_id[:8]}... - {'Valide' if is_valid else 'Invalide'}"
            )
            
            return SignatureResult(
                success=True,
                message=message,
                signature_id=signature_id,
                hash_document=base64.b64encode(current_hash).decode(),
                verified=is_valid
            )
            
        except Exception as e:
            return SignatureResult(False, f"Erreur lors de la vérification : {str(e)}")
    
    # ============================================================
    # 3. MÉTHODES UTILITAIRES
    # ============================================================
    
    def _hash_content(self, content: bytes) -> bytes:
        """
        Calcule le hash SHA256 du contenu.
        
        Args:
            content: Contenu du document en bytes
            
        Returns:
            Hash SHA256 en bytes
        """
        digest = hashes.Hash(self.HASH_ALGORITHM)
        digest.update(content)
        return digest.finalize()
    
    def _get_active_key(self, agent_id: str) -> Optional[CleCryptographique]:
        """
        Récupère la clé active la plus récente d'un agent.
        
        Critères :
        - Non expirée
        - La plus récente (par date de création)
        """
        now = datetime.now(timezone.utc)
        
        cle = (
            self.db.query(CleCryptographique)
            .filter(
                CleCryptographique.id_agent_officiel == agent_id,
                CleCryptographique.date_expiration > now
            )
            .order_by(CleCryptographique.date_creation.desc())
            .first()
        )
        
        return cle
    
    def _get_key_for_signature(self, agent_id: str) -> Optional[CleCryptographique]:
        """
        Récupère la clé publique associée à une signature.
        Même si la clé est expirée, on peut toujours vérifier.
        """
        cle = (
            self.db.query(CleCryptographique)
            .filter(CleCryptographique.id_agent_officiel == agent_id)
            .order_by(CleCryptographique.date_creation.desc())
            .first()
        )
        
        return cle
    
    def _log_action(
        self, 
        agent_id: str, 
        action: str, 
        success: bool, 
        details: str
    ) -> None:
        """Enregistre une action dans les logs de sécurité."""
        log = LogSecurite(
            id_utilisateur=agent_id,
            type_action=action,
            succes=success,
            details=details
        )
        self.db.add(log)
    
    # ============================================================
    # 4. FONCTIONS DE VALIDATION AVANCÉES
    # ============================================================
    
    def validate_document_integrity(
        self, 
        communique_id: str
    ) -> Dict[str, Any]:
        """
        Vérifie l'intégrité complète d'un communiqué :
        - Toutes les signatures sont valides
        - Le contenu n'a pas été modifié
        - Les clés utilisées sont valides
        
        Returns:
            Dictionnaire avec le statut détaillé
        """
        communique = self.db.query(Communique).filter(
            Communique.id_communique == communique_id
        ).first()
        
        if not communique:
            return {"valid": False, "error": "Communiqué introuvable"}
        
        signatures = self.db.query(Signature).filter(
            Signature.id_communique == communique_id,
            Signature.est_valide == True
        ).all()
        
        results = []
        for sig in signatures:
            verification = self.verify_signature(sig.id_signature)
            results.append({
                "signature_id": sig.id_signature,
                "agent": sig.id_agent_officiel,
                "date": sig.date_signature,
                "valid": verification.verified,
                "message": verification.message
            })
        
        return {
            "communique_id": communique_id,
            "titre": communique.titre,
            "statut": communique.statut,
            "total_signatures": len(signatures),
            "valid_signatures": sum(1 for r in results if r["valid"]),
            "integrity_verified": all(r["valid"] for r in results),
            "details": results
        }
    
    def get_unsigned_communiques(self, agent_id: str) -> list:
        """
        Retourne la liste des communiqués non signés par un agent.
        Utile pour le tableau de bord agent.
        """
        # Sous-requête : communiqués déjà signés par l'agent
        signed_subquery = (
            self.db.query(Signature.id_communique)
            .filter(
                Signature.id_agent_officiel == agent_id,
                Signature.est_valide == True
            )
            .subquery()
        )
        
        # Communiqués non signés
        unsigned = (
            self.db.query(Communique)
            .filter(
                Communique.id_communique.notin_(signed_subquery),
                Communique.statut.in_(["BROUILLON", "PUBLIE"])
            )
            .all()
        )
        
        return unsigned