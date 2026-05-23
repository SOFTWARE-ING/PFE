-- ============================================================================
-- SHIELD Platform — Database v3
-- Schema : signature_communiques_officiels
-- Auteur  : SHIELD PFE Team
-- Version : 3.0 — Ajout panneau admin, contrôle tokens, reset MDP
-- ============================================================================
-- NOUVEAUTÉS v3 :
--   1. utilisateur.token_autorise        → bloquer/autoriser l'accès JWT
--   2. utilisateur.derniere_connexion    → suivi des sessions
--   3. utilisateur.session_token_hash    → détecter session active
--   4. password_reset_token              → réinitialisation MDP par email
--   5. utilisateur_2fa.force_enabled     → 2FA imposé par admin
--   6. Niveau SUPER_ADMIN dans administrateur (déjà dans v2, explicite ici)
--   7. Tous les index nécessaires
-- ============================================================================

-- Créer le schéma
CREATE SCHEMA IF NOT EXISTS signature_communiques_officiels;
SET search_path TO signature_communiques_officiels;

-- ============================================================================
-- 1. TABLE MÈRE — utilisateur
-- ============================================================================

CREATE TABLE IF NOT EXISTS utilisateur (
    id_utilisateur      VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    nom                 VARCHAR(100) NOT NULL,
    prenom              VARCHAR(100) NOT NULL,
    email               VARCHAR(255) UNIQUE NOT NULL,
    mot_de_passe        VARCHAR(255) NOT NULL,
    date_creation       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,

    -- NOUVEAU v3 : contrôle accès par l'admin
    token_autorise      BOOLEAN      DEFAULT FALSE,   -- FALSE par défaut pour agents créés par admin
    derniere_connexion  TIMESTAMP    NULL,             -- mis à jour à chaque login réussi
    session_token_hash  VARCHAR(64)  NULL              -- SHA256 du dernier JWT émis (session active)
);

-- Index utilisateur
CREATE INDEX IF NOT EXISTS idx_utilisateur_email         ON utilisateur (email);
CREATE INDEX IF NOT EXISTS idx_utilisateur_nom           ON utilisateur (nom);
CREATE INDEX IF NOT EXISTS idx_utilisateur_prenom        ON utilisateur (prenom);
CREATE INDEX IF NOT EXISTS idx_utilisateur_date_creation ON utilisateur (date_creation);
CREATE INDEX IF NOT EXISTS idx_utilisateur_nom_prenom    ON utilisateur (nom, prenom);
CREATE INDEX IF NOT EXISTS idx_utilisateur_token         ON utilisateur (token_autorise);
CREATE INDEX IF NOT EXISTS idx_utilisateur_session       ON utilisateur (session_token_hash);

-- ============================================================================
-- 2. TABLE FILLE — administrateur
-- ============================================================================
-- Niveaux : SUPER_ADMIN | ADMIN_SYSTEME | ADMIN_SECURITE
-- SUPER_ADMIN crée les autres admins et a tous leurs droits.
-- ADMIN_SYSTEME crée les agents et contrôle les accès.
-- ADMIN_SECURITE consulte les logs et vérifie les signatures.

CREATE TABLE IF NOT EXISTS administrateur (
    id_utilisateur       VARCHAR(36) PRIMARY KEY
        REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
    niveau_habilitation  VARCHAR(50) NOT NULL DEFAULT 'ADMIN_SYSTEME'
        CHECK (niveau_habilitation IN ('SUPER_ADMIN','ADMIN_SYSTEME','ADMIN_SECURITE'))
);

CREATE INDEX IF NOT EXISTS idx_admin_niveau ON administrateur (niveau_habilitation);

