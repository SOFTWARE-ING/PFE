"""
admin_service.py — Service Panneau Administrateur
=================================================
Fonctionnalités :
  - Création de comptes (Agent / Admin) avec règles hiérarchiques
  - Toggle token_autorise (bloquer / autoriser l'accès)
  - Toggle 2FA (activer / désactiver, avec force_enabled)
  - Liste des utilisateurs avec filtres et pagination
  - Sessions actives
  - Statistiques globales
  - Logs d'audit centralisés
"""

import secrets
from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.models.models import (
    Utilisateur, AgentOfficiel, Administrateur, Citoyen,
    LogSecurite, Utilisateur2FA, PasswordResetToken,
)
from app.core.auth import hash_password
from app.services.email_service import EmailService
from app.services.totp_service import TOTPService


# ── Constantes hiérarchiques ────────────────────────────────────────────────

SUPER_ADMIN = "SUPER_ADMIN"
ADMIN_SYSTEME = "ADMIN_SYSTEME"
ADMIN_SECURITE = "ADMIN_SECURITE"

# Niveaux qui NE PEUVENT PAS être bloqués ni avoir leur 2FA désactivé par force
PROTECTED_LEVELS = {SUPER_ADMIN}


def _get_admin_niveau(db: Session, admin_id: str) -> Optional[str]:
    """Récupère le niveau d'habilitation d'un administrateur."""
    admin = db.query(Administrateur).filter(
        Administrateur.id_utilisateur == admin_id
    ).first()
    return admin.niveau_habilitation if admin else None


def _can_manage(actor_niveau: str, target_niveau: Optional[str]) -> bool:
    """
    Vérifie si l'acteur peut gérer la cible.
    Règle : personne ne peut gérer un SUPER_ADMIN.
    """
    if target_niveau in PROTECTED_LEVELS:
        return False
    return actor_niveau in {SUPER_ADMIN, ADMIN_SYSTEME}


