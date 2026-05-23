"""
password_reset_service.py — Réinitialisation du mot de passe
=============================================================
Tous les rôles (Agent, Admin, Citoyen) peuvent réinitialiser leur MDP.
Flux : POST /auth/forgot-password → email avec lien → POST /auth/reset-password
"""

import secrets
from datetime import datetime, timedelta
from typing import Tuple, Optional
from sqlalchemy.orm import Session

from app.models.models import Utilisateur, PasswordResetToken, LogSecurite
from app.core.auth import hash_password
from app.services.email_service import EmailService
from app.core.config import settings


class PasswordResetService:

    def __init__(self, db: Session):
        self.db = db

    # ── 1. Demande de réinitialisation ──────────────────────────────────────

    def request_reset(self, email: str) -> Tuple[bool, str]:
        """
        Génère un token de reset et envoie le lien par email.
        Retourne toujours (True, message_générique) pour ne pas révéler
        si l'email existe ou non (sécurité anti-énumération).
        """
        GENERIC_MSG = (
            "Si cet email est associé à un compte, "
            "vous recevrez un lien de réinitialisation dans quelques minutes."
        )

        utilisateur = self.db.query(Utilisateur).filter(
            Utilisateur.email == email
        ).first()

        if not utilisateur:
            # Ne pas révéler que l'email n'existe pas
            return True, GENERIC_MSG

        # Invalider les anciens tokens non utilisés
        self.db.query(PasswordResetToken).filter(
            PasswordResetToken.id_utilisateur == utilisateur.id_utilisateur,
            PasswordResetToken.est_utilise == False,
        ).update({"est_utilise": True})
        self.db.flush()

        # Générer un token sécurisé
        token_value = secrets.token_urlsafe(64)
        expire_minutes = getattr(settings, "PASSWORD_RESET_EXPIRE_MINUTES", 30)

        reset_token = PasswordResetToken(
            id_utilisateur=utilisateur.id_utilisateur,
            token=token_value,
            date_expiration=datetime.now() + timedelta(minutes=expire_minutes),
        )
        self.db.add(reset_token)
        self.db.commit()

        # Construire le lien frontend
        frontend_url = getattr(settings, "FRONTEND_URL", "http://localhost:5173")
        reset_link = f"{frontend_url}/reset-password?token={token_value}"

        # Envoyer l'email
        nom_complet = f"{utilisateur.prenom} {utilisateur.nom}"
        EmailService.send_password_reset(utilisateur.email, nom_complet, reset_link)

        self._log(utilisateur.id_utilisateur, "PASSWORD_RESET_REQUEST", True,
                  "Demande de réinitialisation de mot de passe")

        return True, GENERIC_MSG

    # ── 2. Réinitialisation effective ───────────────────────────────────────

    def reset_password(self, token_value: str, new_password: str) -> Tuple[bool, str]:
        """
        Valide le token et applique le nouveau mot de passe.
        """
        reset_token = self.db.query(PasswordResetToken).filter(
            PasswordResetToken.token == token_value,
            PasswordResetToken.est_utilise == False,
            PasswordResetToken.date_expiration > datetime.now(),
        ).first()

        if not reset_token:
            return False, "Lien invalide ou expiré. Veuillez faire une nouvelle demande."

        utilisateur = self.db.query(Utilisateur).filter(
            Utilisateur.id_utilisateur == reset_token.id_utilisateur
        ).first()

        if not utilisateur:
            return False, "Utilisateur introuvable."

        # Appliquer le nouveau mot de passe
        utilisateur.mot_de_passe = hash_password(new_password)
        # Invalider toutes les sessions actives
        utilisateur.session_token_hash = None
        # Marquer le token utilisé
        reset_token.est_utilise = True

        self.db.commit()

        self._log(utilisateur.id_utilisateur, "PASSWORD_RESET_SUCCESS", True,
                  "Mot de passe réinitialisé avec succès")

        return True, "Mot de passe réinitialisé avec succès. Vous pouvez vous connecter."

    # ── 3. Reset forcé par admin ─────────────────────────────────────────────

    def admin_reset_password(
        self,
        target_user_id: str,
        admin_id: str,
        new_password: Optional[str] = None,
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Un ADMIN_SYSTEME / SUPER_ADMIN réinitialise le MDP d'un utilisateur.
        Si new_password est None, génère un mot de passe temporaire aléatoire.
        Retourne (success, message, generated_password_or_none).
        """
        utilisateur = self.db.query(Utilisateur).filter(
            Utilisateur.id_utilisateur == target_user_id
        ).first()

        if not utilisateur:
            return False, "Utilisateur introuvable.", None

        generated = None
        if new_password is None:
            # Générer un mot de passe temporaire lisible
            generated = secrets.token_urlsafe(12)
            new_password = generated

        utilisateur.mot_de_passe = hash_password(new_password)
        utilisateur.session_token_hash = None  # invalider session active
        self.db.commit()

        self._log(admin_id, "ADMIN_PASSWORD_RESET", True,
                  f"Mot de passe réinitialisé par admin pour utilisateur {target_user_id}")

        if generated:
            # Envoyer le nouveau MDP par email
            nom_complet = f"{utilisateur.prenom} {utilisateur.nom}"
            EmailService.send_temp_password(utilisateur.email, nom_complet, generated)

        return True, "Mot de passe réinitialisé avec succès.", generated

    # ── Helpers ─────────────────────────────────────────────────────────────

    def _log(self, user_id: str, action: str, succes: bool, details: str):
        log = LogSecurite(
            id_utilisateur=user_id,
            type_action=action,
            succes=succes,
            details=details,
        )
        self.db.add(log)
        self.db.commit()
