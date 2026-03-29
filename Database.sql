CREATE DATABASE signature_communiques_officiels
WITH ENCODING='UTF8'
LC_COLLATE='fr_FR.utf8'
LC_CTYPE='fr_FR.utf8'
TEMPLATE=template0;

-- =========================================================================
-- 1. CRÉATION DE LA TABLE MÈRE
-- ==============================================================================
CREATE TABLE utilisateur (
    id_utilisateur VARCHAR(36) PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    mot_de_passe VARCHAR(255) NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 2. CRÉATION DES TABLES FILLES (HÉRITAGE UML)
-- ==============================================================================
CREATE TABLE agent_officiel (
    id_utilisateur VARCHAR(36) PRIMARY KEY,
    id_institution VARCHAR(36) NOT NULL,
    fonction VARCHAR(100) NOT NULL,
    departement VARCHAR(100),
    matricule VARCHAR(50) UNIQUE,
    CONSTRAINT fk_agent_utilisateur FOREIGN KEY (id_utilisateur) 
        REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE
);

CREATE TABLE administrateur (
    id_utilisateur VARCHAR(36) PRIMARY KEY,
    niveau_habilitation VARCHAR(50) NOT NULL,
    CONSTRAINT fk_admin_utilisateur FOREIGN KEY (id_utilisateur) 
        REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE
);

CREATE TABLE citoyen (
    id_utilisateur VARCHAR(36) PRIMARY KEY,
    id_session VARCHAR(255),
    ip_adresse VARCHAR(45),
    CONSTRAINT fk_citoyen_utilisateur FOREIGN KEY (id_utilisateur) 
        REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE
);

-- ==============================================================================
-- 3. AUTRES ENTITÉS PRINCIPALES
-- ==============================================================================
CREATE TABLE communique (
    id_communique VARCHAR(36) PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    contenu TEXT NOT NULL,
    date_publication TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    hash_contenu VARCHAR(255) NOT NULL,
    qr_code TEXT,
    statut VARCHAR(50) DEFAULT 'BROUILLON'
);

CREATE TABLE archive (
    id_archive VARCHAR(36) PRIMARY KEY,
    id_communique VARCHAR(36) NOT NULL,
    chemin_stockage VARCHAR(500) NOT NULL,
    taille_fichier BIGINT,
    date_archivage TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_archive_communique FOREIGN KEY (id_communique) 
        REFERENCES communique(id_communique) ON DELETE CASCADE
);

-- ==============================================================================
-- 4. ENTITÉS DÉPENDANTES (ASSOCIATIONS 1:N et M:N)
-- ==============================================================================
CREATE TABLE logs_securite (
    id_log VARCHAR(36) PRIMARY KEY,
    id_utilisateur VARCHAR(36) NOT NULL,
    type_action VARCHAR(100) NOT NULL,
    date_action TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    succes BOOLEAN NOT NULL,
    details TEXT,
    CONSTRAINT fk_log_utilisateur FOREIGN KEY (id_utilisateur) 
        REFERENCES utilisateur(id_utilisateur) ON DELETE CASCADE
);

CREATE TABLE cle_cryptographique (
    id_cle VARCHAR(36) PRIMARY KEY,
    id_agent_officiel VARCHAR(36) NOT NULL,
    cle_publique TEXT NOT NULL,
    cle_privee_chiffree TEXT NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_expiration TIMESTAMP NOT NULL,
    CONSTRAINT fk_cle_agent FOREIGN KEY (id_agent_officiel) 
        REFERENCES agent_officiel(id_utilisateur) ON DELETE CASCADE
);

CREATE TABLE signature (
    id_signature VARCHAR(36) PRIMARY KEY,
    id_communique VARCHAR(36) NOT NULL,
    id_agent_officiel VARCHAR(36) NOT NULL,
    valeur_signature TEXT NOT NULL,
    algorithme_hachage VARCHAR(50) NOT NULL,
    date_signature TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    est_valide BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_signature_communique FOREIGN KEY (id_communique) 
        REFERENCES communique(id_communique) ON DELETE CASCADE,
    CONSTRAINT fk_signature_agent FOREIGN KEY (id_agent_officiel) 
        REFERENCES agent_officiel(id_utilisateur) ON DELETE CASCADE
);

-- Table de liaison (Association 0..* à 0..* : Citoyen consulte Communiqué)
CREATE TABLE consultation_citoyen_communique (
    id_utilisateur VARCHAR(36) NOT NULL,
    id_communique VARCHAR(36) NOT NULL,
    date_consultation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_utilisateur, id_communique),
    CONSTRAINT fk_consultation_citoyen FOREIGN KEY (id_utilisateur) 
        REFERENCES citoyen(id_utilisateur) ON DELETE CASCADE,
    CONSTRAINT fk_consultation_communique FOREIGN KEY (id_communique) 
        REFERENCES communique(id_communique) ON DELETE CASCADE
);
-- Table de pour gere lauthentification a double facteurs (2FA)
CREATE TABLE auth_otp (
    id_otp VARCHAR(36) PRIMARY KEY,
    id_utilisateur VARCHAR(36) NOT NULL,
    code_otp VARCHAR(10) NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_expiration TIMESTAMP NOT NULL,
    est_utilise BOOLEAN DEFAULT FALSE,

    CONSTRAINT fk_otp_utilisateur 
        FOREIGN KEY (id_utilisateur)
        REFERENCES utilisateur(id_utilisateur)
        ON DELETE CASCADE
);
-- ==============================================================================
-- 5. INDEXATION COMPLÈTE POUR OPTIMISATION DES PERFORMANCES
-- ==============================================================================

-- Index pour la table utilisateur (recherches fréquentes)
CREATE INDEX idx_utilisateur_nom ON utilisateur(nom);
CREATE INDEX idx_utilisateur_prenom ON utilisateur(prenom);
CREATE INDEX idx_utilisateur_email ON utilisateur(email);
CREATE INDEX idx_utilisateur_date_creation ON utilisateur(date_creation);
CREATE INDEX idx_utilisateur_nom_prenom ON utilisateur(nom, prenom);

