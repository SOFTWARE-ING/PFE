"""
schemas.py — Pydantic v2 Schemas
Système de Signature et Gestion des Communiqués Officiels
==========================================================
CE FICHIER DÉFINIT LA STRUCTURE DES DONNÉES POUR LES REQUÊTES ET RÉPONSES API
=============================================================================
Ce fichier contient tous les "schémas" qui valident et structurent les données
qui entrent et sortent de l'API. Chaque classe définit un format de données
spécifique (création, lecture, mise à jour, etc.)

Convention de nommage :
  - <Entité>Base        : champs partagés (create + read)
  - <Entité>Create      : payload de création (entrée API)
  - <Entité>Update      : payload de mise à jour (PATCH partiel)
  - <Entité>Response    : réponse API complète (lecture)
  - <Entité>Summary     : réponse légère (listes paginées)

Tous les schémas utilisent model_config avec from_attributes=True
pour la compatibilité ORM SQLAlchemy.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Configuration commune
# ---------------------------------------------------------------------------

class _OrmBase(BaseModel):
    """Base Pydantic avec support ORM (from_attributes) et population par alias."""
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)


# ===========================================================================
# ENUMS / CONSTANTES DE VALIDATION
# ===========================================================================
# EXPLICATION : Ces constantes définissent les valeurs autorisées pour certains champs.
# Elles servent à valider que les données reçues sont correctes.

STATUTS_COMMUNIQUE = {"BROUILLON", "PUBLIE", "ARCHIVE", "REJETE"}
NIVEAUX_HABILITATION = {"SUPER_ADMIN", "ADMIN_SECURITE", "ADMIN_SYSTEME"}
ALGORITHMES_HACHAGE = {"SHA256", "SHA512", "RSA-SHA256", "RSA-SHA512"}
TYPES_ACTIONS_LOG = {
    "CONNEXION", "DECONNEXION",
    "PUBLICATION_COMMUNIQUE", "MODIFICATION_COMMUNIQUE",
    "SUPPRESSION_COMMUNIQUE", "ARCHIVAGE_COMMUNIQUE",
    "SIGNATURE_COMMUNIQUE", "VERIFICATION_SIGNATURE",
    "GENERATION_CLE", "RENOUVELLEMENT_CLE",
    "CREATION_UTILISATEUR", "MODIFICATION_PROFIL", "SUPPRESSION_UTILISATEUR",
    "CONSULTATION_COMMUNIQUE", "EXPORT_DONNEES", "SAUVEGARDE_BASE",
}


# ===========================================================================
# PAGINATION GÉNÉRIQUE
# ===========================================================================
# EXPLICATION : Ces schémas gèrent le découpage des résultats en pages
# pour éviter de renvoyer trop de données d'un coup.

class PaginationParams(BaseModel):
    """Paramètres de pagination pour les endpoints de liste."""
    page:  int = Field(default=1,  ge=1,  description="Numéro de page (commence à 1)")
    limit: int = Field(default=20, ge=1, le=200, description="Éléments par page (max 200)")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


class PaginatedResponse(_OrmBase):
    """Enveloppe standard pour toutes les réponses paginées."""
    total:   int         = Field(description="Nombre total d'éléments")
    page:    int         = Field(description="Page courante")
    limit:   int         = Field(description="Taille de page")
    pages:   int         = Field(description="Nombre total de pages")
    items:   List[Any]   = Field(description="Éléments de la page courante")


class APIResponse(_OrmBase):
    """Réponse générique pour les opérations sans corps de retour."""
    success: bool = True
    message: str  = ""
    data:    Optional[Any] = None


# ===========================================================================
# ─── UTILISATEUR ────────────────────────────────────────────────────────────
# ===========================================================================
# EXPLICATION : Schémas pour gérer les utilisateurs (création, lecture, mise à jour)

class UtilisateurBase(_OrmBase):
    nom:    str = Field(..., min_length=1, max_length=100, description="Nom de famille")
    prenom: str = Field(..., min_length=1, max_length=100, description="Prénom")
    email:  EmailStr = Field(..., description="Adresse email unique")


class UtilisateurCreate(UtilisateurBase):
    """Payload de création d'un utilisateur."""
    mot_de_passe:       str = Field(..., min_length=8, description="Mot de passe en clair (haché côté serveur)")
    confirmer_mot_de_passe: str = Field(..., min_length=8)

    @model_validator(mode="after")
    def passwords_match(self) -> "UtilisateurCreate":
        if self.mot_de_passe != self.confirmer_mot_de_passe:
            raise ValueError("Les mots de passe ne correspondent pas.")
        return self


