
-- 1. Ajout de `theme` et `mots_cles` à `communique`
ALTER TABLE signature_communiques_officiels.communique
ADD COLUMN IF NOT EXISTS theme VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS mots_cles TEXT NULL;

-- 2. Index sur le thème pour filtrage rapide
CREATE INDEX IF NOT EXISTS idx_communique_theme 
ON signature_communiques_officiels.communique (theme);

-- 3. Ajout de `contenu_extrait` à `archive` pour stocker le résultat OCR
ALTER TABLE signature_communiques_officiels.archive
ADD COLUMN IF NOT EXISTS contenu_extrait TEXT NULL;

-- 4. Options pour la recherche Full-Text dans Postgres:
CREATE INDEX IF NOT EXISTS idx_archive_contenu_extrait_gin 
ON signature_communiques_officiels.archive 
USING GIN (to_tsvector('french', coalesce(contenu_extrait, '')));

CREATE INDEX IF NOT EXISTS idx_communique_contenu_gin 
ON signature_communiques_officiels.communique 
USING GIN (to_tsvector('french', coalesce(titre, '') || ' ' || coalesce(contenu, '') || ' ' || coalesce(mots_cles, '')));