-- Index pour la table agent_officiel
CREATE INDEX idx_agent_institution ON agent_officiel(id_institution);
CREATE INDEX idx_agent_fonction ON agent_officiel(fonction);
CREATE INDEX idx_agent_departement ON agent_officiel(departement);
CREATE INDEX idx_agent_matricule ON agent_officiel(matricule);
CREATE INDEX idx_agent_institution_fonction ON agent_officiel(id_institution, fonction);

-- Index pour la table administrateur
CREATE INDEX idx_admin_niveau ON administrateur(niveau_habilitation);

-- Index pour la table citoyen
CREATE INDEX idx_citoyen_ip ON citoyen(ip_adresse);
CREATE INDEX idx_citoyen_session ON citoyen(id_session);
CREATE INDEX idx_citoyen_ip_session ON citoyen(ip_adresse, id_session);

-- Index pour la table communique
CREATE INDEX idx_communique_date_publication ON communique(date_publication);
CREATE INDEX idx_communique_statut ON communique(statut);
CREATE INDEX idx_communique_titre ON communique(titre);
CREATE INDEX idx_communique_hash ON communique(hash_contenu);
CREATE INDEX idx_communique_statut_date ON communique(statut, date_publication);

-- Index pour la table archive
CREATE INDEX idx_archive_communique ON archive(id_communique);
CREATE INDEX idx_archive_date_archivage ON archive(date_archivage);
CREATE INDEX idx_archive_taille ON archive(taille_fichier);

-- Index pour la table logs_securite (critiques pour l'audit)
CREATE INDEX idx_logs_utilisateur ON logs_securite(id_utilisateur);
CREATE INDEX idx_logs_date_action ON logs_securite(date_action);
CREATE INDEX idx_logs_type_action ON logs_securite(type_action);
CREATE INDEX idx_logs_succes ON logs_securite(succes);
CREATE INDEX idx_logs_utilisateur_date ON logs_securite(id_utilisateur, date_action);
CREATE INDEX idx_logs_type_date ON logs_securite(type_action, date_action);
CREATE INDEX idx_logs_succes_date ON logs_securite(succes, date_action);

-- Index pour la table cle_cryptographique
CREATE INDEX idx_cle_agent_officiel ON cle_cryptographique(id_agent_officiel);
CREATE INDEX idx_cle_date_expiration ON cle_cryptographique(date_expiration);
CREATE INDEX idx_cle_creation ON cle_cryptographique(date_creation);
CREATE INDEX idx_cle_agent_expiration ON cle_cryptographique(id_agent_officiel, date_expiration);

-- Index pour la table signature
CREATE INDEX idx_signature_communique ON signature(id_communique);
CREATE INDEX idx_signature_agent ON signature(id_agent_officiel);
CREATE INDEX idx_signature_date ON signature(date_signature);
CREATE INDEX idx_signature_valide ON signature(est_valide);
CREATE INDEX idx_signature_communique_valide ON signature(id_communique, est_valide);
CREATE INDEX idx_signature_agent_date ON signature(id_agent_officiel, date_signature);

-- Index pour la table consultation_citoyen_communique
CREATE INDEX idx_consultation_citoyen ON consultation_citoyen_communique(id_utilisateur);
CREATE INDEX idx_consultation_communique ON consultation_citoyen_communique(id_communique);
CREATE INDEX idx_consultation_date ON consultation_citoyen_communique(date_consultation);
CREATE INDEX idx_consultation_citoyen_date ON consultation_citoyen_communique(id_utilisateur, date_consultation);
CREATE INDEX idx_consultation_communique_date ON consultation_citoyen_communique(id_communique, date_consultation);

-- Index pour la table auth_otp
CREATE INDEX idx_otp_user ON auth_otp(id_utilisateur);
CREATE INDEX idx_otp_expiration ON auth_otp(date_expiration);

-- ==============================================================================
-- 6. INDEX SPÉCIFIQUES POUR RECHERCHES TEXTUELLES AVANCÉES
-- ==============================================================================

-- Index pour recherche plein texte sur communique (si MySQL 5.7+)
-- ALTER TABLE communique ADD FULLTEXT INDEX ft_communique_contenu (titre, contenu);

-- Index partiel simulé via index sur statut pour les communiqués publiés
CREATE INDEX idx_communique_publie ON communique(statut, date_publication) 
    WHERE statut = 'PUBLIE';  -- Fonctionne sur PostgreSQL, MySQL 8.0+

-- ==============================================================================
-- 7. INDEX DE COUVERTURE POUR LES REQUÊTES FRÉQUENTES
-- ==============================================================================

-- Index de couverture pour les requêtes d'audit
CREATE INDEX idx_logs_cover ON logs_securite(id_utilisateur, date_action, type_action, succes);

-- Index de couverture pour les signatures valides
CREATE INDEX idx_signature_cover ON signature(id_communique, id_agent_officiel, est_valide, date_signature);

-- Index de couverture pour les consultations
CREATE INDEX idx_consultation_cover ON consultation_citoyen_communique(id_utilisateur, id_communique, date_consultation);

-- ==============================================================================
-- 8. INDEX POUR OPTIMISATION DES JOINTURES
-- ==============================================================================

-- Optimisation des jointures pour les rapports (utilisateur + agent_officiel)
CREATE INDEX idx_user_agent_join ON agent_officiel(id_utilisateur, id_institution, fonction);

-- Optimisation des jointures pour les signatures avec communiqués
CREATE INDEX idx_signature_communique_join ON signature(id_communique, id_agent_officiel, est_valide);

-- Optimisation des jointures pour les archives
CREATE INDEX idx_archive_communique_join ON archive(id_communique, date_archivage);

-- ==============================================================================
-- DONNÉES DE TEST - BASE DE DONNÉES DES COMMUNIQUÉS OFFICIELS
-- ==============================================================================

-- ==============================================================================
-- 1. INSERTION DES UTILISATEURS (TABLE MÈRE)
-- ==============================================================================

-- Agents officiels (10 agents)
INSERT INTO utilisateur (id_utilisateur, nom, prenom, email, mot_de_passe, date_creation) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'DIALLO', 'Amadou', 'amadou.diallo@gouv.sn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-01-15 08:30:00'),
('550e8400-e29b-41d4-a716-446655440002', 'NDIAYE', 'Fatou', 'fatou.ndiaye@presidence.sn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-01-20 10:15:00'),
('550e8400-e29b-41d4-a716-446655440003', 'SOW', 'Mamadou', 'mamadou.sow@interieur.gouv.sn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-02-01 09:00:00'),
('550e8400-e29b-41d4-a716-446655440004', 'FALL', 'Aissatou', 'aissatou.fall@sante.gouv.sn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-02-10 14:20:00'),
('550e8400-e29b-41d4-a716-446655440005', 'MBAYE', 'Oumar', 'oumar.mbaye@economie.gouv.sn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-03-05 11:45:00'),
('550e8400-e29b-41d4-a716-446655440006', 'GUEYE', 'Marième', 'marieme.gueye@education.gouv.sn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-03-12 08:00:00'),
('550e8400-e29b-41d4-a716-446655440007', 'DIOP', 'Cheikh', 'cheikh.diop@finances.gouv.sn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-04-01 16:30:00'),
('550e8400-e29b-41d4-a716-446655440008', 'SECK', 'Aminata', 'aminata.seck@justice.gouv.sn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-04-15 13:15:00'),
('550e8400-e29b-41d4-a716-446655440009', 'LY', 'Moussa', 'moussa.ly@environnement.gouv.sn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-05-01 10:00:00'),
('550e8400-e29b-41d4-a716-446655440010', 'KANE', 'Ndeye', 'ndeye.kane@culture.gouv.sn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-05-20 09:30:00');