class UtilisateurUpdate(_OrmBase):
    """Mise à jour partielle d'un utilisateur (PATCH)."""
    nom:    Optional[str]      = Field(default=None, max_length=100)
    prenom: Optional[str]      = Field(default=None, max_length=100)
    email:  Optional[EmailStr] = None


class UtilisateurChangePassword(_OrmBase):
    """Changement de mot de passe sécurisé."""
    ancien_mot_de_passe:    str = Field(..., min_length=8)
    nouveau_mot_de_passe:   str = Field(..., min_length=8)
    confirmer_mot_de_passe: str = Field(..., min_length=8)

    @model_validator(mode="after")
    def passwords_match(self) -> "UtilisateurChangePassword":
        if self.nouveau_mot_de_passe != self.confirmer_mot_de_passe:
            raise ValueError("Les nouveaux mots de passe ne correspondent pas.")
        return self


class UtilisateurResponse(UtilisateurBase):
    """Réponse complète d'un utilisateur (sans mot de passe)."""
    id_utilisateur: str
    date_creation:  datetime
    role:           Optional[str] = Field(default=None, description="agent_officiel | administrateur | citoyen")


class UtilisateurSummary(_OrmBase):
    """Vue allégée pour les listes."""
    id_utilisateur: str
    nom:            str
    prenom:         str
    email:          EmailStr


# ===========================================================================
# ─── AGENT OFFICIEL ─────────────────────────────────────────────────────────
# ===========================================================================
# EXPLICATION : Schémas pour les agents officiels (ceux qui peuvent signer des communiqués)

class AgentOfficielBase(_OrmBase):
    id_institution: str = Field(..., max_length=36, description="Identifiant de l'institution")
    fonction:       str = Field(..., max_length=100)
    departement:    Optional[str] = Field(default=None, max_length=100)
    matricule:      Optional[str] = Field(default=None, max_length=50)


class AgentOfficielCreate(AgentOfficielBase):
    """Payload d'enregistrement d'un agent (crée aussi l'utilisateur parent)."""
    # Champs utilisateur
    nom:                    str      = Field(..., min_length=1, max_length=100)
    prenom:                 str      = Field(..., min_length=1, max_length=100)
    email:                  EmailStr
    mot_de_passe:           str      = Field(..., min_length=8)
    confirmer_mot_de_passe: str      = Field(..., min_length=8)

    @model_validator(mode="after")
    def passwords_match(self) -> "AgentOfficielCreate":
        if self.mot_de_passe != self.confirmer_mot_de_passe:
            raise ValueError("Les mots de passe ne correspondent pas.")
        return self


class AgentOfficielUpdate(_OrmBase):
    """Mise à jour partielle d'un agent."""
    id_institution: Optional[str] = Field(default=None, max_length=36)
    fonction:       Optional[str] = Field(default=None, max_length=100)
    departement:    Optional[str] = Field(default=None, max_length=100)
    matricule:      Optional[str] = Field(default=None, max_length=50)


class AgentOfficielResponse(AgentOfficielBase):
    """Réponse complète d'un agent avec ses informations utilisateur."""
    id_utilisateur: str
    utilisateur:    UtilisateurSummary