class AdminService:

    def __init__(self, db: Session):
        self.db = db
        self.totp = TOTPService()

    # ════════════════════════════════════════════════════════════════════════
    # 1. CRÉATION DE COMPTES
    # ════════════════════════════════════════════════════════════════════════

    def create_agent(
        self,
        admin_id: str,
        nom: str,
        prenom: str,
        email: str,
        id_institution: str,
        fonction: str,
        departement: Optional[str] = None,
        matricule: Optional[str] = None,
    ) -> Tuple[bool, str, Optional[Dict]]:
        """
        ADMIN_SYSTEME ou SUPER_ADMIN crée un compte AgentOfficiel.
        - token_autorise = FALSE par défaut (doit être autorisé manuellement)
        - 2FA activé automatiquement
        - MDP temporaire généré et envoyé par email
        Retourne (success, message, user_data).
        """
        actor_niveau = _get_admin_niveau(self.db, admin_id)
        if actor_niveau not in {SUPER_ADMIN, ADMIN_SYSTEME}:
            return False, "Permission insuffisante.", None

        # Vérifier unicité email
        if self.db.query(Utilisateur).filter(Utilisateur.email == email).first():
            return False, "Cet email est déjà utilisé.", None

        if matricule and self.db.query(AgentOfficiel).filter(
            AgentOfficiel.matricule == matricule
        ).first():
            return False, "Ce matricule est déjà attribué.", None

        # Générer mot de passe temporaire
        temp_password = secrets.token_urlsafe(12)
        hashed = hash_password(temp_password)

        # Créer utilisateur avec token désactivé
        user = Utilisateur(
            nom=nom,
            prenom=prenom,
            email=email,
            mot_de_passe=hashed,
            token_autorise=False,  # désactivé par défaut
        )
        self.db.add(user)
        self.db.flush()

        # Créer l'agent
        agent = AgentOfficiel(
            id_utilisateur=user.id_utilisateur,
            id_institution=id_institution,
            fonction=fonction,
            departement=departement,
            matricule=matricule,
        )
        self.db.add(agent)

        # Activer le 2FA automatiquement
        totp_secret = self.totp.generate_secret()
        user_2fa = Utilisateur2FA(
            id_utilisateur=user.id_utilisateur,
            totp_secret=totp_secret,
            est_active=True,
            force_enabled=True,  # imposé par admin
        )
        self.db.add(user_2fa)
        self.db.commit()

        # Envoyer email avec identifiants
        nom_complet = f"{prenom} {nom}"
        EmailService.send_account_created(
            email, nom_complet, temp_password, totp_secret, role="Agent Officiel"
        )

        self._log(admin_id, "CREATION_AGENT", True,
                  f"Agent créé : {email} (institution={id_institution})")

        return True, "Compte agent créé avec succès.", {
            "id_utilisateur": user.id_utilisateur,
            "email": email,
            "nom": nom,
            "prenom": prenom,
            "role": "agent_officiel",
            "token_autorise": False,
            "deux_fa_actif": True,
        }

    def create_admin(
        self,
        actor_id: str,
        nom: str,
        prenom: str,
        email: str,
        niveau_habilitation: str = ADMIN_SYSTEME,
    ) -> Tuple[bool, str, Optional[Dict]]:
        """
        Seul SUPER_ADMIN peut créer d'autres administrateurs.
        """
        actor_niveau = _get_admin_niveau(self.db, actor_id)
        if actor_niveau != SUPER_ADMIN:
            return False, "Seul un SUPER_ADMIN peut créer des administrateurs.", None

        if niveau_habilitation not in {SUPER_ADMIN, ADMIN_SYSTEME, ADMIN_SECURITE}:
            return False, f"Niveau d'habilitation invalide : {niveau_habilitation}", None

        if self.db.query(Utilisateur).filter(Utilisateur.email == email).first():
            return False, "Cet email est déjà utilisé.", None

        temp_password = secrets.token_urlsafe(12)

        user = Utilisateur(
            nom=nom,
            prenom=prenom,
            email=email,
            mot_de_passe=hash_password(temp_password),
            token_autorise=True,  # les admins ont le token autorisé par défaut
        )
        self.db.add(user)
        self.db.flush()

        admin = Administrateur(
            id_utilisateur=user.id_utilisateur,
            niveau_habilitation=niveau_habilitation,
        )
        self.db.add(admin)

        # 2FA activé automatiquement
        totp_secret = self.totp.generate_secret()
        user_2fa = Utilisateur2FA(
            id_utilisateur=user.id_utilisateur,
            totp_secret=totp_secret,
            est_active=True,
            force_enabled=True,
        )
        self.db.add(user_2fa)
        self.db.commit()

        EmailService.send_account_created(
            email, f"{prenom} {nom}", temp_password, totp_secret,
            role=f"Administrateur ({niveau_habilitation})"
        )

        self._log(actor_id, "CREATION_ADMIN", True,
                  f"Admin créé : {email} niveau={niveau_habilitation}")

        return True, "Compte administrateur créé avec succès.", {
            "id_utilisateur": user.id_utilisateur,
            "email": email,
            "nom": nom,
            "prenom": prenom,
            "role": "administrateur",
            "niveau_habilitation": niveau_habilitation,
            "token_autorise": True,
        }

    # ════════════════════════════════════════════════════════════════════════
    # 2. CONTRÔLE D'ACCÈS — toggle token
    # ════════════════════════════════════════════════════════════════════════

    def toggle_access_token(
        self, actor_id: str, target_user_id: str
    ) -> Tuple[bool, str, Optional[bool]]:
        """
        Autorise ou bloque le token d'accès d'un utilisateur.
        Interdit sur les SUPER_ADMIN.
        Retourne (success, message, new_state).
        """
        actor_niveau = _get_admin_niveau(self.db, actor_id)
        if actor_niveau not in {SUPER_ADMIN, ADMIN_SYSTEME}:
            return False, "Permission insuffisante.", None

        target = self.db.query(Utilisateur).filter(
            Utilisateur.id_utilisateur == target_user_id
        ).first()
        if not target:
            return False, "Utilisateur introuvable.", None

        # Vérifier si la cible est un SUPER_ADMIN
        target_admin = self.db.query(Administrateur).filter(
            Administrateur.id_utilisateur == target_user_id
        ).first()
        if target_admin and target_admin.niveau_habilitation == SUPER_ADMIN:
            return False, "Impossible de modifier l'accès d'un SUPER_ADMIN.", None

        # Toggle
        new_state = not target.token_autorise
        target.token_autorise = new_state
        if not new_state:
            # Invalider la session active
            target.session_token_hash = None
        self.db.commit()

        action = "AUTORISATION_TOKEN" if new_state else "BLOCAGE_TOKEN"
        self._log(actor_id, action, True,
                  f"Token {'autorisé' if new_state else 'bloqué'} pour {target_user_id}")

        msg = f"Accès {'autorisé' if new_state else 'bloqué'} pour {target.prenom} {target.nom}."
        return True, msg, new_state

    # ════════════════════════════════════════════════════════════════════════
    # 3. CONTRÔLE 2FA — toggle
    # ════════════════════════════════════════════════════════════════════════

    def toggle_2fa(
        self, actor_id: str, target_user_id: str
    ) -> Tuple[bool, str, Optional[bool]]:
        """
        Active ou désactive le 2FA d'un utilisateur.
        Interdit sur les SUPER_ADMIN.
        Si activation : génère un nouveau secret TOTP.
        Retourne (success, message, new_state).
        """
        actor_niveau = _get_admin_niveau(self.db, actor_id)
        if actor_niveau not in {SUPER_ADMIN, ADMIN_SYSTEME}:
            return False, "Permission insuffisante.", None

        target_admin = self.db.query(Administrateur).filter(
            Administrateur.id_utilisateur == target_user_id
        ).first()
        if target_admin and target_admin.niveau_habilitation == SUPER_ADMIN:
            return False, "Impossible de modifier le 2FA d'un SUPER_ADMIN.", None

        target = self.db.query(Utilisateur).filter(
            Utilisateur.id_utilisateur == target_user_id
        ).first()
        if not target:
            return False, "Utilisateur introuvable.", None

        existing_2fa = self.db.query(Utilisateur2FA).filter(
            Utilisateur2FA.id_utilisateur == target_user_id
        ).first()

        if existing_2fa and existing_2fa.est_active:
            # Désactiver
            existing_2fa.est_active = False
            existing_2fa.force_enabled = False
            self.db.commit()
            self._log(actor_id, "ADMIN_DISABLE_2FA", True,
                      f"2FA désactivé par admin pour {target_user_id}")
            return True, f"2FA désactivé pour {target.prenom} {target.nom}.", False
        else:
            # Activer
            totp_secret = self.totp.generate_secret()
            if existing_2fa:
                existing_2fa.totp_secret = totp_secret
                existing_2fa.est_active = True
                existing_2fa.force_enabled = True
                existing_2fa.date_activation = datetime.now()
            else:
                self.db.add(Utilisateur2FA(
                    id_utilisateur=target_user_id,
                    totp_secret=totp_secret,
                    est_active=True,
                    force_enabled=True,
                ))
            self.db.commit()
            self._log(actor_id, "ADMIN_ENABLE_2FA", True,
                      f"2FA activé par admin pour {target_user_id}")

            # Envoyer le nouveau secret par email
            qr_code = self.totp.generate_qr_code(target.email, totp_secret)
            EmailService.send_2fa_reset(target.email, f"{target.prenom} {target.nom}",
                                        totp_secret, qr_code)

            return True, f"2FA activé pour {target.prenom} {target.nom}.", True

    # ════════════════════════════════════════════════════════════════════════
    # 4. LISTE DES UTILISATEURS
    # ════════════════════════════════════════════════════════════════════════

    def list_users(
        self,
        actor_id: str,
        search: Optional[str] = None,
        role_filter: Optional[str] = None,
        token_filter: Optional[bool] = None,
        page: int = 1,
        limit: int = 20,
    ) -> Tuple[bool, str, Optional[Dict]]:
        """
        Liste tous les utilisateurs avec filtres, recherche et pagination.
        """
        actor_niveau = _get_admin_niveau(self.db, actor_id)
        if not actor_niveau:
            return False, "Accès refusé.", None

        query = self.db.query(Utilisateur)

        if search:
            term = f"%{search}%"
            query = query.filter(
                or_(
                    Utilisateur.nom.ilike(term),
                    Utilisateur.prenom.ilike(term),
                    Utilisateur.email.ilike(term),
                )
            )

        if token_filter is not None:
            query = query.filter(Utilisateur.token_autorise == token_filter)

        total = query.count()
        offset = (page - 1) * limit
        users = query.order_by(Utilisateur.date_creation.desc()).offset(offset).limit(limit).all()

        results = []
        for u in users:
            role = self._get_role(u.id_utilisateur)
            niveau = None
            if u.administrateur:
                niveau = u.administrateur.niveau_habilitation

            # Filtre par rôle si demandé
            if role_filter and role != role_filter:
                continue

            two_fa = self.db.query(Utilisateur2FA).filter(
                Utilisateur2FA.id_utilisateur == u.id_utilisateur
            ).first()

            results.append({
                "id_utilisateur": u.id_utilisateur,
                "nom": u.nom,
                "prenom": u.prenom,
                "email": u.email,
                "role": role,
                "niveau_habilitation": niveau,
                "token_autorise": u.token_autorise,
                "deux_fa_actif": two_fa.est_active if two_fa else False,
                "deux_fa_force": two_fa.force_enabled if two_fa else False,
                "session_active": u.session_token_hash is not None,
                "derniere_connexion": u.derniere_connexion.isoformat() if u.derniere_connexion else None,
                "date_creation": u.date_creation.isoformat(),
                "is_protected": niveau in PROTECTED_LEVELS,
            })

        return True, "OK", {
            "total": total,
            "page": page,
            "limit": limit,
            "users": results,
        }

    # ════════════════════════════════════════════════════════════════════════
    # 5. SESSIONS ACTIVES
    # ════════════════════════════════════════════════════════════════════════

    def list_active_sessions(self, actor_id: str) -> Tuple[bool, str, Optional[List]]:
        """Retourne les utilisateurs avec une session active (token hash présent)."""
        actor_niveau = _get_admin_niveau(self.db, actor_id)
        if not actor_niveau:
            return False, "Accès refusé.", None

        users = self.db.query(Utilisateur).filter(
            Utilisateur.session_token_hash.isnot(None),
            Utilisateur.token_autorise == True,
        ).order_by(Utilisateur.derniere_connexion.desc()).all()

        results = [{
            "id_utilisateur": u.id_utilisateur,
            "nom": u.nom,
            "prenom": u.prenom,
            "email": u.email,
            "role": self._get_role(u.id_utilisateur),
            "derniere_connexion": u.derniere_connexion.isoformat() if u.derniere_connexion else None,
        } for u in users]

        return True, "OK", results

    # ════════════════════════════════════════════════════════════════════════
    # 6. LOGS D'AUDIT CENTRALISÉS
    # ════════════════════════════════════════════════════════════════════════

    def get_logs(
        self,
        actor_id: str,
        user_id_filter: Optional[str] = None,
        action_filter: Optional[str] = None,
        succes_filter: Optional[bool] = None,
        page: int = 1,
        limit: int = 50,
    ) -> Tuple[bool, str, Optional[Dict]]:
        """Logs d'audit centralisés. Accessible à tous les niveaux admin."""
        actor_niveau = _get_admin_niveau(self.db, actor_id)
        if not actor_niveau:
            return False, "Accès refusé.", None

        query = self.db.query(LogSecurite).join(
            Utilisateur, LogSecurite.id_utilisateur == Utilisateur.id_utilisateur
        )

        if user_id_filter:
            query = query.filter(LogSecurite.id_utilisateur == user_id_filter)
        if action_filter:
            query = query.filter(LogSecurite.type_action.ilike(f"%{action_filter}%"))
        if succes_filter is not None:
            query = query.filter(LogSecurite.succes == succes_filter)

        total = query.count()
        offset = (page - 1) * limit
        logs = query.order_by(LogSecurite.date_action.desc()).offset(offset).limit(limit).all()

        results = [{
            "id_log": l.id_log,
            "id_utilisateur": l.id_utilisateur,
            "user_email": l.utilisateur.email if l.utilisateur else "—",
            "user_nom": f"{l.utilisateur.prenom} {l.utilisateur.nom}" if l.utilisateur else "—",
            "type_action": l.type_action,
            "date_action": l.date_action.isoformat(),
            "succes": l.succes,
            "details": l.details,
            "ip_adresse": l.ip_adresse,
        } for l in logs]

        return True, "OK", {"total": total, "page": page, "limit": limit, "logs": results}

    # ════════════════════════════════════════════════════════════════════════
    # 7. STATISTIQUES GLOBALES
    # ════════════════════════════════════════════════════════════════════════

    def get_stats(self, actor_id: str) -> Tuple[bool, str, Optional[Dict]]:
        """Tableau de bord : statistiques globales de la plateforme."""
        actor_niveau = _get_admin_niveau(self.db, actor_id)
        if not actor_niveau:
            return False, "Accès refusé.", None

        total_users = self.db.query(Utilisateur).count()
        total_agents = self.db.query(AgentOfficiel).count()
        total_admins = self.db.query(Administrateur).count()
        total_citoyens = self.db.query(Citoyen).count()
        users_bloques = self.db.query(Utilisateur).filter(
            Utilisateur.token_autorise == False
        ).count()
        users_2fa = self.db.query(Utilisateur2FA).filter(
            Utilisateur2FA.est_active == True
        ).count()
        sessions_actives = self.db.query(Utilisateur).filter(
            Utilisateur.session_token_hash.isnot(None)
        ).count()

        return True, "OK", {
            "utilisateurs": {
                "total": total_users,
                "agents": total_agents,
                "admins": total_admins,
                "citoyens": total_citoyens,
                "bloques": users_bloques,
                "avec_2fa": users_2fa,
                "sessions_actives": sessions_actives,
            },
        }

    # ── Helpers ─────────────────────────────────────────────────────────────

    def _get_role(self, user_id: str) -> str:
        if self.db.query(AgentOfficiel).filter(AgentOfficiel.id_utilisateur == user_id).first():
            return "agent_officiel"
        if self.db.query(Administrateur).filter(Administrateur.id_utilisateur == user_id).first():
            return "administrateur"
        if self.db.query(Citoyen).filter(Citoyen.id_utilisateur == user_id).first():
            return "citoyen"
        return "inconnu"

    def _log(self, user_id: str, action: str, succes: bool, details: str):
        self.db.add(LogSecurite(
            id_utilisateur=user_id,
            type_action=action,
            succes=succes,
            details=details,
        ))
        self.db.commit()