-- Administrateurs (3 administrateurs)
INSERT INTO utilisateur (id_utilisateur, nom, prenom, email, mot_de_passe, date_creation) VALUES
('550e8400-e29b-41d4-a716-446655440011', 'NDOUR', 'Papa', 'papa.ndour@admin.gouv.sn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-01-10 08:00:00'),
('550e8400-e29b-41d4-a716-446655440012', 'DIAGNE', 'Maimouna', 'maimouna.diagne@admin.gouv.sn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-01-12 09:15:00'),
('550e8400-e29b-41d4-a716-446655440013', 'SARR', 'Ibrahima', 'ibrahima.sarr@admin.gouv.sn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-01-14 10:30:00');

-- Citoyens (15 citoyens)
INSERT INTO utilisateur (id_utilisateur, nom, prenom, email, mot_de_passe, date_creation) VALUES
('550e8400-e29b-41d4-a716-446655440014', 'NDIAYE', 'Abdoulaye', 'abdoulaye.ndiaye@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-06-01 08:00:00'),
('550e8400-e29b-41d4-a716-446655440015', 'DIOP', 'Mariama', 'mariama.diop@yahoo.fr', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-06-02 09:30:00'),
('550e8400-e29b-41d4-a716-446655440016', 'SOW', 'Ousmane', 'ousmane.sow@outlook.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-06-03 14:15:00'),
('550e8400-e29b-41d4-a716-446655440017', 'FALL', 'Awa', 'awa.fall@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-06-04 11:00:00'),
('550e8400-e29b-41d4-a716-446655440018', 'MBAYE', 'Mamadou', 'mamadou.mbaye@yahoo.fr', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-06-05 16:45:00'),
('550e8400-e29b-41d4-a716-446655440019', 'GUEYE', 'Fatoumata', 'fatou.gueye@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-06-06 10:20:00'),
('550e8400-e29b-41d4-a716-446655440020', 'DIALLO', 'Moustapha', 'moustapha.diallo@orange.sn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-06-07 13:30:00'),
('550e8400-e29b-41d4-a716-446655440021', 'BA', 'Aissatou', 'aissatou.ba@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-06-08 09:45:00'),
('550e8400-e29b-41d4-a716-446655440022', 'THIAM', 'Ibrahima', 'ibrahima.thiam@yahoo.fr', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-06-09 15:00:00'),
('550e8400-e29b-41d4-a716-446655440023', 'SECK', 'Mame', 'mame.seck@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-06-10 11:15:00'),
('550e8400-e29b-41d4-a716-446655440024', 'LY', 'Aminata', 'aminata.ly@outlook.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-06-11 08:30:00'),
('550e8400-e29b-41d4-a716-446655440025', 'KANE', 'Mamadou', 'mamadou.kane@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-06-12 14:00:00'),
('550e8400-e29b-41d4-a716-446655440026', 'NDOUR', 'Aicha', 'aicha.ndour@yahoo.fr', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-06-13 10:45:00'),
('550e8400-e29b-41d4-a716-446655440027', 'DIAGNE', 'Pape', 'pape.diagne@gmail.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-06-14 16:15:00'),
('550e8400-e29b-41d4-a716-446655440028', 'SARR', 'Adji', 'adji.sarr@orange.sn', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '2024-06-15 09:00:00');

-- ==============================================================================
-- 2. INSERTION DES AGENTS OFFICIELS
-- ==============================================================================
INSERT INTO agent_officiel (id_utilisateur, id_institution, fonction, departement, matricule) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'INST-001', 'Chargé de communication', 'Cabinet', 'AG-2024-001'),
('550e8400-e29b-41d4-a716-446655440002', 'INST-002', 'Secrétaire général', 'Présidence', 'AG-2024-002'),
('550e8400-e29b-41d4-a716-446655440003', 'INST-003', 'Directeur', 'Sécurité publique', 'AG-2024-003'),
('550e8400-e29b-41d4-a716-446655440004', 'INST-004', 'Médecin-chef', 'Prévention', 'AG-2024-004'),
('550e8400-e29b-41d4-a716-446655440005', 'INST-005', 'Conseiller économique', 'Politiques publiques', 'AG-2024-005'),
('550e8400-e29b-41d4-a716-446655440006', 'INST-006', 'Inspecteur académique', 'Enseignement supérieur', 'AG-2024-006'),
('550e8400-e29b-41d4-a716-446655440007', 'INST-007', 'Directeur financier', 'Budget', 'AG-2024-007'),
('550e8400-e29b-41d4-a716-446655440008', 'INST-008', 'Procureur', 'Justice', 'AG-2024-008'),
('550e8400-e29b-41d4-a716-446655440009', 'INST-009', 'Chef de projet', 'Écologie', 'AG-2024-009'),
('550e8400-e29b-41d4-a716-446655440010', 'INST-010', 'Conservateur', 'Patrimoine', 'AG-2024-010');

-- ==============================================================================
-- 3. INSERTION DES ADMINISTRATEURS
-- ==============================================================================
INSERT INTO administrateur (id_utilisateur, niveau_habilitation) VALUES
('550e8400-e29b-41d4-a716-446655440011', 'SUPER_ADMIN'),
('550e8400-e29b-41d4-a716-446655440012', 'ADMIN_SECURITE'),
('550e8400-e29b-41d4-a716-446655440013', 'ADMIN_SYSTEME');

-- ==============================================================================
-- 4. INSERTION DES CITOYENS
-- ==============================================================================
INSERT INTO citoyen (id_utilisateur, id_session, ip_adresse) VALUES
('550e8400-e29b-41d4-a716-446655440014', 'sess_abc123def456', '192.168.1.100'),
('550e8400-e29b-41d4-a716-446655440015', 'sess_ghi789jkl012', '192.168.1.101'),
('550e8400-e29b-41d4-a716-446655440016', 'sess_mno345pqr678', '192.168.1.102'),
('550e8400-e29b-41d4-a716-446655440017', 'sess_stu901vwx234', '192.168.1.103'),
('550e8400-e29b-41d4-a716-446655440018', 'sess_yza567bcd890', '192.168.1.104'),
('550e8400-e29b-41d4-a716-446655440019', 'sess_efg123hij456', '192.168.1.105'),
('550e8400-e29b-41d4-a716-446655440020', 'sess_klm789nop012', '192.168.1.106'),
('550e8400-e29b-41d4-a716-446655440021', 'sess_qrs345tuv678', '192.168.1.107'),
('550e8400-e29b-41d4-a716-446655440022', 'sess_wxy901zab234', '192.168.1.108'),
('550e8400-e29b-41d4-a716-446655440023', 'sess_cde567fgh890', '192.168.1.109'),
('550e8400-e29b-41d4-a716-446655440024', 'sess_ijk123lmn456', '192.168.1.110'),
('550e8400-e29b-41d4-a716-446655440025', 'sess_opq789rst012', '192.168.1.111'),
('550e8400-e29b-41d4-a716-446655440026', 'sess_uvw345xyz678', '192.168.1.112'),
('550e8400-e29b-41d4-a716-446655440027', 'sess_ab901cd234ef', '192.168.1.113'),
('550e8400-e29b-41d4-a716-446655440028', 'sess_gh567ij890kl', '192.168.1.114');

-- ==============================================================================
-- 5. INSERTION DES COMMUNIQUÉS
-- ==============================================================================
INSERT INTO communique (id_communique, titre, contenu, date_publication, hash_contenu, qr_code, statut) VALUES
('COM-2024-001', 'Nouvelle politique de santé publique', 'Le gouvernement annonce une nouvelle politique de santé publique visant à améliorer l''accès aux soins pour tous les citoyens. Cette initiative comprend la construction de 50 nouveaux centres de santé et le recrutement de 1000 médecins supplémentaires.', '2024-06-01 10:00:00', 'sha256$7d8f3e2a1b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e', 'QR_CODE_001', 'PUBLIE'),
('COM-2024-002', 'Réforme du système éducatif', 'Le Ministère de l''Éducation nationale lance une réforme ambitieuse du système éducatif. Les principales mesures incluent: la généralisation du numérique, la formation continue des enseignants, et la création de 20 lycées d''excellence.', '2024-06-05 09:30:00', 'sha256$2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2', 'QR_CODE_002', 'PUBLIE'),
('COM-2024-003', 'Plan de relance économique 2024', 'Le gouvernement dévoile son plan de relance économique doté de 500 milliards FCFA. Ce plan vise à soutenir les PME, créer 50 000 emplois et moderniser les infrastructures.', '2024-06-10 11:15:00', 'sha256$3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3', 'QR_CODE_003', 'PUBLIE'),
('COM-2024-004', 'Lutte contre les inondations', 'Le Ministère de l''Hydraulique annonce un programme d''urgence pour lutter contre les inondations dans la région de Dakar. Des travaux de drainage et de curage seront réalisés dans les prochaines semaines.', '2024-06-15 14:45:00', 'sha256$4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4', 'QR_CODE_004', 'BROUILLON'),
('COM-2024-005', 'Campagne de vaccination nationale', 'Lancement de la campagne nationale de vaccination contre la fièvre jaune. La campagne cible 5 millions de personnes et se déroulera du 1er au 30 juillet 2024.', '2024-06-20 08:00:00', 'sha256$5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5', 'QR_CODE_005', 'PUBLIE'),
('COM-2024-006', 'Digitalisation des services publics', 'Le gouvernement accélère la digitalisation des services publics avec le lancement de la plateforme "ServicePublic.sn". 50 services sont désormais disponibles en ligne.', '2024-06-25 10:30:00', 'sha256$6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6', 'QR_CODE_006', 'PUBLIE'),
('COM-2024-007', 'Sécurisation des frontières', 'Renforcement des dispositifs de surveillance aux frontières avec l''acquisition de nouveaux équipements de détection et le recrutement de 500 agents supplémentaires.', '2024-07-01 09:00:00', 'sha256$7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7', 'QR_CODE_007', 'BROUILLON'),
('COM-2024-008', 'Programme agricole 2024-2025', 'Lancement du programme "Sénégal Agricole" avec un investissement de 200 milliards FCFA pour moderniser le secteur agricole et atteindre l''autosuffisance alimentaire.', '2024-07-05 14:15:00', 'sha256$8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8', 'QR_CODE_008', 'PUBLIE'),
('COM-2024-009', 'Nouveau code du travail', 'Présentation du nouveau code du travail qui modernise les relations professionnelles, renforce les droits des travailleurs et facilite l''emploi des jeunes.', '2024-07-10 11:30:00', 'sha256$9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9', 'QR_CODE_009', 'PUBLIE'),
('COM-2024-010', 'Protection de l''environnement', 'Adoption d''un plan national de protection de l''environnement incluant la création de 5 nouvelles aires protégées et un programme de reforestation de 10 000 hectares.', '2024-07-15 15:00:00', 'sha256$0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0', 'QR_CODE_010', 'BROUILLON');

-- ==============================================================================
-- 6. INSERTION DES ARCHIVES
-- ==============================================================================
INSERT INTO archive (id_archive, id_communique, chemin_stockage, taille_fichier, date_archivage) VALUES
('ARC-2024-001', 'COM-2024-001', '/archives/2024/06/COM-2024-001.pdf', 2048576, '2024-06-02 02:00:00'),
('ARC-2024-002', 'COM-2024-002', '/archives/2024/06/COM-2024-002.pdf', 1572864, '2024-06-06 02:00:00'),
('ARC-2024-003', 'COM-2024-003', '/archives/2024/06/COM-2024-003.pdf', 3145728, '2024-06-11 02:00:00'),
('ARC-2024-004', 'COM-2024-005', '/archives/2024/06/COM-2024-005.pdf', 1048576, '2024-06-21 02:00:00'),
('ARC-2024-005', 'COM-2024-006', '/archives/2024/06/COM-2024-006.pdf', 2621440, '2024-06-26 02:00:00'),
('ARC-2024-006', 'COM-2024-008', '/archives/2024/07/COM-2024-008.pdf', 4194304, '2024-07-06 02:00:00'),
('ARC-2024-007', 'COM-2024-009', '/archives/2024/07/COM-2024-009.pdf', 1835008, '2024-07-11 02:00:00');
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- 7. INSERTION DES LOGS DE SÉCURITÉ AVEC GEN_RANDOM_UUID()
-- ==============================================================================
INSERT INTO logs_securite (id_log, id_utilisateur, type_action, date_action, succes, details) VALUES 
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'amadou.diallo@gouv.sn'), 'CONNEXION', '2024-06-01 09:00:00', TRUE, 'Connexion réussie depuis IP 10.0.0.1'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'fatou.ndiaye@presidence.sn'), 'PUBLICATION_COMMUNIQUE', '2024-06-01 10:05:00', TRUE, 'Publication du communiqué COM-2024-001'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'mamadou.sow@interieur.gouv.sn'), 'MODIFICATION_COMMUNIQUE', '2024-06-02 14:30:00', TRUE, 'Modification du communiqué COM-2024-001'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'abdoulaye.ndiaye@gmail.com'), 'CONSULTATION_COMMUNIQUE', '2024-06-01 11:30:00', TRUE, 'Consultation du communiqué COM-2024-001'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'mariama.diop@yahoo.fr'), 'CONSULTATION_COMMUNIQUE', '2024-06-01 14:20:00', TRUE, 'Consultation du communiqué COM-2024-001'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'papa.ndour@admin.gouv.sn'), 'SUPPRESSION_UTILISATEUR', '2024-06-03 08:15:00', FALSE, 'Tentative de suppression d''utilisateur sans droits'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'oumar.mbaye@economie.gouv.sn'), 'GENERATION_CLE', '2024-06-04 11:00:00', TRUE, 'Génération d''une nouvelle clé cryptographique'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'marieme.gueye@education.gouv.sn'), 'SIGNATURE_COMMUNIQUE', '2024-06-05 09:35:00', TRUE, 'Signature du communiqué COM-2024-002'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'ousmane.sow@outlook.com'), 'CONSULTATION_COMMUNIQUE', '2024-06-05 10:15:00', TRUE, 'Consultation du communiqué COM-2024-002'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'awa.fall@gmail.com'), 'CONSULTATION_COMMUNIQUE', '2024-06-05 11:45:00', TRUE, 'Consultation du communiqué COM-2024-002'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'cheikh.diop@finances.gouv.sn'), 'CONNEXION', '2024-06-10 09:30:00', FALSE, 'Tentative de connexion échouée - mot de passe incorrect'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'aminata.seck@justice.gouv.sn'), 'ARCHIVAGE_COMMUNIQUE', '2024-06-11 02:00:00', TRUE, 'Archivage du communiqué COM-2024-003'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'mamadou.mbaye@yahoo.fr'), 'CONSULTATION_COMMUNIQUE', '2024-06-10 14:30:00', TRUE, 'Consultation du communiqué COM-2024-003'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'fatou.gueye@gmail.com'), 'CONSULTATION_COMMUNIQUE', '2024-06-10 16:45:00', TRUE, 'Consultation du communiqué COM-2024-003'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'moustapha.diallo@orange.sn'), 'CONSULTATION_COMMUNIQUE', '2024-06-10 18:20:00', TRUE, 'Consultation du communiqué COM-2024-003'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'moussa.ly@environnement.gouv.sn'), 'MODIFICATION_PROFIL', '2024-06-15 10:00:00', TRUE, 'Mise à jour du profil utilisateur'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'ndeye.kane@culture.gouv.sn'), 'CONNEXION', '2024-06-20 08:30:00', TRUE, 'Connexion réussie depuis IP 10.0.0.2'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'aissatou.ba@gmail.com'), 'CONSULTATION_COMMUNIQUE', '2024-06-20 09:15:00', TRUE, 'Consultation du communiqué COM-2024-005'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'ibrahima.thiam@yahoo.fr'), 'CONSULTATION_COMMUNIQUE', '2024-06-20 11:00:00', TRUE, 'Consultation du communiqué COM-2024-005'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'mame.seck@gmail.com'), 'CONSULTATION_COMMUNIQUE', '2024-06-20 13:30:00', TRUE, 'Consultation du communiqué COM-2024-005'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'aminata.ly@outlook.com'), 'CONSULTATION_COMMUNIQUE', '2024-06-20 15:45:00', TRUE, 'Consultation du communiqué COM-2024-005'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'mamadou.kane@gmail.com'), 'CONSULTATION_COMMUNIQUE', '2024-06-20 17:00:00', TRUE, 'Consultation du communiqué COM-2024-005'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'maimouna.diagne@admin.gouv.sn'), 'EXPORT_DONNEES', '2024-06-25 14:00:00', TRUE, 'Export des logs de sécurité'),
(gen_random_uuid(), (SELECT id_utilisateur FROM utilisateur WHERE email = 'ibrahima.sarr@admin.gouv.sn'), 'SAUVEGARDE_BASE', '2024-06-30 23:00:00', TRUE, 'Sauvegarde complète de la base de données');
-- ==============================================================================
-- 8. INSERTION DES CLÉS CRYPTOGRAPHIQUES
-- ==============================================================================
INSERT INTO cle_cryptographique (id_cle, id_agent_officiel, cle_publique, cle_privee_chiffree, date_creation, date_expiration) VALUES
('KEY-2024-001', '550e8400-e29b-41d4-a716-446655440001', '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCYZM6CwFm\n-----END PUBLIC KEY-----', 'ENCRYPTED_PRIVATE_KEY_001', '2024-01-15 10:00:00', '2025-01-15 10:00:00'),
('KEY-2024-002', '550e8400-e29b-41d4-a716-446655440002', '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCYZM6CwFm\n-----END PUBLIC KEY-----', 'ENCRYPTED_PRIVATE_KEY_002', '2024-01-20 11:30:00', '2025-01-20 11:30:00'),
('KEY-2024-003', '550e8400-e29b-41d4-a716-446655440003', '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCYZM6CwFm\n-----END PUBLIC KEY-----', 'ENCRYPTED_PRIVATE_KEY_003', '2024-02-01 09:15:00', '2025-02-01 09:15:00'),
('KEY-2024-004', '550e8400-e29b-41d4-a716-446655440004', '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCYZM6CwFm\n-----END PUBLIC KEY-----', 'ENCRYPTED_PRIVATE_KEY_004', '2024-02-10 14:45:00', '2025-02-10 14:45:00'),
('KEY-2024-005', '550e8400-e29b-41d4-a716-446655440005', '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCYZM6CwFm\n-----END PUBLIC KEY-----', 'ENCRYPTED_PRIVATE_KEY_005', '2024-03-05 12:00:00', '2025-03-05 12:00:00'),
('KEY-2024-006', '550e8400-e29b-41d4-a716-446655440006', '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCYZM6CwFm\n-----END PUBLIC KEY-----', 'ENCRYPTED_PRIVATE_KEY_006', '2024-03-12 08:30:00', '2025-03-12 08:30:00'),
('KEY-2024-007', '550e8400-e29b-41d4-a716-446655440007', '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCYZM6CwFm\n-----END PUBLIC KEY-----', 'ENCRYPTED_PRIVATE_KEY_007', '2024-04-01 16:45:00', '2025-04-01 16:45:00'),
('KEY-2024-008', '550e8400-e29b-41d4-a716-446655440008', '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCYZM6CwFm\n-----END PUBLIC KEY-----', 'ENCRYPTED_PRIVATE_KEY_008', '2024-04-15 13:30:00', '2025-04-15 13:30:00'),
('KEY-2024-009', '550e8400-e29b-41d4-a716-446655440009', '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCYZM6CwFm\n-----END PUBLIC KEY-----', 'ENCRYPTED_PRIVATE_KEY_009', '2024-05-01 10:20:00', '2025-05-01 10:20:00'),
('KEY-2024-010', '550e8400-e29b-41d4-a716-446655440010', '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCYZM6CwFm\n-----END PUBLIC KEY-----', 'ENCRYPTED_PRIVATE_KEY_010', '2024-05-20 09:45:00', '2025-05-20 09:45:00');