class AgentOfficielSummary(_OrmBase):
    """Vue allégée d'un agent pour les listes et les jointures."""
    id_utilisateur: str
    nom:            str
    prenom:         str
    email:          EmailStr
    fonction:       str
    matricule:      Optional[str]


# ===========================================================================
# ─── ADMINISTRATEUR ─────────────────────────────────────────────────────────
# ===========================================================================
# EXPLICATION : Schémas pour les administrateurs (gestion du système)

class AdministrateurBase(_OrmBase):
    niveau_habilitation: str = Field(
        ..., description=f"Niveau parmi : {NIVEAUX_HABILITATION}"
    )

    @field_validator("niveau_habilitation")
    @classmethod
    def valider_niveau(cls, v: str) -> str:
        if v not in NIVEAUX_HABILITATION:
            raise ValueError(f"Niveau invalide. Valeurs acceptées : {NIVEAUX_HABILITATION}")
        return v


class AdministrateurCreate(AdministrateurBase):
    """Payload de création d'un administrateur (crée aussi l'utilisateur parent)."""
    nom:                    str      = Field(..., min_length=1, max_length=100)
    prenom:                 str      = Field(..., min_length=1, max_length=100)
    email:                  EmailStr
    mot_de_passe:           str      = Field(..., min_length=8)
    confirmer_mot_de_passe: str      = Field(..., min_length=8)

    @model_validator(mode="after")
    def passwords_match(self) -> "AdministrateurCreate":
        if self.mot_de_passe != self.confirmer_mot_de_passe:
            raise ValueError("Les mots de passe ne correspondent pas.")
        return self


