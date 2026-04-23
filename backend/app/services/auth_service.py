"""
auth_service.py - Service d'authentification AVEC 2FA
=====================================================
CE FICHIER CONTIENT LA LOGIQUE D'AUTHENTIFICATION :
1. Vérifier les identifiants (email + mot de passe)
2. Gérer le 2FA avec Google Authenticator
3. Générer un token JWT
4. Enregistrer l'action dans les logs de sécurité
"""

from datetime import datetime, timedelta
from typing import Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session

from app.models.models import (
    Utilisateur, AgentOfficiel, Administrateur, 
    Citoyen, LogSecurite, Utilisateur2FA
)
from app.core.auth import verify_password, hash_password
from app.core.jwt_utils import create_access_token, decode_access_token
from app.services.totp_service import TOTPService

from app.services.email_service import EmailService
from app.models.models import AuthEmailCode
import secrets


class AuthService:
    """
    Service d'authentification avec support 2FA.
    """
    
    def __init__(self, db: Session):
        """
        Initialise le service avec une session de base de données.
        """
        self.db = db
        self.totp = TOTPService()
    
    def login(self, email: str, password: str) -> Tuple[bool, Optional[str], Optional[str], Optional[str], Optional[Dict]]:
        """
        Authentifie un utilisateur avec support 2FA.
        
        Retourne :
            - success (bool) : connexion réussie ?
            - message (str) : message d'erreur ou de succès
            - token (str) : token JWT ou token temporaire si 2FA
            - user_id (str) : ID de l'utilisateur
            - extra (dict) : infos supplémentaires (requires_2fa, etc.)
        
        Cas 1 - Pas de 2FA :
            success, message, token, user_id, extra = auth.login(email, password)
            # token = token JWT final
            # extra = {"requires_2fa": False}
        
        Cas 2 - 2FA activé :
            success, message, token, user_id, extra = auth.login(email, password)
            # token = token temporaire (valable 5 min)
            # extra = {"requires_2fa": True, "temp_token": True}
        """
        # 1. Recherche l'utilisateur par email
        utilisateur = self.db.query(Utilisateur).filter(
            Utilisateur.email == email
        ).first()
        
        if not utilisateur:
            self._log_securite(None, "CONNEXION", False, f"Email inconnu : {email}")
            return False, "Email ou mot de passe incorrect", None, None, None
        
        # 2. Vérifie le mot de passe
        if not verify_password(password, utilisateur.mot_de_passe):
            self._log_securite(utilisateur.id_utilisateur, "CONNEXION", False, "Mot de passe incorrect")
            return False, "Email ou mot de passe incorrect", None, None, None
        
        # 3. Vérifie si le 2FA est activé pour cet utilisateur
        has_2fa = self._has_2fa_enabled(utilisateur.id_utilisateur)
        
        if has_2fa:
            # 2FA activé : on retourne un token TEMPORAIRE
            temp_token = self._create_temporary_token(utilisateur.id_utilisateur)
            
            self._log_securite(utilisateur.id_utilisateur, "CONNEXION_1FA", True, 
                              "Première étape réussie, 2FA requis")
            
            return True, "Code 2FA requis", temp_token, utilisateur.id_utilisateur, {
                "requires_2fa": True,
                "temp_token": True
            }
        
        # 4. Pas de 2FA : connexion directe (comme avant)
        role = self._get_user_role(utilisateur.id_utilisateur)
        
        if not role:
            self._log_securite(utilisateur.id_utilisateur, "CONNEXION", False, "Rôle introuvable")
            return False, "Profil utilisateur incomplet", None, None, None
        
        token_data = {
            "sub": utilisateur.id_utilisateur,
            "email": utilisateur.email,
            "role": role,
            "nom": utilisateur.nom,
            "prenom": utilisateur.prenom,
            "has_2fa": False
        }
        
        token = create_access_token(token_data)
        
        self._log_securite(utilisateur.id_utilisateur, "CONNEXION", True, 
                          f"Connexion réussie en tant que {role}")
        
        return True, "Connexion réussie", token, utilisateur.id_utilisateur, {
            "requires_2fa": False
        }
    

    '''
        Email verification 2fa

    '''



    def request_email_2fa(self, user_id: str) -> Tuple[bool, str]:
        """
        Envoie un code 2FA par email à l'utilisateur.
        
        Utilisation :
            success, message = auth.request_email_2fa(user_id)
        """
        utilisateur = self.db.query(Utilisateur).filter(
            Utilisateur.id_utilisateur == user_id
        ).first()
        
        if not utilisateur:
            return False, "Utilisateur non trouvé"
        
        # Vérifier si le 2FA est activé
        if not self._has_2fa_enabled(user_id):
            return False, "Le 2FA n'est pas activé pour ce compte"
        
        # Génère un code à 6 chiffres
        code = EmailService.generate_code()
        
        # Stocke le code en base
        email_code = AuthEmailCode(
            id_utilisateur=user_id,
            code=code,
            date_expiration=datetime.now() + timedelta(minutes=5)
        )
        self.db.add(email_code)
        self.db.commit()
        
        # Envoie l'email
        nom_complet = f"{utilisateur.prenom} {utilisateur.nom}"
        success, message = EmailService.send_2fa_code(
            utilisateur.email, 
            code, 
            nom_complet
        )
        
        if success:
            self._log_securite(user_id, "EMAIL_2FA_SENT", True, "Code 2FA envoyé par email")
            return True, f"Code envoyé à {utilisateur.email}"
        else:
            self._log_securite(user_id, "EMAIL_2FA_SENT", False, f"Échec envoi: {message}")
            return False, message
    
    def verify_email_2fa(self, user_id: str, code: str) -> bool:
        """
        Vérifie un code 2FA reçu par email.
        """
        # Cherche un code valide non utilisé
        email_code = self.db.query(AuthEmailCode).filter(
            AuthEmailCode.id_utilisateur == user_id,
            AuthEmailCode.code == code,
            AuthEmailCode.est_utilise == False,
            AuthEmailCode.date_expiration > datetime.now()
        ).first()
        
        if not email_code:
            return False
        
        # Marque comme utilisé
        email_code.est_utilise = True
        self.db.commit()
        
        self._log_securite(user_id, "EMAIL_2FA_VERIFY", True, "Code email validé")
        return True
    
    def verify_2fa_with_email_option(self, temp_token: str, code_2fa: str, use_email: bool = False) -> Tuple[bool, str, Optional[str], Optional[str]]:
        """
        Vérification 2FA qui accepte soit Google Auth, soit Email.
        
        Si use_email=True, vérifie dans AuthEmailCode.
        Sinon, vérifie dans Utilisateur2FA (Google Auth).
        """
        # 1. Vérifie le token temporaire
        payload = decode_access_token(temp_token)
        if not payload:
            return False, "Token invalide ou expiré", None, None
        
        if not payload.get("temp", False):
            return False, "Token invalide pour le 2FA", None, None
        
        user_id = payload.get("sub")
        if not user_id:
            return False, "Utilisateur non identifié", None, None
        
        # 2. Vérifie le code selon la méthode choisie
        if use_email:
            if not self.verify_email_2fa(user_id, code_2fa):
                return False, "Code email invalide ou expiré", None, None
        else:
            if not self._verify_user_2fa_code(user_id, code_2fa):
                return False, "Code 2FA invalide. Vérifie ton application Google Authenticator.", None, None
        
        # 3. Code valide : génère le token final
        utilisateur = self.db.query(Utilisateur).filter(
            Utilisateur.id_utilisateur == user_id
        ).first()
        
        if not utilisateur:
            return False, "Utilisateur non trouvé", None, None
        
        role = self._get_user_role(user_id)
        
        token_data = {
            "sub": utilisateur.id_utilisateur,
            "email": utilisateur.email,
            "role": role,
            "nom": utilisateur.nom,
            "prenom": utilisateur.prenom,
            "has_2fa": True
        }
        
        final_token = create_access_token(token_data)
        
        self._log_securite(user_id, "CONNEXION", True, f"Connexion complète (2FA) en tant que {role}")
        
        return True, "Authentification complète réussie", final_token, user_id






    
    def verify_2fa(self, temp_token: str, code_2fa: str) -> Tuple[bool, str, Optional[str], Optional[str]]:
        """
        Deuxième étape : vérification du code Google Authenticator.
        
        Retourne :
            - success (bool)
            - message (str)
            - final_token (str) : token JWT final si succès
            - user_id (str) : ID de l'utilisateur
        
        Utilisation :
            success, message, final_token, user_id = auth.verify_2fa(temp_token, "123456")
        """
        # 1. Vérifie le token temporaire
        payload = decode_access_token(temp_token)
        if not payload:
            return False, "Token invalide ou expiré", None, None
        
        # Vérifie que c'est bien un token temporaire
        if not payload.get("temp", False):
            return False, "Token invalide pour le 2FA", None, None
        
        user_id = payload.get("sub")
        if not user_id:
            return False, "Utilisateur non identifié", None, None
        
        # 2. Vérifie le code 2FA
        if not self._verify_user_2fa_code(user_id, code_2fa):
            self._log_securite(user_id, "VERIFICATION_2FA", False, "Code 2FA invalide")
            return False, "Code 2FA invalide. Vérifie que l'heure de ton téléphone est synchronisée.", None, None
        
        # 3. Code valide : génère le token final
        utilisateur = self.db.query(Utilisateur).filter(
            Utilisateur.id_utilisateur == user_id
        ).first()
        
        if not utilisateur:
            return False, "Utilisateur non trouvé", None, None
        
        role = self._get_user_role(user_id)
        
        token_data = {
            "sub": utilisateur.id_utilisateur,
            "email": utilisateur.email,
            "role": role,
            "nom": utilisateur.nom,
            "prenom": utilisateur.prenom,
            "has_2fa": True
        }
        
        final_token = create_access_token(token_data)
        
        self._log_securite(user_id, "VERIFICATION_2FA", True, "2FA validé avec succès")
        self._log_securite(user_id, "CONNEXION", True, f"Connexion complète (2FA) en tant que {role}")
        
        return True, "Authentification complète réussie", final_token, user_id
    
    def enable_2fa(self, user_id: str) -> Tuple[bool, str, Optional[str], Optional[str]]:
        """
        Active le 2FA pour un utilisateur.
        
        Retourne :
            - success (bool)
            - message (str)
            - secret (str) : le secret à sauvegarder
            - qr_code (str) : QR code en base64 à afficher
        
        Utilisation :
            success, message, secret, qr_code = auth.enable_2fa(user_id)
            if success:
                # Afficher le QR code à l'utilisateur
        """
        utilisateur = self.db.query(Utilisateur).filter(
            Utilisateur.id_utilisateur == user_id
        ).first()
        
        if not utilisateur:
            return False, "Utilisateur non trouvé", None, None
        
        # Vérifier si le 2FA est déjà activé
        existing = self.db.query(Utilisateur2FA).filter(
            Utilisateur2FA.id_utilisateur == user_id,
            Utilisateur2FA.est_active == True
        ).first()
        
        if existing:
            return False, "Le 2FA est déjà activé pour ce compte", None, None
        
        # Génère un nouveau secret TOTP
        secret = self.totp.generate_secret()
        
        # Stocke le secret
        user_2fa = Utilisateur2FA(
            id_utilisateur=user_id,
            totp_secret=secret,
            est_active=True
        )
        self.db.add(user_2fa)
        self.db.commit()
        
        # Génère le QR code
        qr_code = self.totp.generate_qr_code(utilisateur.email, secret)
        
        self._log_securite(user_id, "ACTIVATION_2FA", True, "2FA activé avec Google Authenticator")
        
        return True, "2FA activé avec succès. Scanne le QR code avec Google Authenticator.", secret, qr_code
    
    def disable_2fa(self, user_id: str, code_2fa: Optional[str] = None) -> Tuple[bool, str]:
        """
        Désactive le 2FA pour un utilisateur.
        
        Si code_2fa est fourni, on vérifie qu'il est valide avant de désactiver.
        """
        # Vérifier si le 2FA est activé
        user_2fa = self.db.query(Utilisateur2FA).filter(
            Utilisateur2FA.id_utilisateur == user_id,
            Utilisateur2FA.est_active == True
        ).first()
        
        if not user_2fa:
            return False, "Le 2FA n'est pas activé pour ce compte"
        
        # Vérifier le code si fourni
        if code_2fa and not self.totp.verify_code(user_2fa.totp_secret, code_2fa):
            return False, "Code 2FA invalide"
        
        # Désactiver (soft delete)
        user_2fa.est_active = False
        self.db.commit()
        
        self._log_securite(user_id, "DESACTIVATION_2FA", True, "2FA désactivé")
        
        return True, "2FA désactivé avec succès"
    
    def get_2fa_status(self, user_id: str) -> Dict[str, Any]:
        """
        Retourne le statut du 2FA pour un utilisateur.
        """
        user_2fa = self.db.query(Utilisateur2FA).filter(
            Utilisateur2FA.id_utilisateur == user_id,
            Utilisateur2FA.est_active == True
        ).first()
        
        return {
            "enabled": user_2fa is not None,
            "activated_at": user_2fa.date_activation if user_2fa else None
        }
    
    # ============================================
    # MÉTHODES EXISTANTES (inchangées)
    # ============================================
    
    def _get_user_role(self, user_id: str) -> Optional[str]:
        """
        Détermine le rôle d'un utilisateur en vérifiant les tables filles.
        """
        agent = self.db.query(AgentOfficiel).filter(
            AgentOfficiel.id_utilisateur == user_id
        ).first()
        if agent:
            return "Agent Officiel"
        
        admin = self.db.query(Administrateur).filter(
            Administrateur.id_utilisateur == user_id
        ).first()
        if admin:
            return "Administrateur"
        
        citoyen = self.db.query(Citoyen).filter(
            Citoyen.id_utilisateur == user_id
        ).first()
        if citoyen:
            return "citoyen(ou organisation)"
        
        return None
    
    def _log_securite(self, user_id: Optional[str], action: str, succes: bool, details: str):
        """Enregistre un événement dans les logs de sécurité."""
        if user_id is None:
            return
        
        log = LogSecurite(
            id_utilisateur=user_id,
            type_action=action,
            succes=succes,
            details=details
        )
        self.db.add(log)
        self.db.commit()
    
    def get_current_user(self, token: str) -> Optional[Utilisateur]:
        """
        À partir d'un token JWT, retrouve l'utilisateur en base de données.
        """
        payload = decode_access_token(token)
        if not payload:
            return None
        
        user_id = payload.get("sub")
        if not user_id:
            return None
        
        utilisateur = self.db.query(Utilisateur).filter(
            Utilisateur.id_utilisateur == user_id
        ).first()
        
        return utilisateur
    
    def register_user(self, user_data: dict) -> tuple[bool, str, Optional[str]]:
        """
        Inscription d'un nouvel utilisateur.
        """
        try:
            # Vérifier si l'email existe déjà
            existing_user = self.db.query(Utilisateur).filter(
                Utilisateur.email == user_data["email"]
            ).first()
            
            if existing_user:
                return False, "Cet email est déjà utilisé", None
            
            # Hacher le mot de passe
            hashed_password = hash_password(user_data["mot_de_passe"])
            
            # Créer l'utilisateur de base
            nouveau_utilisateur = Utilisateur(
                nom=user_data["nom"],
                prenom=user_data["prenom"],
                email=user_data["email"],
                mot_de_passe=hashed_password
            )
            
            self.db.add(nouveau_utilisateur)
            self.db.flush()
            
            # Créer l'enregistrement spécifique selon le type
            type_user = user_data["type_utilisateur"]
            
            if type_user == "agent_officiel":
                agent = AgentOfficiel(
                    id_utilisateur=nouveau_utilisateur.id_utilisateur,
                    id_institution=user_data.get("id_institution", "INST_DEFAULT"),
                    fonction=user_data.get("fonction", "Agent"),
                    departement=user_data.get("departement"),
                    matricule=user_data.get("matricule")
                )
                self.db.add(agent)
                
            elif type_user == "administrateur":
                admin = Administrateur(
                    id_utilisateur=nouveau_utilisateur.id_utilisateur,
                    niveau_habilitation=user_data.get("niveau_habilitation", "ADMIN_SYSTEME")
                )
                self.db.add(admin)
                
            elif type_user == "citoyen":
                citoyen = Citoyen(
                    id_utilisateur=nouveau_utilisateur.id_utilisateur,
                    id_session=user_data.get("id_session"),
                    ip_adresse=user_data.get("ip_adresse")
                )
                self.db.add(citoyen)
            
            else:
                return False, f"Type d'utilisateur inconnu: {type_user}", None
            
            self.db.commit()
            
            self._log_securite(nouveau_utilisateur.id_utilisateur, "CREATION_UTILISATEUR", True, 
                              f"Inscription réussie en tant que {type_user}")
            
            return True, "Inscription réussie", nouveau_utilisateur.id_utilisateur
            
        except Exception as e:
            self.db.rollback()
            print(f"Erreur lors de l'inscription: {e}")
            return False, f"Erreur technique: {str(e)}", None
    
    # ============================================
    # NOUVELLES MÉTHODES PRIVÉES POUR LE 2FA
    # ============================================
    
    def _has_2fa_enabled(self, user_id: str) -> bool:
        """Vérifie si un utilisateur a activé le 2FA."""
        user_2fa = self.db.query(Utilisateur2FA).filter(
            Utilisateur2FA.id_utilisateur == user_id,
            Utilisateur2FA.est_active == True
        ).first()
        return user_2fa is not None
    
    def _verify_user_2fa_code(self, user_id: str, code: str) -> bool:
        """Vérifie le code 2FA d'un utilisateur."""
        user_2fa = self.db.query(Utilisateur2FA).filter(
            Utilisateur2FA.id_utilisateur == user_id,
            Utilisateur2FA.est_active == True
        ).first()
        
        if not user_2fa:
            return False
        
        return self.totp.verify_code(user_2fa.totp_secret, code)
    
    def _create_temporary_token(self, user_id: str) -> str:
        """Crée un token temporaire pour l'étape 2FA (expire en 5 minutes)."""
        token_data = {
            "sub": user_id,
            "temp": True,
            "purpose": "2fa_verification"
        }
        return create_access_token(token_data, expires_delta=timedelta(minutes=5))


# ============================================
# FONCTIONS INDÉPENDANTES (API simplifiée)
# ============================================

def authenticate_user(db: Session, email: str, password: str) -> Tuple[bool, Optional[str], Optional[str], Optional[str], Optional[Dict]]:
    """
    Fonction simple pour authentifier un utilisateur (avec support 2FA).
    """
    auth_service = AuthService(db)
    return auth_service.login(email, password)


def register_user(db: Session, user_data: dict) -> tuple[bool, str, Optional[str]]:
    """
    Fonction utilitaire pour l'inscription.
    """
    auth_service = AuthService(db)
    return auth_service.register_user(user_data)


def verify_2fa_code(db: Session, temp_token: str, code: str) -> Tuple[bool, str, Optional[str], Optional[str]]:
    """
    Fonction utilitaire pour vérifier le code 2FA.
    """
    auth_service = AuthService(db)
    return auth_service.verify_2fa(temp_token, code)