-- ==============================================================================
-- 9. INSERTION DES SIGNATURES
-- ==============================================================================
INSERT INTO signature (id_signature, id_communique, id_agent_officiel, valeur_signature, algorithme_hachage, date_signature, est_valide) VALUES
('SIG-2024-001', 'COM-2024-001', '550e8400-e29b-41d4-a716-446655440001', 'SIGNATURE_001_ABCDEF123456', 'SHA256', '2024-06-01 10:00:00', TRUE),
('SIG-2024-002', 'COM-2024-001', '550e8400-e29b-41d4-a716-446655440002', 'SIGNATURE_002_GHIJKL789012', 'SHA256', '2024-06-01 10:05:00', TRUE),
('SIG-2024-003', 'COM-2024-002', '550e8400-e29b-41d4-a716-446655440006', 'SIGNATURE_003_MNOPQR345678', 'SHA256', '2024-06-05 09:30:00', TRUE),
('SIG-2024-004', 'COM-2024-003', '550e8400-e29b-41d4-a716-446655440005', 'SIGNATURE_004_STUVWX901234', 'SHA256', '2024-06-10 11:15:00', TRUE),
('SIG-2024-005', 'COM-2024-003', '550e8400-e29b-41d4-a716-446655440007', 'SIGNATURE_005_YZABCD567890', 'SHA256', '2024-06-10 11:20:00', TRUE),
('SIG-2024-006', 'COM-2024-005', '550e8400-e29b-41d4-a716-446655440004', 'SIGNATURE_006_EFGHIJ123456', 'SHA256', '2024-06-20 08:00:00', TRUE),
('SIG-2024-007', 'COM-2024-006', '550e8400-e29b-41d4-a716-446655440003', 'SIGNATURE_007_KLMNOP789012', 'SHA256', '2024-06-25 10:30:00', TRUE),
('SIG-2024-008', 'COM-2024-008', '550e8400-e29b-41d4-a716-446655440009', 'SIGNATURE_008_QRSTUV345678', 'SHA256', '2024-07-05 14:15:00', TRUE),
('SIG-2024-009', 'COM-2024-009', '550e8400-e29b-41d4-a716-446655440008', 'SIGNATURE_009_WXYZAB901234', 'SHA256', '2024-07-10 11:30:00', TRUE),
('SIG-2024-010', 'COM-2024-002', '550e8400-e29b-41d4-a716-446655440006', 'SIGNATURE_010_CDEFGH567890', 'SHA256', '2024-06-05 09:35:00', TRUE);