class AdministrateurUpdate(_OrmBase):
    niveau_habilitation: Optional[str] = None

    @field_validator("niveau_habilitation")
    @classmethod
    def valider_niveau(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in NIVEAUX_HABILITATION:
            raise ValueError(f"Niveau invalide. Valeurs acceptées : {NIVEAUX_HABILITATION}")
        return v


class AdministrateurResponse(AdministrateurBase):
    id_utilisateur:      str
    utilisateur:         UtilisateurSummary


# ===========================================================================
# ─── CITOYEN ────────────────────────────────────────────────────────────────
# ===========================================================================
# EXPLICATION : Schémas pour les citoyens (consultation publique)

class CitoyenBase(_OrmBase):
    id_session: Optional[str] = Field(default=None, max_length=255)
    ip_adresse: Optional[str] = Field(default=None, max_length=45)


class CitoyenCreate(CitoyenBase):
    """Payload d'enregistrement d'un citoyen."""
    nom:                    str      = Field(..., min_length=1, max_length=100)
    prenom:                 str      = Field(..., min_length=1, max_length=100)
    email:                  EmailStr
    mot_de_passe:           str      = Field(..., min_length=8)
    confirmer_mot_de_passe: str      = Field(..., min_length=8)

    @model_validator(mode="after")
    def passwords_match(self) -> "CitoyenCreate":
        if self.mot_de_passe != self.confirmer_mot_de_passe:
            raise ValueError("Les mots de passe ne correspondent pas.")
        return self


class CitoyenUpdate(_OrmBase):
    id_session: Optional[str] = None
    ip_adresse: Optional[str] = None


class CitoyenResponse(CitoyenBase):
    id_utilisateur: str
    utilisateur:    UtilisateurSummary


# ===========================================================================
# ─── COMMUNIQUÉ ─────────────────────────────────────────────────────────────
# ===========================================================================
# EXPLICATION : Schémas pour les communiqués officiels (documents à signer)

class CommuniqueBase(_OrmBase):
    titre:  str = Field(..., min_length=3, max_length=255)
    contenu: str = Field(..., min_length=10)


class CommuniqueCreate(CommuniqueBase):
    """
    Création d'un communiqué.
    Le hash_contenu est calculé automatiquement côté serveur (SHA-256).
    """
    statut:  str = Field(default="BROUILLON")
    qr_code: Optional[str] = None

    @field_validator("statut")
    @classmethod
    def valider_statut(cls, v: str) -> str:
        if v not in STATUTS_COMMUNIQUE:
            raise ValueError(f"Statut invalide. Valeurs acceptées : {STATUTS_COMMUNIQUE}")
        return v


class CommuniqueUpdate(_OrmBase):
    """Mise à jour partielle d'un communiqué (PATCH)."""
    titre:   Optional[str] = Field(default=None, min_length=3, max_length=255)
    contenu: Optional[str] = Field(default=None, min_length=10)
    statut:  Optional[str] = None
    qr_code: Optional[str] = None

    @field_validator("statut")
    @classmethod
    def valider_statut(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in STATUTS_COMMUNIQUE:
            raise ValueError(f"Statut invalide. Valeurs acceptées : {STATUTS_COMMUNIQUE}")
        return v


class CommuniquePublish(_OrmBase):
    """Payload pour publier un communiqué (change statut → PUBLIE)."""
    generer_qr: bool = Field(default=True, description="Générer automatiquement un QR code")


class CommuniqueResponse(CommuniqueBase):
    """Réponse complète d'un communiqué."""
    id_communique:    str
    date_publication: datetime
    hash_contenu:     str
    qr_code:          Optional[str]
    statut:           str
    nb_signatures:    Optional[int] = Field(default=None, description="Nombre de signatures valides")
    nb_consultations: Optional[int] = Field(default=None, description="Nombre de consultations")


class CommuniqueSummary(_OrmBase):
    """Vue allégée pour les listes."""
    id_communique:    str
    titre:            str
    statut:           str
    date_publication: datetime
    nb_signatures:    Optional[int] = None


# ===========================================================================
# ─── ARCHIVE ────────────────────────────────────────────────────────────────
# ===========================================================================
# EXPLICATION : Schémas pour les archives (stockage des PDF)

class ArchiveBase(_OrmBase):
    chemin_stockage: str  = Field(..., max_length=500)
    taille_fichier:  Optional[int] = Field(default=None, ge=0, description="Taille en octets")


class ArchiveCreate(ArchiveBase):
    """Payload de création d'une archive pour un communiqué donné."""
    id_communique: str = Field(..., max_length=36)


class ArchiveResponse(ArchiveBase):
    id_archive:     str
    id_communique:  str
    date_archivage: datetime
    # Taille lisible optionnelle calculée côté réponse
    taille_lisible: Optional[str] = Field(default=None, description="Ex: '2.0 MB'")


# ===========================================================================
# ─── LOG SÉCURITÉ ────────────────────────────────────────────────────────────
# ===========================================================================
# EXPLICATION : Schémas pour les journaux de sécurité (traçabilité)

class LogSecuriteCreate(_OrmBase):
    """Payload interne pour créer un log (utilisé par le service d'audit)."""
    id_utilisateur: str
    type_action:    str = Field(..., max_length=100)
    succes:         bool
    details:        Optional[str] = None

    @field_validator("type_action")
    @classmethod
    def valider_type_action(cls, v: str) -> str:
        # On accepte aussi les types non listés pour l'extensibilité
        return v.upper()


class LogSecuriteResponse(_OrmBase):
    """Réponse lecture d'un log."""
    id_log:        str
    id_utilisateur: str
    type_action:   str
    date_action:   datetime
    succes:        bool
    details:       Optional[str]
    # Dénormalisation optionnelle pour l'affichage
    nom_utilisateur: Optional[str] = None


class LogSecuriteFilter(_OrmBase):
    """Filtres pour la recherche de logs (query params)."""
    id_utilisateur: Optional[str]      = None
    type_action:    Optional[str]      = None
    succes:         Optional[bool]     = None
    date_debut:     Optional[datetime] = None
    date_fin:       Optional[datetime] = None


# ===========================================================================
# ─── CLÉ CRYPTOGRAPHIQUE ─────────────────────────────────────────────────────
# ===========================================================================
# EXPLICATION : Schémas pour les clés RSA (signature numérique)

class CleCryptographiqueCreate(_OrmBase):
    """Payload de stockage d'une paire de clés (générées côté application)."""
    id_agent_officiel:   str      = Field(..., max_length=36)
    cle_publique:        str      = Field(..., description="Clé publique PEM")
    cle_privee_chiffree: str      = Field(..., description="Clé privée chiffrée AES-256")
    date_expiration:     datetime = Field(..., description="Date d'expiration de la clé")


class CleCryptographiqueResponse(_OrmBase):
    """Réponse lecture d'une clé (la clé privée n'est JAMAIS exposée)."""
    id_cle:            str
    id_agent_officiel: str
    cle_publique:      str
    date_creation:     datetime
    date_expiration:   datetime
    est_expiree:       Optional[bool] = Field(
        default=None, description="True si date_expiration < maintenant"
    )


class CleCryptographiqueSummary(_OrmBase):
    """Vue allégée : indique si l'agent a une clé valide active."""
    id_cle:           str
    date_expiration:  datetime
    est_expiree:      bool


# ===========================================================================
# ─── SIGNATURE ───────────────────────────────────────────────────────────────
# ===========================================================================
# EXPLICATION : Schémas pour les signatures numériques des communiqués

class SignatureCreate(_OrmBase):
    """
    Payload de création d'une signature.
    La valeur_signature est la signature RSA encodée en base64.
    """
    id_communique:      str = Field(..., max_length=36)
    id_agent_officiel:  str = Field(..., max_length=36)
    valeur_signature:   str = Field(..., description="Signature RSA-SHA256 en base64")
    algorithme_hachage: str = Field(default="SHA256")

    @field_validator("algorithme_hachage")
    @classmethod
    def valider_algo(cls, v: str) -> str:
        if v.upper() not in ALGORITHMES_HACHAGE:
            raise ValueError(f"Algorithme invalide. Valeurs acceptées : {ALGORITHMES_HACHAGE}")
        return v.upper()


class SignatureVerify(_OrmBase):
    """Payload de vérification d'une signature existante."""
    id_signature: str = Field(..., description="ID de la signature à vérifier")


class SignatureResponse(_OrmBase):
    """Réponse complète d'une signature."""
    id_signature:       str
    id_communique:      str
    id_agent_officiel:  str
    valeur_signature:   str
    algorithme_hachage: str
    date_signature:     datetime
    est_valide:         bool
    agent_info:         Optional[AgentOfficielSummary] = None


class SignatureVerifyResponse(_OrmBase):
    """Résultat d'une vérification de signature."""
    id_signature: str
    est_valide:   bool
    message:      str
    verifie_le:   datetime


# ===========================================================================
# ─── CONSULTATION ────────────────────────────────────────────────────────────
# ===========================================================================
# EXPLICATION : Schémas pour enregistrer les consultations de communiqués

class ConsultationCreate(_OrmBase):
    """Enregistrement d'une consultation (déclenché automatiquement à la lecture)."""
    id_utilisateur: str = Field(..., max_length=36)
    id_communique:  str = Field(..., max_length=36)


class ConsultationResponse(_OrmBase):
    id_utilisateur:   str
    id_communique:    str
    date_consultation: datetime


class ConsultationStats(_OrmBase):
    """Statistiques de consultation d'un communiqué."""
    id_communique:       str
    titre:               str
    nb_consultations:    int
    nb_citoyens_uniques: int


# ===========================================================================
# ─── AUTH / OTP ──────────────────────────────────────────────────────────────
# ===========================================================================
# EXPLICATION : Schémas pour l'authentification (connexion + double facteur)

class LoginRequest(_OrmBase):
    """Première étape d'authentification : email + mot de passe."""
    email:        EmailStr
    mot_de_passe: str = Field(..., min_length=8)


class LoginResponse(_OrmBase):
    """Réponse à la connexion."""
    success: bool
    message: str
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    id_utilisateur: Optional[str] = None
    requires_otp: bool = False


class OtpVerifyRequest(_OrmBase):
    """Deuxième étape d'authentification : vérification du code OTP."""
    id_utilisateur: str
    code_otp:       str = Field(..., min_length=6, max_length=10)


class OtpVerifyResponse(_OrmBase):
    """Réponse à la vérification OTP : token JWT en cas de succès."""
    success:      bool
    message:      str
    access_token: Optional[str]   = None
    token_type:   Optional[str]   = "bearer"
    expires_in:   Optional[int]   = Field(default=None, description="Durée de validité en secondes")


class AuthOtpResponse(_OrmBase):
    """Réponse lecture d'un OTP (usage interne / admin)."""
    id_otp:          str
    id_utilisateur:  str
    date_creation:   datetime
    date_expiration: datetime
    est_utilise:     bool


class TokenPayload(_OrmBase):
    """Payload décodé d'un JWT."""
    sub:         str              = Field(description="id_utilisateur")
    email:       str
    role:        str              = Field(description="agent_officiel | administrateur | citoyen")
    habilitation: Optional[str]  = Field(default=None, description="Niveau admin si applicable")
    exp:         Optional[int]   = None
    iat:         Optional[int]   = None


# ===========================================================================
# ─── STATISTIQUES GLOBALES ───────────────────────────────────────────────────
# ===========================================================================
# EXPLICATION : Schémas pour les tableaux de bord et statistiques

class StatistiquesGlobales(_OrmBase):
    """Tableau de bord — indicateurs clés."""
    nb_utilisateurs:         int
    nb_agents:               int
    nb_administrateurs:      int
    nb_citoyens:             int
    nb_communiques:          int
    nb_communiques_publies:  int
    nb_communiques_brouillon: int
    nb_signatures_valides:   int
    nb_consultations_total:  int
    nb_archives:             int
    nb_logs_audit:           int


class StatistiquesAgent(_OrmBase):
    """Statistiques de signature par agent."""
    id_utilisateur:           str
    nom:                      str
    prenom:                   str
    nb_signatures:            int
    nb_communiques_signes:    int


class ActiviteUtilisateur(_OrmBase):
    """Activité récente d'un utilisateur."""
    nom:             str
    prenom:          str
    email:           EmailStr
    nb_actions:      int
    derniere_action: Optional[datetime]


# Ajouter à la fin de schemas.py

class OtpVerifyRequest(_OrmBase):
    """Requête de vérification 2FA."""
    temp_token: str = Field(..., description="Token temporaire reçu au login")
    code_2fa: str = Field(..., min_length=6, max_length=6, description="Code à 6 chiffres de Google Authenticator")


class OtpVerifyResponse(_OrmBase):
    """Réponse après vérification 2FA."""
    success: bool
    message: str
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    expires_in: Optional[int] = Field(default=None, description="Durée de validité en secondes")


class Verify2FARequest(_OrmBase):
    """Requête de vérification 2FA."""
    temp_token: str = Field(..., description="Token temporaire reçu au login")
    code_2fa: str = Field(..., min_length=6, max_length=6, description="Code à 6 chiffres de Google Authenticator")


class Verify2FAResponse(_OrmBase):
    """Réponse après vérification 2FA."""
    success: bool
    message: str
    access_token: Optional[str] = None
    token_type: str = "bearer"
    id_utilisateur: Optional[str] = None
    expires_in: int = 1800  # 30 minutes en secondes

class BackupCodesResponse(BaseModel):
    """Réponse avec les codes de secours."""
    backup_codes: List[str]
    message: str = "Conservez ces codes dans un endroit sûr. Chaque code ne peut être utilisé qu'une fois."

class Enable2FAResponse(BaseModel):
    """Réponse pour l'activation du 2FA."""
    success: bool
    message: str
    secret: Optional[str] = None
    qr_code: Optional[str] = None
    instruction: str = "Scannez ce QR code avec Google Authenticator"