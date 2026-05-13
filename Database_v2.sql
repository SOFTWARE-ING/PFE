-- ============================================================================
-- SHIELD Platform - Database v2
-- Schema: signature_communiques_officiels
-- User: shield
-- ============================================================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS signature_communiques_officiels;
SET search_path TO signature_communiques_officiels;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS utilisateur (
    id_utilisateur VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS administrateur (
    id_utilisateur VARCHAR(36) PRIMARY KEY REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
    niveau_habilitation VARCHAR(50) DEFAULT 'ADMIN'
);

CREATE TABLE IF NOT EXISTS agent_officiel (
    id_utilisateur VARCHAR(36) PRIMARY KEY REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
    id_institution VARCHAR(100),
    fonction VARCHAR(150),
    departement VARCHAR(150),
    matricule VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS citoyen (
    id_utilisateur VARCHAR(36) PRIMARY KEY REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
    id_session VARCHAR(100),
    ip_adresse VARCHAR(45)
);

-- ============================================================================
-- CRYPTOGRAPHIC KEYS
-- ============================================================================

CREATE TABLE IF NOT EXISTS cle_cryptographique (
    id_cle VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    id_agent_officiel VARCHAR(36) NOT NULL REFERENCES agent_officiel(id_utilisateur) ON DELETE CASCADE,
    cle_publique TEXT NOT NULL,
    cle_privee_chiffree TEXT NOT NULL,
    empreinte_cle VARCHAR(255),
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_expiration TIMESTAMP NOT NULL,
    est_active BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- COMMUNIQUE (updated with new columns)
-- ============================================================================

CREATE TABLE IF NOT EXISTS communique (
    id_communique VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    titre VARCHAR(255) NOT NULL,
    contenu TEXT NOT NULL,
    contenu_normalise TEXT,
    date_publication TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hash_contenu VARCHAR(255) NOT NULL,
    qr_code TEXT,
    statut VARCHAR(50) DEFAULT 'BROUILLON',
    id_auteur VARCHAR(36) REFERENCES utilisateur(id_utilisateur),
    fichier_signe VARCHAR(500),
    est_archive BOOLEAN DEFAULT FALSE
);

-- ============================================================================
-- SIGNATURES
-- ============================================================================

CREATE TABLE IF NOT EXISTS signature (
    id_signature VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    id_communique VARCHAR(36) NOT NULL REFERENCES communique(id_communique) ON DELETE CASCADE,
    id_agent_officiel VARCHAR(36) NOT NULL REFERENCES agent_officiel(id_utilisateur),
    valeur_signature TEXT NOT NULL,
    hash_document VARCHAR(255),
    algorithme_hachage VARCHAR(50) DEFAULT 'RSA-SHA256-PSS',
    metadata_qr TEXT,
    date_signature TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    est_valide BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- ARCHIVE (stores actual signed PDF files)
-- ============================================================================

CREATE TABLE IF NOT EXISTS archive (
    id_archive VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    id_communique VARCHAR(36) NOT NULL REFERENCES communique(id_communique) ON DELETE CASCADE,
    chemin_stockage VARCHAR(500) NOT NULL,
    taille_fichier BIGINT,
    date_archivage TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 2FA TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS utilisateur_2fa (
    id_2fa VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    id_utilisateur VARCHAR(36) NOT NULL REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
    totp_secret VARCHAR(100) NOT NULL,
    est_active BOOLEAN DEFAULT FALSE,
    date_activation TIMESTAMP,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_email_code (
    id_code VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    id_utilisateur VARCHAR(36) NOT NULL REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    date_expiration TIMESTAMP NOT NULL,
    est_utilise BOOLEAN DEFAULT FALSE,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SECURITY LOGS & CONSULTATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS logs_securite (
    id_log VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    id_utilisateur VARCHAR(36) REFERENCES utilisateur(id_utilisateur),
    type_action VARCHAR(100) NOT NULL,
    succes BOOLEAN DEFAULT TRUE,
    details TEXT,
    date_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS consultation_citoyen_communique (
    id_consultation VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    id_communique VARCHAR(36) NOT NULL REFERENCES communique(id_communique) ON DELETE CASCADE,
    id_citoyen VARCHAR(36) REFERENCES citoyen(id_utilisateur),
    date_consultation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_communique_statut ON communique(statut);
CREATE INDEX IF NOT EXISTS idx_communique_auteur ON communique(id_auteur);
CREATE INDEX IF NOT EXISTS idx_communique_archive ON communique(est_archive);
CREATE INDEX IF NOT EXISTS idx_signature_communique ON signature(id_communique);
CREATE INDEX IF NOT EXISTS idx_signature_agent ON signature(id_agent_officiel);
CREATE INDEX IF NOT EXISTS idx_cle_agent ON cle_cryptographique(id_agent_officiel);
CREATE INDEX IF NOT EXISTS idx_archive_communique ON archive(id_communique);
CREATE INDEX IF NOT EXISTS idx_2fa_utilisateur ON utilisateur_2fa(id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_email_code_user ON auth_email_code(id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_logs_utilisateur ON logs_securite(id_utilisateur);

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA signature_communiques_officiels TO shield;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA signature_communiques_officiels TO shield;
ALTER ROLE shield SET search_path TO signature_communiques_officiels, public;