-- ==============================================================================
-- 10. INSERTION DES CONSULTATIONS (CITOYENS - COMMUNIQUÉS)
-- ==============================================================================
-- Consultation du communiqué COM-2024-001
INSERT INTO consultation_citoyen_communique (id_utilisateur, id_communique, date_consultation) VALUES
('550e8400-e29b-41d4-a716-446655440014', 'COM-2024-001', '2024-06-01 11:30:00'),
('550e8400-e29b-41d4-a716-446655440015', 'COM-2024-001', '2024-06-01 14:20:00'),
('550e8400-e29b-41d4-a716-446655440016', 'COM-2024-001', '2024-06-02 09:15:00'),
('550e8400-e29b-41d4-a716-446655440017', 'COM-2024-001', '2024-06-02 16:45:00'),
('550e8400-e29b-41d4-a716-446655440018', 'COM-2024-001', '2024-06-03 10:30:00');

-- Consultation du communiqué COM-2024-002
INSERT INTO consultation_citoyen_communique (id_utilisateur, id_communique, date_consultation) VALUES
('550e8400-e29b-41d4-a716-446655440016', 'COM-2024-002', '2024-06-05 10:15:00'),
('550e8400-e29b-41d4-a716-446655440017', 'COM-2024-002', '2024-06-05 11:45:00'),
('550e8400-e29b-41d4-a716-446655440019', 'COM-2024-002', '2024-06-06 14:00:00'),
('550e8400-e29b-41d4-a716-446655440020', 'COM-2024-002', '2024-06-06 15:30:00'),
('550e8400-e29b-41d4-a716-446655440021', 'COM-2024-002', '2024-06-07 09:45:00'),
('550e8400-e29b-41d4-a716-446655440022', 'COM-2024-002', '2024-06-07 13:20:00');

