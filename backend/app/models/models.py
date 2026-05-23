"""
models.py — SQLAlchemy ORM Models v3
Système SHIELD — Signature Numérique des Communiqués Officiels
==============================================================
NOUVEAUTÉS v3 :
  - Utilisateur.token_autorise         → contrôle accès par admin
  - Utilisateur.derniere_connexion     → suivi sessions
  - Utilisateur.session_token_hash     → détecter session active
  - PasswordResetToken                 → réinitialisation MDP
  - Utilisateur2FA.force_enabled       → 2FA imposé par admin
  - LogSecurite.ip_adresse / user_agent → contexte des logs
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy import (
    BigInteger, Boolean, Column, ForeignKey,
    Index, String, Text, DateTime, text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func


class Base(DeclarativeBase):
    pass


def _new_uuid() -> str:
    return str(uuid.uuid4())


# ===========================================================================
# 1. TABLE MÈRE — Utilisateur
# ===========================================================================

class Utilisateur(Base):
    __tablename__ = "utilisateur"
    __table_args__ = (
        Index("idx_utilisateur_email",         "email"),
        Index("idx_utilisateur_nom",           "nom"),
        Index("idx_utilisateur_prenom",        "prenom"),
        Index("idx_utilisateur_date_creation", "date_creation"),
        Index("idx_utilisateur_nom_prenom",    "nom", "prenom"),
        Index("idx_utilisateur_token",         "token_autorise"),
        Index("idx_utilisateur_session",       "session_token_hash"),
        {"schema": "signature_communiques_officiels"},
    )

    id_utilisateur:     Mapped[str]           = mapped_column(String(36), primary_key=True, default=_new_uuid)
    nom:                Mapped[str]           = mapped_column(String(100), nullable=False)
    prenom:             Mapped[str]           = mapped_column(String(100), nullable=False)
    email:              Mapped[str]           = mapped_column(String(255), unique=True, nullable=False)
    mot_de_passe:       Mapped[str]           = mapped_column(String(255), nullable=False)
    date_creation:      Mapped[datetime]      = mapped_column(DateTime, server_default=func.now(), nullable=False)

    # ── NOUVEAU v3 ──
    token_autorise:     Mapped[bool]          = mapped_column(Boolean, default=False, nullable=False)
    derniere_connexion: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    session_token_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Relations
    agent_officiel:  Mapped[Optional["AgentOfficiel"]]  = relationship(back_populates="utilisateur", uselist=False, cascade="all, delete-orphan")
    administrateur:  Mapped[Optional["Administrateur"]] = relationship(back_populates="utilisateur", uselist=False, cascade="all, delete-orphan")
    citoyen:         Mapped[Optional["Citoyen"]]        = relationship(back_populates="utilisateur", uselist=False, cascade="all, delete-orphan")
    logs_securite:   Mapped[List["LogSecurite"]]        = relationship(back_populates="utilisateur", cascade="all, delete-orphan")
    auth_otps:       Mapped[List["AuthOtp"]]            = relationship(back_populates="utilisateur", cascade="all, delete-orphan")
    reset_tokens:    Mapped[List["PasswordResetToken"]] = relationship(back_populates="utilisateur", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Utilisateur {self.email} token_ok={self.token_autorise}>"


# ===========================================================================
# 2. TABLE FILLE — Administrateur
# ===========================================================================

class Administrateur(Base):
    """
    Niveaux : SUPER_ADMIN | ADMIN_SYSTEME | ADMIN_SECURITE
    """
    __tablename__ = "administrateur"
    __table_args__ = (
        Index("idx_admin_niveau", "niveau_habilitation"),
        {"schema": "signature_communiques_officiels"},
    )

    id_utilisateur:      Mapped[str] = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.utilisateur.id_utilisateur", ondelete="CASCADE"), primary_key=True
    )
    niveau_habilitation: Mapped[str] = mapped_column(String(50), nullable=False, default="ADMIN_SYSTEME")

    utilisateur: Mapped["Utilisateur"] = relationship(back_populates="administrateur")

    def __repr__(self):
        return f"<Administrateur niveau={self.niveau_habilitation}>"


# ===========================================================================
# 3. TABLE FILLE — AgentOfficiel
# ===========================================================================

class AgentOfficiel(Base):
    __tablename__ = "agent_officiel"
    __table_args__ = (
        Index("idx_agent_institution",          "id_institution"),
        Index("idx_agent_fonction",             "fonction"),
        Index("idx_agent_matricule",            "matricule"),
        Index("idx_agent_institution_fonction", "id_institution", "fonction"),
        {"schema": "signature_communiques_officiels"},
    )

    id_utilisateur: Mapped[str] = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.utilisateur.id_utilisateur", ondelete="CASCADE"), primary_key=True
    )
    id_institution:  Mapped[str]           = mapped_column(String(100), nullable=False)
    fonction:        Mapped[str]           = mapped_column(String(150), nullable=False)
    departement:     Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    matricule:       Mapped[Optional[str]] = mapped_column(String(50),  unique=True, nullable=True)

    utilisateur:           Mapped["Utilisateur"]              = relationship(back_populates="agent_officiel")
    cles_cryptographiques: Mapped[List["CleCryptographique"]] = relationship(back_populates="agent_officiel", cascade="all, delete-orphan")
    signatures:            Mapped[List["Signature"]]          = relationship(back_populates="agent_officiel", cascade="all, delete-orphan")


# ===========================================================================
# 4. TABLE FILLE — Citoyen
# ===========================================================================

class Citoyen(Base):
    __tablename__ = "citoyen"
    __table_args__ = (
        Index("idx_citoyen_ip",         "ip_adresse"),
        Index("idx_citoyen_session",    "id_session"),
        {"schema": "signature_communiques_officiels"},
    )

    id_utilisateur: Mapped[str] = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.utilisateur.id_utilisateur", ondelete="CASCADE"), primary_key=True
    )
    id_session: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_adresse: Mapped[Optional[str]] = mapped_column(String(45),  nullable=True)

    utilisateur:  Mapped["Utilisateur"]                        = relationship(back_populates="citoyen")
    consultations: Mapped[List["ConsultationCitoyenCommunique"]] = relationship(back_populates="citoyen", cascade="all, delete-orphan")


# ===========================================================================
# 5. 2FA — Utilisateur2FA
# ===========================================================================

class Utilisateur2FA(Base):
    __tablename__ = "utilisateur_2fa"
    __table_args__ = (
        Index("idx_2fa_utilisateur", "id_utilisateur"),
        Index("idx_2fa_active",      "est_active"),
        {"schema": "signature_communiques_officiels"},
    )

    id_utilisateur:  Mapped[str]      = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.utilisateur.id_utilisateur", ondelete="CASCADE"), primary_key=True
    )
    totp_secret:     Mapped[str]      = mapped_column(String(32), nullable=False)
    date_activation: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    est_active:      Mapped[bool]     = mapped_column(Boolean, default=True, nullable=False)
    # NOUVEAU v3 : imposé par l'admin
    force_enabled:   Mapped[bool]     = mapped_column(Boolean, default=False, nullable=False)

    utilisateur: Mapped["Utilisateur"] = relationship()


# ===========================================================================
# 6. 2FA Email — AuthEmailCode
# ===========================================================================

class AuthEmailCode(Base):
    __tablename__ = "auth_email_code"
    __table_args__ = (
        Index("idx_email_code_user",       "id_utilisateur"),
        Index("idx_email_code_expiration", "date_expiration"),
        {"schema": "signature_communiques_officiels"},
    )

    id_code:         Mapped[str]      = mapped_column(String(36), primary_key=True, default=_new_uuid)
    id_utilisateur:  Mapped[str]      = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.utilisateur.id_utilisateur", ondelete="CASCADE"), nullable=False
    )
    code:            Mapped[str]      = mapped_column(String(6),  nullable=False)
    date_creation:   Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    date_expiration: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    est_utilise:     Mapped[bool]     = mapped_column(Boolean, default=False, nullable=False)

    utilisateur: Mapped["Utilisateur"] = relationship()


# ===========================================================================
# 7. OTP backup — AuthOtp
# ===========================================================================

class AuthOtp(Base):
    __tablename__ = "auth_otp"
    __table_args__ = (
        Index("idx_otp_user",       "id_utilisateur"),
        Index("idx_otp_expiration", "date_expiration"),
        {"schema": "signature_communiques_officiels"},
    )

    id_otp:          Mapped[str]      = mapped_column(String(36), primary_key=True, default=_new_uuid)
    id_utilisateur:  Mapped[str]      = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.utilisateur.id_utilisateur", ondelete="CASCADE"), nullable=False
    )
    code_otp:        Mapped[str]      = mapped_column(String(10), nullable=False)
    date_creation:   Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    date_expiration: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    est_utilise:     Mapped[bool]     = mapped_column(Boolean, default=False, nullable=False)

    utilisateur: Mapped["Utilisateur"] = relationship(back_populates="auth_otps")


# ===========================================================================
# 8. NOUVEAU v3 — PasswordResetToken
# ===========================================================================

class PasswordResetToken(Base):
    """Token envoyé par email pour réinitialiser le mot de passe."""
    __tablename__ = "password_reset_token"
    __table_args__ = (
        Index("idx_reset_user",       "id_utilisateur"),
        Index("idx_reset_token",      "token"),
        Index("idx_reset_expiration", "date_expiration"),
        {"schema": "signature_communiques_officiels"},
    )

    id_token:        Mapped[str]      = mapped_column(String(36),  primary_key=True, default=_new_uuid)
    id_utilisateur:  Mapped[str]      = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.utilisateur.id_utilisateur", ondelete="CASCADE"), nullable=False
    )
    token:           Mapped[str]      = mapped_column(String(128), unique=True, nullable=False)
    date_creation:   Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    date_expiration: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    est_utilise:     Mapped[bool]     = mapped_column(Boolean, default=False, nullable=False)

    utilisateur: Mapped["Utilisateur"] = relationship(back_populates="reset_tokens")


# ===========================================================================
# 9. Communiqué
# ===========================================================================

class Communique(Base):
    __tablename__ = "communique"
    __table_args__ = (
        Index("idx_communique_date_publication", "date_publication"),
        Index("idx_communique_statut",           "statut"),
        Index("idx_communique_titre",            "titre"),
        Index("idx_communique_hash",             "hash_contenu"),
        Index("idx_communique_statut_date",      "statut", "date_publication"),
        Index("idx_communique_auteur",           "id_auteur"),
        Index("idx_communique_publie",           "statut", "date_publication",
              postgresql_where=text("statut = 'PUBLIE'")),
        {"schema": "signature_communiques_officiels"},
    )

    id_communique:    Mapped[str]           = mapped_column(String(36), primary_key=True, default=_new_uuid)
    titre:            Mapped[str]           = mapped_column(String(255), nullable=False)
    contenu:          Mapped[str]           = mapped_column(Text, nullable=False)
    contenu_normalise: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date_publication: Mapped[datetime]      = mapped_column(DateTime, server_default=func.now(), nullable=False)
    hash_contenu:     Mapped[str]           = mapped_column(String(255), nullable=False)
    qr_code:          Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    statut:           Mapped[str]           = mapped_column(String(50), default="BROUILLON", nullable=False)
    id_auteur:        Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.utilisateur.id_utilisateur"), nullable=True
    )
    fichier_signe:    Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    est_archive:      Mapped[bool]          = mapped_column(Boolean, default=False, nullable=False)

    archives:      Mapped[List["Archive"]]                       = relationship(back_populates="communique", cascade="all, delete-orphan")
    signatures:    Mapped[List["Signature"]]                     = relationship(back_populates="communique", cascade="all, delete-orphan")
    consultations: Mapped[List["ConsultationCitoyenCommunique"]] = relationship(back_populates="communique", cascade="all, delete-orphan")


# ===========================================================================
# 10. Archive
# ===========================================================================

class Archive(Base):
    __tablename__ = "archive"
    __table_args__ = (
        Index("idx_archive_communique",     "id_communique"),
        Index("idx_archive_date_archivage", "date_archivage"),
        {"schema": "signature_communiques_officiels"},
    )

    id_archive:      Mapped[str]           = mapped_column(String(36), primary_key=True, default=_new_uuid)
    id_communique:   Mapped[str]           = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.communique.id_communique", ondelete="CASCADE"), nullable=False
    )
    chemin_stockage: Mapped[str]           = mapped_column(String(500), nullable=False)
    taille_fichier:  Mapped[Optional[int]] = mapped_column(BigInteger, nullable=True)
    date_archivage:  Mapped[datetime]      = mapped_column(DateTime, server_default=func.now(), nullable=False)

    communique: Mapped["Communique"] = relationship(back_populates="archives")


# ===========================================================================
# 11. Clé Cryptographique
# ===========================================================================

class CleCryptographique(Base):
    __tablename__ = "cle_cryptographique"
    __table_args__ = (
        Index("idx_cle_agent_officiel",  "id_agent_officiel"),
        Index("idx_cle_date_expiration", "date_expiration"),
        Index("idx_cle_agent_expiration","id_agent_officiel", "date_expiration"),
        {"schema": "signature_communiques_officiels"},
    )

    id_cle:              Mapped[str]      = mapped_column(String(36), primary_key=True, default=_new_uuid)
    id_agent_officiel:   Mapped[str]      = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.agent_officiel.id_utilisateur", ondelete="CASCADE"), nullable=False
    )
    cle_publique:        Mapped[str]      = mapped_column(Text, nullable=False)
    cle_privee_chiffree: Mapped[str]      = mapped_column(Text, nullable=False)
    date_creation:       Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    date_expiration:     Mapped[datetime] = mapped_column(DateTime, nullable=False)

    agent_officiel: Mapped["AgentOfficiel"] = relationship(back_populates="cles_cryptographiques")


# ===========================================================================
# 12. Signature
# ===========================================================================

class Signature(Base):
    __tablename__ = "signature"
    __table_args__ = (
        Index("idx_signature_communique",        "id_communique"),
        Index("idx_signature_agent",             "id_agent_officiel"),
        Index("idx_signature_date",              "date_signature"),
        Index("idx_signature_valide",            "est_valide"),
        Index("idx_signature_communique_valide", "id_communique", "est_valide"),
        Index("idx_signature_agent_date",        "id_agent_officiel", "date_signature"),
        {"schema": "signature_communiques_officiels"},
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
    date_signature:     Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    est_valide:         Mapped[bool]     = mapped_column(Boolean, default=True, nullable=False)
    metadata_qr:        Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    communique:     Mapped["Communique"]    = relationship(back_populates="signatures")
    agent_officiel: Mapped["AgentOfficiel"] = relationship(back_populates="signatures")


# ===========================================================================
# 13. Consultation
# ===========================================================================

class ConsultationCitoyenCommunique(Base):
    __tablename__ = "consultation_citoyen_communique"
    __table_args__ = (
        Index("idx_consultation_citoyen",    "id_utilisateur"),
        Index("idx_consultation_communique", "id_communique"),
        Index("idx_consultation_date",       "date_consultation"),
        {"schema": "signature_communiques_officiels"},
    )

    id_utilisateur:    Mapped[str]      = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.citoyen.id_utilisateur", ondelete="CASCADE"), primary_key=True
    )
    id_communique:     Mapped[str]      = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.communique.id_communique", ondelete="CASCADE"), primary_key=True
    )
    date_consultation: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)

    citoyen:    Mapped["Citoyen"]    = relationship(back_populates="consultations")
    communique: Mapped["Communique"] = relationship(back_populates="consultations")


# ===========================================================================
# 14. LogSecurite
# ===========================================================================

class LogSecurite(Base):
    __tablename__ = "logs_securite"
    __table_args__ = (
        Index("idx_logs_utilisateur",      "id_utilisateur"),
        Index("idx_logs_date_action",      "date_action"),
        Index("idx_logs_type_action",      "type_action"),
        Index("idx_logs_succes",           "succes"),
        Index("idx_logs_utilisateur_date", "id_utilisateur", "date_action"),
        Index("idx_logs_type_date",        "type_action", "date_action"),
        Index("idx_logs_cover",            "id_utilisateur", "date_action", "type_action", "succes"),
        {"schema": "signature_communiques_officiels"},
    )

    id_log:         Mapped[str]           = mapped_column(String(36), primary_key=True, default=_new_uuid)
    id_utilisateur: Mapped[str]           = mapped_column(
        String(36), ForeignKey("signature_communiques_officiels.utilisateur.id_utilisateur", ondelete="CASCADE"), nullable=False
    )
    type_action:    Mapped[str]           = mapped_column(String(100), nullable=False)
    date_action:    Mapped[datetime]      = mapped_column(DateTime, server_default=func.now(), nullable=False)
    succes:         Mapped[bool]          = mapped_column(Boolean, nullable=False)
    details:        Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # NOUVEAU v3
    ip_adresse:     Mapped[Optional[str]] = mapped_column(String(45),  nullable=True)
    user_agent:     Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    utilisateur: Mapped["Utilisateur"] = relationship(back_populates="logs_securite")
