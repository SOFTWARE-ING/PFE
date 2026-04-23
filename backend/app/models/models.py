"""
models.py — SQLAlchemy ORM Models
Système de Signature et Gestion des Communiqués Officiels
==========================================================
Héritage UML : Utilisateur (table mère) → AgentOfficiel / Administrateur / Citoyen

CE FICHIER DÉFINIT LA STRUCTURE DE LA BASE DE DONNÉES
=====================================================
Ce fichier contient tous les "modèles" qui représentent les tables de la base de données.
Chaque classe Python correspond à une table dans la base de données.
Chaque attribut (variable) dans la classe correspond à une colonne dans la table.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field
from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    ForeignKey,
    Index,
    String,
    Text,
    DateTime,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func


# ---------------------------------------------------------------------------
# Base déclarative commune
# ---------------------------------------------------------------------------

class Base(DeclarativeBase):
    """Base class pour tous les modèles SQLAlchemy."""
    pass


def _new_uuid() -> str:
    """Génère un UUID v4 sous forme de chaîne (compatible PostgreSQL gen_random_uuid)."""
    return str(uuid.uuid4())


# ===========================================================================
# 1. TABLE MÈRE — Utilisateur
# ===========================================================================
# EXPLICATION : C'est la table principale qui contient les informations
# communes à tous les types d'utilisateurs (agents, administrateurs, citoyens)
# Chaque utilisateur a un identifiant unique, un nom, un prénom, un email,
# un mot de passe et une date de création.
# ===========================================================================

class Utilisateur(Base):
    """
    Table parent (héritage par table concrète).
    Stocke les attributs communs à tous les types d'utilisateurs.
    __table_args__ = {"schema": "mon_schema"}
    """
    __tablename__ = "utilisateur"
    __table_args__ = (
        Index("idx_utilisateur_email",        "email"),
        Index("idx_utilisateur_nom",          "nom"),
        Index("idx_utilisateur_prenom",       "prenom"),
        Index("idx_utilisateur_date_creation","date_creation"),
        Index("idx_utilisateur_nom_prenom",   "nom", "prenom"),
        {"schema": "signature_communiques_officiels"}
    )

    id_utilisateur: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=_new_uuid
    )
    nom:            Mapped[str]           = mapped_column(String(100), nullable=False)
    prenom:         Mapped[str]           = mapped_column(String(100), nullable=False)
    email:          Mapped[str]           = mapped_column(String(150), unique=True, nullable=False)
    mot_de_passe:   Mapped[str]           = mapped_column(String(255), nullable=False)
    date_creation:  Mapped[datetime]      = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )

    # ── Relations polymorphiques (one-to-one vers tables filles) ──
    agent_officiel:   Mapped[Optional["AgentOfficiel"]]   = relationship(
        back_populates="utilisateur", uselist=False, cascade="all, delete-orphan"
    )
    administrateur:   Mapped[Optional["Administrateur"]]  = relationship(
        back_populates="utilisateur", uselist=False, cascade="all, delete-orphan"
    )
    citoyen:          Mapped[Optional["Citoyen"]]         = relationship(
        back_populates="utilisateur", uselist=False, cascade="all, delete-orphan"
    )

    # ── Relations transversales ──
    logs_securite:    Mapped[List["LogSecurite"]]  = relationship(
        back_populates="utilisateur", cascade="all, delete-orphan"
    )
    auth_otps:        Mapped[List["AuthOtp"]]      = relationship(
        back_populates="utilisateur", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Utilisateur id={self.id_utilisateur} email={self.email}>"

# ===========================================================================
# 7. TABLE 2FA - SECRETS GOOGLE AUTHENTICATOR
# ===========================================================================

class Utilisateur2FA(Base):
    """
    Stocke les secrets TOTP pour le 2FA avec Google Authenticator.
    """
    __tablename__ = "utilisateur_2fa"
    __table_args__ = (
        Index("idx_2fa_utilisateur", "id_utilisateur"),
        Index("idx_2fa_active", "est_active"),
        {"schema": "signature_communiques_officiels"}
    )

    id_utilisateur: Mapped[str] = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.utilisateur.id_utilisateur", ondelete="CASCADE"),
        primary_key=True
    )
    totp_secret: Mapped[str] = mapped_column(String(32), nullable=False)
    date_activation: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    est_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ── Relations ──
    utilisateur: Mapped["Utilisateur"] = relationship()

    def __repr__(self) -> str:
        return f"<Utilisateur2FA user={self.id_utilisateur} active={self.est_active}>"

# ===========================================================================
# 2. TABLES FILLES (joined-table inheritance)
# ===========================================================================
# EXPLICATION : Ces trois tables complètent la table Utilisateur.
# Elles contiennent des informations spécifiques à chaque type d'utilisateur.
# ===========================================================================

class AgentOfficiel(Base):
    """
    Agent officiel : employé d'une institution gouvernementale autorisé
    à créer, signer et publier des communiqués.
    """
    __tablename__ = "agent_officiel"
    __table_args__ = (
        Index("idx_agent_institution",        "id_institution"),
        Index("idx_agent_fonction",           "fonction"),
        Index("idx_agent_departement",        "departement"),
        Index("idx_agent_matricule",          "matricule"),
        Index("idx_agent_institution_fonction","id_institution", "fonction"),
        Index("idx_user_agent_join",          "id_utilisateur", "id_institution", "fonction"),
        {"schema": "signature_communiques_officiels"}
    )

    id_utilisateur:  Mapped[str] = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.utilisateur.id_utilisateur", ondelete="CASCADE"),
        primary_key=True
    )
    id_institution:  Mapped[str]            = mapped_column(String(36), nullable=False)
    fonction:        Mapped[str]            = mapped_column(String(100), nullable=False)
    departement:     Mapped[Optional[str]]  = mapped_column(String(100), nullable=True)
    matricule:       Mapped[Optional[str]]  = mapped_column(String(50), unique=True, nullable=True)

    # ── Relations ──
    utilisateur:          Mapped["Utilisateur"]         = relationship(back_populates="agent_officiel")
    cles_cryptographiques: Mapped[List["CleCryptographique"]] = relationship(
        back_populates="agent_officiel", cascade="all, delete-orphan"
    )
    signatures:           Mapped[List["Signature"]]     = relationship(
        back_populates="agent_officiel", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<AgentOfficiel matricule={self.matricule} institution={self.id_institution}>"


class Administrateur(Base):
    """
    Administrateur système : gestion des utilisateurs, audit, sauvegardes.
    Niveau d'habilitation : SUPER_ADMIN / ADMIN_SECURITE / ADMIN_SYSTEME.
    """
    __tablename__ = "administrateur"
    __table_args__ = (
        Index("idx_admin_niveau", "niveau_habilitation"),
        {"schema": "signature_communiques_officiels"}
    )

    id_utilisateur:      Mapped[str] = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.utilisateur.id_utilisateur", ondelete="CASCADE"),
        primary_key=True
    )
    niveau_habilitation: Mapped[str] = mapped_column(String(50), nullable=False)

    # ── Relations ──
    utilisateur: Mapped["Utilisateur"] = relationship(back_populates="administrateur")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Administrateur niveau={self.niveau_habilitation}>"


class Citoyen(Base):
    """
    Citoyen : utilisateur public, peut uniquement consulter les communiqués publiés.
    La session et l'IP permettent un suivi léger sans authentification forte.
    """
    __tablename__ = "citoyen"
    __table_args__ = (
        Index("idx_citoyen_ip",         "ip_adresse"),
        Index("idx_citoyen_session",    "id_session"),
        Index("idx_citoyen_ip_session", "ip_adresse", "id_session"),
        {"schema": "signature_communiques_officiels"}
    )

    id_utilisateur: Mapped[str] = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.utilisateur.id_utilisateur", ondelete="CASCADE"),
        primary_key=True
    )
    id_session:  Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_adresse:  Mapped[Optional[str]] = mapped_column(String(45),  nullable=True)

    # ── Relations ──
    utilisateur:    Mapped["Utilisateur"]                        = relationship(back_populates="citoyen")
    consultations:  Mapped[List["ConsultationCitoyenCommunique"]] = relationship(
        back_populates="citoyen", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Citoyen id={self.id_utilisateur} ip={self.ip_adresse}>"


# ===========================================================================
# 3. ENTITÉS PRINCIPALES
# ===========================================================================
# EXPLICATION : Ces tables représentent le coeur du système.
# Un communiqué est un document officiel qui peut être archivé.
# ===========================================================================

class Communique(Base):
    """
    Communiqué officiel : document public signé numériquement par un ou
    plusieurs agents officiels. Cycle de vie : BROUILLON → PUBLIE → ARCHIVE.
    """
    __tablename__ = "communique"
    __table_args__ = (
        Index("idx_communique_date_publication", "date_publication"),
        Index("idx_communique_statut",           "statut"),
        Index("idx_communique_titre",            "titre"),
        Index("idx_communique_hash",             "hash_contenu"),
        Index("idx_communique_statut_date",      "statut", "date_publication"),
        # Index partiel PostgreSQL : seulement les communiqués publiés
        Index(
            "idx_communique_publie",
            "statut", "date_publication",
            postgresql_where=Column("statut") == "PUBLIE",
        ),
        {"schema": "signature_communiques_officiels"}
    )

    id_communique:    Mapped[str]            = mapped_column(String(36), primary_key=True, default=_new_uuid)
    titre:            Mapped[str]            = mapped_column(String(255), nullable=False)
    contenu:          Mapped[str]            = mapped_column(Text, nullable=False)
    date_publication: Mapped[datetime]       = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    hash_contenu:     Mapped[str]            = mapped_column(String(255), nullable=False)
    qr_code:          Mapped[Optional[str]]  = mapped_column(Text, nullable=True)
    statut:           Mapped[str]            = mapped_column(String(50), default="BROUILLON", nullable=False)

    # ── Relations ──
    archives:      Mapped[List["Archive"]]                       = relationship(
        back_populates="communique", cascade="all, delete-orphan"
    )
    signatures:    Mapped[List["Signature"]]                     = relationship(
        back_populates="communique", cascade="all, delete-orphan"
    )
    consultations: Mapped[List["ConsultationCitoyenCommunique"]] = relationship(
        back_populates="communique", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Communique id={self.id_communique} statut={self.statut}>"


class Archive(Base):
    """
    Archive d'un communiqué : fichier PDF stocké après publication.
    Chemin de stockage relatif au volume de fichiers.
    """
    __tablename__ = "archive"
    __table_args__ = (
        Index("idx_archive_communique",      "id_communique"),
        Index("idx_archive_date_archivage",  "date_archivage"),
        Index("idx_archive_taille",          "taille_fichier"),
        Index("idx_archive_communique_join", "id_communique", "date_archivage"),
        {"schema": "signature_communiques_officiels"}
    )

    id_archive:       Mapped[str]            = mapped_column(String(36), primary_key=True, default=_new_uuid)
    id_communique:    Mapped[str]            = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.communique.id_communique", ondelete="CASCADE"), nullable=False
    )
    chemin_stockage:  Mapped[str]            = mapped_column(String(500), nullable=False)
    taille_fichier:   Mapped[Optional[int]]  = mapped_column(BigInteger, nullable=True)
    date_archivage:   Mapped[datetime]       = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )

    # ── Relations ──
    communique: Mapped["Communique"] = relationship(back_populates="archives")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Archive id={self.id_archive} communique={self.id_communique}>"


# ===========================================================================
# 4. ENTITÉS DE SÉCURITÉ & CRYPTOGRAPHIE
# ===========================================================================
# EXPLICATION : Ces tables gèrent la sécurité du système.
# - LogSecurite : journal de toutes les actions importantes
# - CleCryptographique : clés RSA pour signer numériquement
# - Signature : signatures numériques des communiqués
# ===========================================================================

class LogSecurite(Base):
    """
    Journal d'audit immuable : trace toutes les actions sensibles
    (connexion, publication, signature, export…).
    """
    __tablename__ = "logs_securite"
    __table_args__ = (
        Index("idx_logs_utilisateur",      "id_utilisateur"),
        Index("idx_logs_date_action",      "date_action"),
        Index("idx_logs_type_action",      "type_action"),
        Index("idx_logs_succes",           "succes"),
        Index("idx_logs_utilisateur_date", "id_utilisateur", "date_action"),
        Index("idx_logs_type_date",        "type_action",    "date_action"),
        Index("idx_logs_succes_date",      "succes",         "date_action"),
        # Index de couverture pour les requêtes d'audit complètes
        Index("idx_logs_cover",            "id_utilisateur", "date_action", "type_action", "succes"),
        {"schema": "signature_communiques_officiels"}
    )

    id_log:        Mapped[str]           = mapped_column(String(36), primary_key=True, default=_new_uuid)
    id_utilisateur: Mapped[str]          = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.utilisateur.id_utilisateur", ondelete="CASCADE"), nullable=False
    )
    type_action:   Mapped[str]           = mapped_column(String(100), nullable=False)
    date_action:   Mapped[datetime]      = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    succes:        Mapped[bool]          = mapped_column(Boolean, nullable=False)
    details:       Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # ── Relations ──
    utilisateur: Mapped["Utilisateur"] = relationship(back_populates="logs_securite")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<LogSecurite action={self.type_action} succes={self.succes}>"


class CleCryptographique(Base):
    """
    Paire de clés RSA d'un agent officiel.
    La clé privée est stockée chiffrée (AES-256 côté application).
    Rotation annuelle recommandée (date_expiration).
    """
    __tablename__ = "cle_cryptographique"
    __table_args__ = (
        Index("idx_cle_agent_officiel",  "id_agent_officiel"),
        Index("idx_cle_date_expiration", "date_expiration"),
        Index("idx_cle_creation",        "date_creation"),
        Index("idx_cle_agent_expiration","id_agent_officiel", "date_expiration"),
        {"schema": "signature_communiques_officiels"}
    )

    id_cle:              Mapped[str]      = mapped_column(String(36), primary_key=True, default=_new_uuid)
    id_agent_officiel:   Mapped[str]      = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.agent_officiel.id_utilisateur", ondelete="CASCADE"), nullable=False
    )
    cle_publique:        Mapped[str]      = mapped_column(Text, nullable=False)
    cle_privee_chiffree: Mapped[str]      = mapped_column(Text, nullable=False)
    date_creation:       Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    date_expiration:     Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)

    # ── Relations ──
    agent_officiel: Mapped["AgentOfficiel"] = relationship(back_populates="cles_cryptographiques")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<CleCryptographique id={self.id_cle} expire={self.date_expiration}>"


class Signature(Base):
    """
    Signature numérique d'un communiqué par un agent officiel.
    Plusieurs agents peuvent co-signer le même communiqué.
    La valeur_signature est la signature RSA-SHA256 encodée en base64.
    """
    __tablename__ = "signature"
    __table_args__ = (
        Index("idx_signature_communique",       "id_communique"),
        Index("idx_signature_agent",            "id_agent_officiel"),
        Index("idx_signature_date",             "date_signature"),
        Index("idx_signature_valide",           "est_valide"),
        Index("idx_signature_communique_valide","id_communique", "est_valide"),
        Index("idx_signature_agent_date",       "id_agent_officiel", "date_signature"),
        # Index de couverture
        Index("idx_signature_cover",            "id_communique", "id_agent_officiel", "est_valide", "date_signature"),
        Index("idx_signature_communique_join",  "id_communique", "id_agent_officiel", "est_valide"),
        {"schema": "signature_communiques_officiels"}
    )

    id_signature:       Mapped[str]      = mapped_column(String(36), primary_key=True, default=_new_uuid)
    id_communique:      Mapped[str]      = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.communique.id_communique", ondelete="CASCADE"), nullable=False
    )
    id_agent_officiel:  Mapped[str]      = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.agent_officiel.id_utilisateur", ondelete="CASCADE"), nullable=False
    )
    valeur_signature:   Mapped[str]      = mapped_column(Text, nullable=False)
    algorithme_hachage: Mapped[str]      = mapped_column(String(50), nullable=False, default="SHA256")
    date_signature:     Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    est_valide:         Mapped[bool]     = mapped_column(Boolean, default=True, nullable=False)

    # ── Relations ──
    communique:     Mapped["Communique"]    = relationship(back_populates="signatures")
    agent_officiel: Mapped["AgentOfficiel"] = relationship(back_populates="signatures")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Signature id={self.id_signature} valide={self.est_valide}>"


# ===========================================================================
# 5. TABLE DE LIAISON M:N — Consultation
# ===========================================================================
# EXPLICATION : Cette table enregistre qui a consulté quel communiqué et quand.
# C'est une table de liaison entre Citoyen et Communique (relation many-to-many).
# ===========================================================================

class ConsultationCitoyenCommunique(Base):
    """
    Enregistre chaque consultation d'un communiqué par un citoyen.
    Clé primaire composite (id_utilisateur, id_communique) : une seule
    entrée par paire, mais la date est mise à jour à chaque visite.
    """
    __tablename__ = "consultation_citoyen_communique"
    __table_args__ = (
        Index("idx_consultation_citoyen",         "id_utilisateur"),
        Index("idx_consultation_communique",      "id_communique"),
        Index("idx_consultation_date",            "date_consultation"),
        Index("idx_consultation_citoyen_date",    "id_utilisateur",  "date_consultation"),
        Index("idx_consultation_communique_date", "id_communique",   "date_consultation"),
        # Index de couverture
        Index("idx_consultation_cover",           "id_utilisateur", "id_communique", "date_consultation"),
        {"schema": "signature_communiques_officiels"}
    )

    id_utilisateur:   Mapped[str]      = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.citoyen.id_utilisateur", ondelete="CASCADE"), primary_key=True
    )
    id_communique:    Mapped[str]      = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.communique.id_communique", ondelete="CASCADE"), primary_key=True
    )
    date_consultation: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )

    # ── Relations ──
    citoyen:    Mapped["Citoyen"]    = relationship(back_populates="consultations")
    communique: Mapped["Communique"] = relationship(back_populates="consultations")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<Consultation citoyen={self.id_utilisateur} communique={self.id_communique}>"


# ===========================================================================
# 6. TABLE 2FA — OTP
# ===========================================================================
# EXPLICATION : Cette table gère l'authentification à deux facteurs.
# Les codes OTP (One-Time Password) sont à usage unique et expirent après 5 minutes.
# ===========================================================================

class AuthOtp(Base):
    """
    Code OTP à usage unique pour l'authentification à deux facteurs.
    Expire après 5 minutes. Marqué est_utilise=True après validation.
    """
    __tablename__ = "auth_otp"
    __table_args__ = (
        Index("idx_otp_user",       "id_utilisateur"),
        Index("idx_otp_expiration", "date_expiration"),
        {"schema": "signature_communiques_officiels"}
    )

    id_otp:          Mapped[str]      = mapped_column(String(36), primary_key=True, default=_new_uuid)
    id_utilisateur:  Mapped[str]      = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.utilisateur.id_utilisateur", ondelete="CASCADE"), nullable=False
    )
    code_otp:        Mapped[str]      = mapped_column(String(10), nullable=False)
    date_creation:   Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    date_expiration: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    est_utilise:     Mapped[bool]     = mapped_column(Boolean, default=False, nullable=False)

    # ── Relations ──
    utilisateur: Mapped["Utilisateur"] = relationship(back_populates="auth_otps")

    def __repr__(self) -> str:  # pragma: no cover
        return f"<AuthOtp utilisateur={self.id_utilisateur} utilise={self.est_utilise}>"
    

# Dans models.py, après la classe AuthOtp

class AuthEmailCode(Base):
    """
    Code 2FA envoyé par email (alternative à Google Authenticator).
    Expire après 5 minutes. Usage unique.
    """
    __tablename__ = "auth_email_code"
    __table_args__ = (
        Index("idx_email_code_user", "id_utilisateur"),
        Index("idx_email_code_expiration", "date_expiration"),
        {"schema": "signature_communiques_officiels"}
    )

    id_code: Mapped[str] = mapped_column(String(36), primary_key=True, default=_new_uuid)
    id_utilisateur: Mapped[str] = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.utilisateur.id_utilisateur", ondelete="CASCADE"),
        nullable=False
    )
    code: Mapped[str] = mapped_column(String(6), nullable=False)
    date_creation: Mapped[datetime] = mapped_column(
        DateTime(timezone=False), server_default=func.now(), nullable=False
    )
    date_expiration: Mapped[datetime] = mapped_column(DateTime(timezone=False), nullable=False)
    est_utilise: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    utilisateur: Mapped["Utilisateur"] = relationship()

    def __repr__(self) -> str:
        return f"<AuthEmailCode user={self.id_utilisateur} used={self.est_utilise}>"