-- Consultation du communiqué COM-2024-003
INSERT INTO consultation_citoyen_communique (id_utilisateur, id_communique, date_consultation) VALUES
('550e8400-e29b-41d4-a716-446655440018', 'COM-2024-003', '2024-06-10 14:30:00'),
('550e8400-e29b-41d4-a716-446655440019', 'COM-2024-003', '2024-06-10 16:45:00'),
('550e8400-e29b-41d4-a716-446655440020', 'COM-2024-003', '2024-06-10 18:20:00'),
('550e8400-e29b-41d4-a716-446655440023', 'COM-2024-003', '2024-06-11 10:00:00'),
('550e8400-e29b-41d4-a716-446655440024', 'COM-2024-003', '2024-06-11 14:15:00'),
('550e8400-e29b-41d4-a716-446655440025', 'COM-2024-003', '2024-06-12 11:30:00'),
('550e8400-e29b-41d4-a716-446655440026', 'COM-2024-003', '2024-06-12 15:45:00');

-- Consultation du communiqué COM-2024-005
INSERT INTO consultation_citoyen_communique (id_utilisateur, id_communique, date_consultation) VALUES
('550e8400-e29b-41d4-a716-446655440021', 'COM-2024-005', '2024-06-20 09:15:00'),
('550e8400-e29b-41d4-a716-446655440022', 'COM-2024-005', '2024-06-20 11:00:00'),
('550e8400-e29b-41d4-a716-446655440023', 'COM-2024-005', '2024-06-20 13:30:00'),
('550e8400-e29b-41d4-a716-446655440024', 'COM-2024-005', '2024-06-20 15:45:00'),
('550e8400-e29b-41d4-a716-446655440025', 'COM-2024-005', '2024-06-20 17:00:00'),
('550e8400-e29b-41d4-a716-446655440027', 'COM-2024-005', '2024-06-21 08:30:00'),
('550e8400-e29b-41d4-a716-446655440028', 'COM-2024-005', '2024-06-21 10:15:00'),
('550e8400-e29b-41d4-a716-446655440014', 'COM-2024-005', '2024-06-21 14:00:00'),
('550e8400-e29b-41d4-a716-446655440015', 'COM-2024-005', '2024-06-22 09:45:00');