-- ============================================================================
-- 3. TABLE FILLE — agent_officiel
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_officiel (
    id_utilisateur  VARCHAR(36) PRIMARY KEY
        REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
    id_institution  VARCHAR(100),
    fonction        VARCHAR(150),
    departement     VARCHAR(150),
    matricule       VARCHAR(50) UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_agent_institution          ON agent_officiel (id_institution);
CREATE INDEX IF NOT EXISTS idx_agent_fonction             ON agent_officiel (fonction);
CREATE INDEX IF NOT EXISTS idx_agent_matricule            ON agent_officiel (matricule);
CREATE INDEX IF NOT EXISTS idx_agent_institution_fonction ON agent_officiel (id_institution, fonction);

-- ============================================================================
-- 4. TABLE FILLE — citoyen
-- ============================================================================

CREATE TABLE IF NOT EXISTS citoyen (
    id_utilisateur  VARCHAR(36) PRIMARY KEY
        REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
    id_session      VARCHAR(255) NULL,
    ip_adresse      VARCHAR(45)  NULL
);

CREATE INDEX IF NOT EXISTS idx_citoyen_ip         ON citoyen (ip_adresse);
CREATE INDEX IF NOT EXISTS idx_citoyen_session    ON citoyen (id_session);
CREATE INDEX IF NOT EXISTS idx_citoyen_ip_session ON citoyen (ip_adresse, id_session);

-- ============================================================================
-- 5. 2FA — utilisateur_2fa
-- ============================================================================

CREATE TABLE IF NOT EXISTS utilisateur_2fa (
    id_utilisateur   VARCHAR(36) PRIMARY KEY
        REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
    totp_secret      VARCHAR(32)  NOT NULL,
    date_activation  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    est_active       BOOLEAN      DEFAULT TRUE,

    -- NOUVEAU v3 : imposé par l'admin (ne peut pas être désactivé par l'utilisateur)
    force_enabled    BOOLEAN      DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_2fa_utilisateur ON utilisateur_2fa (id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_2fa_active      ON utilisateur_2fa (est_active);

-- ============================================================================
-- 6. 2FA — auth_email_code
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_email_code (
    id_code          VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    id_utilisateur   VARCHAR(36) NOT NULL
        REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
    code             VARCHAR(6)  NOT NULL,
    date_creation    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    date_expiration  TIMESTAMP   NOT NULL,
    est_utilise      BOOLEAN     DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_email_code_user       ON auth_email_code (id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_email_code_expiration ON auth_email_code (date_expiration);

-- ============================================================================
-- 7. OTP — auth_otp (2FA backup)
-- ============================================================================

CREATE TABLE IF NOT EXISTS auth_otp (
    id_otp           VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    id_utilisateur   VARCHAR(36) NOT NULL
        REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
    code_otp         VARCHAR(10) NOT NULL,
    date_creation    TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    date_expiration  TIMESTAMP   NOT NULL,
    est_utilise      BOOLEAN     DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_otp_user       ON auth_otp (id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_otp_expiration ON auth_otp (date_expiration);

-- ============================================================================
-- 8. NOUVEAU v3 — password_reset_token
-- ============================================================================
-- Utilisé pour la réinitialisation du mot de passe via email (tous les rôles).

CREATE TABLE IF NOT EXISTS password_reset_token (
    id_token        VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    id_utilisateur  VARCHAR(36)  NOT NULL
        REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
    token           VARCHAR(128) UNIQUE NOT NULL,   -- token aléatoire envoyé par email
    date_creation   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    date_expiration TIMESTAMP    NOT NULL,           -- durée configurable (.env)
    est_utilise     BOOLEAN      DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_reset_user       ON password_reset_token (id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_reset_token      ON password_reset_token (token);
CREATE INDEX IF NOT EXISTS idx_reset_expiration ON password_reset_token (date_expiration);

-- ============================================================================
-- 9. CLÉS CRYPTOGRAPHIQUES
-- ============================================================================

CREATE TABLE IF NOT EXISTS cle_cryptographique (
    id_cle               VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    id_agent_officiel    VARCHAR(36) NOT NULL
        REFERENCES agent_officiel(id_utilisateur) ON DELETE CASCADE,
    cle_publique         TEXT        NOT NULL,
    cle_privee_chiffree  TEXT        NOT NULL,
    empreinte_cle        VARCHAR(255) NULL,
    date_creation        TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    date_expiration      TIMESTAMP   NOT NULL,
    est_active           BOOLEAN     DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_cle_agent_officiel  ON cle_cryptographique (id_agent_officiel);
CREATE INDEX IF NOT EXISTS idx_cle_date_expiration ON cle_cryptographique (date_expiration);
CREATE INDEX IF NOT EXISTS idx_cle_creation        ON cle_cryptographique (date_creation);
CREATE INDEX IF NOT EXISTS idx_cle_agent_expiration ON cle_cryptographique (id_agent_officiel, date_expiration);

-- ============================================================================
-- 10. COMMUNIQUÉ
-- ============================================================================

CREATE TABLE IF NOT EXISTS communique (
    id_communique     VARCHAR(36)  PRIMARY KEY DEFAULT gen_random_uuid()::text,
    titre             VARCHAR(255) NOT NULL,
    contenu           TEXT         NOT NULL,
    contenu_normalise TEXT         NULL,
    date_publication  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    hash_contenu      VARCHAR(255) NOT NULL,
    qr_code           TEXT         NULL,
    statut            VARCHAR(50)  DEFAULT 'BROUILLON'
        CHECK (statut IN ('BROUILLON','PUBLIE','ARCHIVE','REJETE')),
    id_auteur         VARCHAR(36)  NULL
        REFERENCES utilisateur(id_utilisateur),
    fichier_signe     VARCHAR(500) NULL,
    est_archive       BOOLEAN      DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_communique_date_publication ON communique (date_publication);
CREATE INDEX IF NOT EXISTS idx_communique_statut           ON communique (statut);
CREATE INDEX IF NOT EXISTS idx_communique_titre            ON communique (titre);
CREATE INDEX IF NOT EXISTS idx_communique_hash             ON communique (hash_contenu);
CREATE INDEX IF NOT EXISTS idx_communique_statut_date      ON communique (statut, date_publication);
CREATE INDEX IF NOT EXISTS idx_communique_auteur           ON communique (id_auteur);
-- Index partiel : seulement les communiqués publiés (optimise la recherche publique)
CREATE INDEX IF NOT EXISTS idx_communique_publie
    ON communique (statut, date_publication)
    WHERE statut = 'PUBLIE';

-- ============================================================================
-- 11. SIGNATURE
-- ============================================================================

CREATE TABLE IF NOT EXISTS signature (
    id_signature        VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    id_communique       VARCHAR(36) NOT NULL
        REFERENCES communique(id_communique) ON DELETE CASCADE,
    id_agent_officiel   VARCHAR(36) NOT NULL
        REFERENCES agent_officiel(id_utilisateur),
    valeur_signature    TEXT        NOT NULL,
    hash_document       VARCHAR(255) NULL,
    algorithme_hachage  VARCHAR(50) DEFAULT 'RSA-SHA256-PSS',
    metadata_qr         TEXT        NULL,
    date_signature      TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    est_valide          BOOLEAN     DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_signature_communique        ON signature (id_communique);
CREATE INDEX IF NOT EXISTS idx_signature_agent             ON signature (id_agent_officiel);
CREATE INDEX IF NOT EXISTS idx_signature_date              ON signature (date_signature);
CREATE INDEX IF NOT EXISTS idx_signature_valide            ON signature (est_valide);
CREATE INDEX IF NOT EXISTS idx_signature_communique_valide ON signature (id_communique, est_valide);
CREATE INDEX IF NOT EXISTS idx_signature_agent_date        ON signature (id_agent_officiel, date_signature);

-- ============================================================================
-- 12. ARCHIVE
-- ============================================================================

CREATE TABLE IF NOT EXISTS archive (
    id_archive       VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    id_communique    VARCHAR(36) NOT NULL
        REFERENCES communique(id_communique) ON DELETE CASCADE,
    chemin_stockage  VARCHAR(500) NOT NULL,
    taille_fichier   BIGINT       NULL,
    date_archivage   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_archive_communique     ON archive (id_communique);
CREATE INDEX IF NOT EXISTS idx_archive_date_archivage ON archive (date_archivage);

-- ============================================================================
-- 13. CONSULTATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS consultation_citoyen_communique (
    id_utilisateur    VARCHAR(36) NOT NULL
        REFERENCES citoyen(id_utilisateur) ON DELETE CASCADE,
    id_communique     VARCHAR(36) NOT NULL
        REFERENCES communique(id_communique) ON DELETE CASCADE,
    date_consultation TIMESTAMP   DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_utilisateur, id_communique)
);

CREATE INDEX IF NOT EXISTS idx_consultation_citoyen    ON consultation_citoyen_communique (id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_consultation_communique ON consultation_citoyen_communique (id_communique);
CREATE INDEX IF NOT EXISTS idx_consultation_date       ON consultation_citoyen_communique (date_consultation);

-- ============================================================================
-- 14. LOGS DE SÉCURITÉ
-- ============================================================================

CREATE TABLE IF NOT EXISTS logs_securite (
    id_log         VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    id_utilisateur VARCHAR(36) NOT NULL
        REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE,
    type_action    VARCHAR(100) NOT NULL,
    date_action    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    succes         BOOLEAN      NOT NULL,
    details        TEXT         NULL,

    -- NOUVEAU v3 : infos contextuelles supplémentaires
    ip_adresse     VARCHAR(45)  NULL,   -- IP de la requête
    user_agent     VARCHAR(255) NULL    -- navigateur / client
);

CREATE INDEX IF NOT EXISTS idx_logs_utilisateur      ON logs_securite (id_utilisateur);
CREATE INDEX IF NOT EXISTS idx_logs_date_action      ON logs_securite (date_action);
CREATE INDEX IF NOT EXISTS idx_logs_type_action      ON logs_securite (type_action);
CREATE INDEX IF NOT EXISTS idx_logs_succes           ON logs_securite (succes);
CREATE INDEX IF NOT EXISTS idx_logs_utilisateur_date ON logs_securite (id_utilisateur, date_action);
CREATE INDEX IF NOT EXISTS idx_logs_type_date        ON logs_securite (type_action, date_action);
CREATE INDEX IF NOT EXISTS idx_logs_succes_date      ON logs_securite (succes, date_action);
CREATE INDEX IF NOT EXISTS idx_logs_cover
    ON logs_securite (id_utilisateur, date_action, type_action, succes);



-- ============================================================================
-- MIGRATION DEPUIS v2 (si la base existe déjà)
-- À exécuter uniquement si vous migrez depuis Database_v2.sql
-- ============================================================================

ALTER TABLE utilisateur ADD COLUMN IF NOT EXISTS token_autorise     BOOLEAN DEFAULT FALSE;
ALTER TABLE utilisateur ADD COLUMN IF NOT EXISTS derniere_connexion  TIMESTAMP NULL;
ALTER TABLE utilisateur ADD COLUMN IF NOT EXISTS session_token_hash  VARCHAR(64) NULL;
ALTER TABLE utilisateur_2fa ADD COLUMN IF NOT EXISTS force_enabled   BOOLEAN DEFAULT FALSE;
ALTER TABLE logs_securite ADD COLUMN IF NOT EXISTS ip_adresse        VARCHAR(45) NULL;
ALTER TABLE logs_securite ADD COLUMN IF NOT EXISTS user_agent        VARCHAR(255) NULL;
ALTER TABLE administrateur ADD CONSTRAINT chk_niveau
    CHECK (niveau_habilitation IN ('SUPER_ADMIN','ADMIN_SYSTEME','ADMIN_SECURITE'));

-- ============================================================================
-- FIN DU SCRIPT
-- ============================================================================


-- ============================================================================
-- 15. DONNÉES INITIALES — Comptes SUPER_ADMIN
-- ============================================================================
-- ⚠ ATTENTION : Changer le mot de passe après le premier déploiement !
-- Le hash ci-dessous correspond à : SuperAdmin@2026
-- Générer un nouveau hash : python3 -c "import bcrypt; print(bcrypt.hashpw(b'votre_mdp', bcrypt.gensalt(12)).decode())"

-- INSERT INTO utilisateur (id_utilisateur, nom, prenom, email, mot_de_passe, token_autorise)
-- VALUES (
--     'super-admin-shield-0001',
--     'Admin',
--     'Super',
--     'superadmin@shield.gouv.cm',
--     '$2b$12$placeholderHashRemplacerAvantProduction000000000000000000',
--     TRUE   -- le SUPER_ADMIN a son token autorisé par défaut
-- )
-- ON CONFLICT (email) DO NOTHING;

-- INSERT INTO administrateur (id_utilisateur, niveau_habilitation)
-- VALUES ('super-admin-shield-0001', 'SUPER_ADMIN')
-- ON CONFLICT DO NOTHING;