-- Consultation du communiqué COM-2024-006
INSERT INTO consultation_citoyen_communique (id_utilisateur, id_communique, date_consultation) VALUES
('550e8400-e29b-41d4-a716-446655440016', 'COM-2024-006', '2024-06-25 11:30:00'),
('550e8400-e29b-41d4-a716-446655440017', 'COM-2024-006', '2024-06-25 14:15:00'),
('550e8400-e29b-41d4-a716-446655440018', 'COM-2024-006', '2024-06-26 09:00:00'),
('550e8400-e29b-41d4-a716-446655440019', 'COM-2024-006', '2024-06-26 16:30:00');

-- Consultation du communiqué COM-2024-008
INSERT INTO consultation_citoyen_communique (id_utilisateur, id_communique, date_consultation) VALUES
('550e8400-e29b-41d4-a716-446655440020', 'COM-2024-008', '2024-07-05 15:00:00'),
('550e8400-e29b-41d4-a716-446655440021', 'COM-2024-008', '2024-07-06 10:30:00'),
('550e8400-e29b-41d4-a716-446655440022', 'COM-2024-008', '2024-07-06 14:45:00');

-- Consultation du communiqué COM-2024-009
INSERT INTO consultation_citoyen_communique (id_utilisateur, id_communique, date_consultation) VALUES
('550e8400-e29b-41d4-a716-446655440023', 'COM-2024-009', '2024-07-10 12:00:00'),
('550e8400-e29b-41d4-a716-446655440024', 'COM-2024-009', '2024-07-11 09:30:00');

-- ==============================================================================
-- 11. REQUÊTES DE VÉRIFICATION ET STATISTIQUES
-- ==============================================================================

-- Vérification du nombre d'enregistrements par table
SELECT 'utilisateur' AS table_name, COUNT(*) AS record_count FROM utilisateur
UNION ALL SELECT 'agent_officiel', COUNT(*) FROM agent_officiel
UNION ALL SELECT 'administrateur', COUNT(*) FROM administrateur
UNION ALL SELECT 'citoyen', COUNT(*) FROM citoyen
UNION ALL SELECT 'communique', COUNT(*) FROM communique
UNION ALL SELECT 'archive', COUNT(*) FROM archive
UNION ALL SELECT 'logs_securite', COUNT(*) FROM logs_securite
UNION ALL SELECT 'cle_cryptographique', COUNT(*) FROM cle_cryptographique
UNION ALL SELECT 'signature', COUNT(*) FROM signature
UNION ALL SELECT 'consultation_citoyen_communique', COUNT(*) FROM consultation_citoyen_communique;

-- Statistiques des consultations par communiqué
SELECT 
    c.id_communique,
    c.titre,
    COUNT(cc.id_utilisateur) AS nb_consultations,
    COUNT(DISTINCT cc.id_utilisateur) AS nb_citoyens_uniques
FROM communique c
LEFT JOIN consultation_citoyen_communique cc ON c.id_communique = cc.id_communique
GROUP BY c.id_communique, c.titre
ORDER BY nb_consultations DESC;

-- Statistiques des signatures par agent
SELECT 
    ao.id_utilisateur,
    u.nom,
    u.prenom,
    COUNT(s.id_signature) AS nb_signatures,
    COUNT(DISTINCT s.id_communique) AS nb_communiques_signes
FROM agent_officiel ao
JOIN utilisateur u ON ao.id_utilisateur = u.id_utilisateur
LEFT JOIN signature s ON ao.id_utilisateur = s.id_agent_officiel
GROUP BY ao.id_utilisateur, u.nom, u.prenom
ORDER BY nb_signatures DESC;

-- Activité récente des utilisateurs
SELECT 
    u.nom,
    u.prenom,
    u.email,
    COUNT(l.id_log) AS nb_actions,
    MAX(l.date_action) AS derniere_action
FROM utilisateur u
LEFT JOIN logs_securite l ON u.id_utilisateur = l.id_utilisateur
GROUP BY u.id_utilisateur, u.nom, u.prenom, u.email
ORDER BY derniere_action DESC NULLS LAST
LIMIT 20;


-- ============================================================
-- PROCEDURE : LOGIN AGENT + GENERATION OTP
-- ============================================================
CREATE OR REPLACE FUNCTION login_agent(
    p_email VARCHAR,
    p_password VARCHAR
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    id_user VARCHAR
)
AS $$
DECLARE
    v_user utilisateur%ROWTYPE;
BEGIN
    SELECT * INTO v_user
    FROM utilisateur
    WHERE email = p_email;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Utilisateur non trouvé', NULL;
        RETURN;
    END IF;

    IF crypt(p_password, v_user.mot_de_passe) = v_user.mot_de_passe THEN

        INSERT INTO auth_otp(
            id_utilisateur,
            code_otp,
            date_expiration
        )
        VALUES(
            v_user.id_utilisateur,
            FLOOR(RANDOM() * 900000 + 100000)::TEXT,
            NOW() + INTERVAL '5 minutes'
        );

        RETURN QUERY SELECT TRUE, 'OTP envoyé', v_user.id_utilisateur;
    ELSE
        RETURN QUERY SELECT FALSE, 'Mot de passe incorrect', NULL;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PROCEDURE : VERIFICATION OTP (2FA)
-- ============================================================
CREATE OR REPLACE FUNCTION verify_otp(
    p_user_id VARCHAR,
    p_code VARCHAR
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
)
AS $$
DECLARE
    v_otp RECORD;
BEGIN
    SELECT * INTO v_otp
    FROM auth_otp
    WHERE id_utilisateur = p_user_id
    AND code_otp = p_code
    AND est_utilise = FALSE
    ORDER BY date_expiration DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Code invalide';
        RETURN;
    END IF;

    IF v_otp.date_expiration < NOW() THEN
        RETURN QUERY SELECT FALSE, 'Code expiré';
        RETURN;
    END IF;

    UPDATE auth_otp
    SET est_utilise = TRUE
    WHERE id_otp = v_otp.id_otp;

    RETURN QUERY SELECT TRUE, 'Authentification réussie';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PROCEDURE : CREATION UTILISATEUR
-- ============================================================
CREATE OR REPLACE FUNCTION create_user(
    p_nom VARCHAR,
    p_prenom VARCHAR,
    p_email VARCHAR,
    p_password VARCHAR
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO utilisateur(
        id_utilisateur,
        nom,
        prenom,
        email,
        mot_de_passe
    )
    VALUES(
        gen_random_uuid(),
        p_nom,
        p_prenom,
        p_email,
        crypt(p_password, gen_salt('bf'))
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PROCEDURE : CREATION COMMUNIQUE
-- ============================================================
CREATE OR REPLACE FUNCTION create_communique(
    p_titre TEXT,
    p_contenu TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO communique(
        id_communique,
        titre,
        contenu,
        hash_contenu
    )
    VALUES(
        gen_random_uuid(),
        p_titre,
        p_contenu,
        encode(digest(p_contenu, 'sha256'), 'hex')
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PROCEDURE : SIGNATURE COMMUNIQUE
-- ============================================================
CREATE OR REPLACE FUNCTION signer_communique(
    p_id_communique VARCHAR,
    p_id_agent VARCHAR,
    p_signature TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO signature(
        id_signature,
        id_communique,
        id_agent_officiel,
        valeur_signature,
        algorithme_hachage
    )
    VALUES(
        gen_random_uuid(),
        p_id_communique,
        p_id_agent,
        p_signature,
        'SHA256'
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- PROCEDURE : LOGGING SECURITE
-- ============================================================
CREATE OR REPLACE FUNCTION log_action(
    p_user VARCHAR,
    p_action TEXT,
    p_succes BOOLEAN,
    p_details TEXT
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO logs_securite(
        id_log,
        id_utilisateur,
        type_action,
        succes,
        details
    )
    VALUES(
        gen_random_uuid(),
        p_user,
        p_action,
        p_succes,
        p_details
    );
END;
$$ LANGUAGE plpgsql;