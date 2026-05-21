# 🛡️ SHIELD — Système de Signature Numérique des Communiqués Officiels

> **Projet de Fin d'Études (PFE)** — Application web fullstack de gestion, signature numérique et publication de communiqués officiels, avec authentification forte (2FA TOTP + email), OCR multilingue, recherche plein-texte intelligente, panneau d'administration complet et vérification publique de documents.

---

## 📐 Architecture du Projet

```
PFE/
├── backend/                        # API REST — FastAPI / Python 3.10+
│   ├── app/
│   │   ├── core/                   # Noyau : config, DB, JWT, bcrypt
│   │   │   ├── config.py           # Variables d'environnement (Pydantic Settings)
│   │   │   ├── database.py         # Engine SQLAlchemy + session PostgreSQL
│   │   │   ├── auth.py             # Hash / vérification bcrypt
│   │   │   └── jwt_utils.py        # Création / décodage JWT, dépendance FastAPI
│   │   ├── models/
│   │   │   └── models.py           # Modèles ORM SQLAlchemy (toutes les tables)
│   │   ├── schemas/
│   │   │   └── schemas.py          # Schémas Pydantic v2 (requêtes + réponses)
│   │   ├── routes/                 # Endpoints HTTP organisés par domaine
│   │   │   ├── login.py            # Auth (login, 2FA TOTP, 2FA email, /me)
│   │   │   ├── register.py         # Inscription (agent, admin, citoyen)
│   │   │   ├── keys.py             # Clés RSA (génération, renouvellement)
│   │   │   ├── signatures.py       # Signature / vérification / intégrité
│   │   │   ├── documents.py        # Workflow complet : upload → sign → finalize → archive
│   │   │   ├── search.py           # Recherche plein-texte + suggestions
│   │   │   ├── ocr.py              # Extraction de texte (PDF, DOCX, image)
│   │   │   └── admin.py            # [À CRÉER] Panneau administrateur
│   │   ├── services/               # Logique métier
│   │   │   ├── auth_service.py     # Authentification + 2FA complet
│   │   │   ├── key_service.py      # Génération/chiffrement clés RSA (Fernet)
│   │   │   ├── signature_service.py# Signature RSA-PSS SHA256 + vérification
│   │   │   ├── search_service.py   # Algorithmes de scoring de pertinence
│   │   │   ├── ocr_service.py      # Tesseract (fr+en) + pdf2image + python-docx
│   │   │   ├── totp_service.py     # TOTP / Google Authenticator (pyotp)
│   │   │   ├── email_service.py    # SMTP 2FA code par email
│   │   │   └── qrcode_gen.py       # Génération de QR codes
│   │   └── main.py                 # Point d'entrée FastAPI + CORS + routeur
│   ├── all_routers.py              # Agrégateur de tous les routeurs
│   ├── requirements.txt            # Dépendances Python (production)
│   ├── requirements-dev.txt        # Dépendances dev (tests, linters)
│   └── script_bd.sql               # Script SQL alternatif
│
├── frontend/                       # SPA — React 18 + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── App.tsx                 # Racine — wrapping AuthProvider
│   │   ├── main.tsx                # Point d'entrée Vite/React
│   │   ├── context/
│   │   │   └── AuthContext.tsx     # Contexte global auth (token + user)
│   │   ├── routes/
│   │   │   └── AppRouter.tsx       # Routing React Router v6
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── Login.tsx       # Formulaire de connexion
│   │   │   │   └── OTP.tsx         # Saisie code 2FA (TOTP ou email)
│   │   │   └── dashboard/
│   │   │       ├── Search.tsx      # Recherche de communiqués
│   │   │       ├── Sign.tsx        # Workflow de signature (upload→sign→finalize→archive)
│   │   │       ├── MyDocuments.tsx # Mes documents signés
│   │   │       ├── Signatures.tsx  # Historique des signatures
│   │   │       ├── Keys.tsx        # Gestion des clés RSA
│   │   │       ├── OCR.tsx         # Upload + extraction de texte
│   │   │       ├── Profile.tsx     # Profil utilisateur + 2FA settings
│   │   │       ├── Settings.tsx    # Paramètres de l'application
│   │   │       └── Admin/          # [À CRÉER] Panneau d'administration
│   │   ├── components/
│   │   │   ├── layout/             # AuthLayout, MainLayout, ProtectedRoute
│   │   │   └── ui/                 # Button, Card, Input, Alert, ThemeToggle
│   │   ├── services/
│   │   │   └── api.ts              # Couche HTTP complète (auth, keys, signatures, documents, search, ocr)
│   │   ├── types/
│   │   │   └── index.ts            # Types TypeScript centralisés
│   │   └── hooks/
│   │       └── useDarkMode.ts      # Hook dark mode
│   ├── package.json                # Dépendances Node.js
│   ├── vite.config.ts              # Config Vite
│   ├── tailwind.config.js          # Config Tailwind CSS
│   └── .env                        # Variables d'environnement frontend
│
├── Database.sql                    # Schéma PostgreSQL complet v1
├── Database_v2.sql                 # Schéma PostgreSQL complet v2 (colonnes étendues)
├── signature_communiques_officiels.backup  # Dump PostgreSQL (pg_dump)
└── docs/                           # Documents académiques du PFE
    ├── Cahier_De_Charge.pdf
    └── Note_de_Proposition_de_Projet_de_Fin_d'Études.pdf
```

### Flux d'architecture

```
  Navigateur (React SPA)
        │  HTTP/REST JSON
        ▼
  FastAPI (Uvicorn)  ──►  PostgreSQL (schéma: signature_communiques_officiels)
        │
        ├──► Tesseract OCR (extraction texte)
        ├──► Fernet / RSA-PSS (chiffrement clés + signature)
        ├──► pyotp / TOTP (2FA Google Auth)
        ├──► SMTP (2FA par email)
        └──► reportlab + PyPDF2 (génération et manipulation PDF)
```

---

## 🗄️ Modèle de Base de Données

Le schéma `signature_communiques_officiels` contient les tables suivantes :

| Table | Description |
|---|---|
| `utilisateur` | Table mère — tous les utilisateurs (héritage UML) |
| `agent_officiel` | Agents habilités à créer et signer des communiqués |
| `administrateur` | Admins système (SUPER_ADMIN / ADMIN_SECURITE / ADMIN_SYSTEME) |
| `citoyen` | Utilisateurs publics (consultation + vérification de documents) |
| `communique` | Documents officiels (cycle : BROUILLON → PUBLIE → ARCHIVE) |
| `archive` | PDF générés et stockés après publication |
| `cle_cryptographique` | Paires RSA 2048 bits des agents (clé privée chiffrée AES-256) |
| `signature` | Signatures numériques RSA-PSS SHA256 des communiqués + metadata QR |
| `consultation_citoyen_communique` | Traçage des consultations (M:N) |
| `logs_securite` | Journal d'audit immuable de toutes les actions |
| `auth_otp` | Codes OTP email à usage unique (2FA) |
| `utilisateur_2fa` | Secrets TOTP Google Authenticator par utilisateur |
| `auth_email_code` | Codes 2FA envoyés par email |

### Colonnes étendues (Database_v2.sql)

La table `communique` dispose de colonnes supplémentaires :

| Colonne | Type | Description |
|---|---|---|
| `contenu_normalise` | TEXT | Contenu normalisé pour la recherche plein-texte |
| `id_auteur` | UUID FK | Référence vers l'agent créateur |
| `fichier_signe` | VARCHAR(500) | Chemin vers le PDF signé sur disque |
| `est_archive` | BOOLEAN | Flag de visibilité publique |

La table `signature` dispose également de :

| Colonne | Type | Description |
|---|---|---|
| `metadata_qr` | TEXT | Métadonnées JSON intégrées dans le QR code |

---

## 🔐 Hiérarchie des Rôles et Permissions

```
SUPER_ADMIN
  ├── Crée les comptes ADMIN_SYSTEME et ADMIN_SECURITE
  ├── A tous les droits d'un ADMIN_SYSTEME
  ├── Ne peut pas être bloqué ou avoir son 2FA désactivé par un autre admin
  └── Accès complet aux logs d'audit

ADMIN_SYSTEME
  ├── Crée les comptes AgentOfficiel
  ├── Active/désactive le token d'accès de tout utilisateur (sauf SUPER_ADMIN)
  ├── Active/désactive le 2FA de tout utilisateur (sauf SUPER_ADMIN)
  ├── Réinitialise les mots de passe
  └── Consulte les logs d'audit de tous les utilisateurs

ADMIN_SECURITE
  ├── Consulte les logs d'audit
  └── Vérifie les signatures et l'intégrité des documents

AgentOfficiel
  ├── Upload, signe, finalise et archive des communiqués
  ├── Gère ses propres clés RSA
  └── Consulte ses propres statistiques de signature

Citoyen
  ├── Consulte les communiqués publiés
  ├── Effectue des recherches
  └── Vérifie l'authenticité d'un document signé (scan QR code)
```

### Règles de création de comptes

| Créateur | Peut créer |
|---|---|
| SUPER_ADMIN | SUPER_ADMIN, ADMIN_SYSTEME, ADMIN_SECURITE |
| ADMIN_SYSTEME | AgentOfficiel |
| Public | Citoyen (auto-inscription) |

> **Important :** Lorsqu'un ADMIN_SYSTEME crée un compte AgentOfficiel depuis le panneau admin :
> - Le token d'accès est **désactivé par défaut** (nécessite une autorisation explicite via toggle)
> - Le 2FA est **activé automatiquement**
> - L'agent reçoit ses identifiants par email
> - L'admin est redirigé vers la table des utilisateurs après la création

---

## 🔧 Prérequis Système

| Outil | Version minimale | Vérification |
|---|---|---|
| Python | 3.10+ | `python3 --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| PostgreSQL | 14+ | `psql --version` |
| Tesseract OCR | 5+ | `tesseract --version` |
| Poppler (pdf2image) | — | `pdfinfo --version` |
| Git | — | `git --version` |

### Installation des dépendances système (Ubuntu/Debian)

```bash
# PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# Tesseract OCR + langues français et anglais
sudo apt install tesseract-ocr tesseract-ocr-fra tesseract-ocr-eng -y

# Poppler (pdf2image)
sudo apt install poppler-utils -y

# Outils de build Python
sudo apt install python3-pip python3-venv build-essential libpq-dev -y
```

### Installation des dépendances système (macOS avec Homebrew)

```bash
brew install postgresql tesseract poppler
brew install tesseract-lang  # pour le français
```

### Installation des dépendances système (Windows)

- **PostgreSQL** : [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)
- **Tesseract** : [github.com/UB-Mannheim/tesseract/wiki](https://github.com/UB-Mannheim/tesseract/wiki)
- **Poppler** : [github.com/oschwartz10612/poppler-windows](https://github.com/oschwartz10612/poppler-windows/releases) — ajouter le `bin/` au PATH

---

## 🚀 Installation et Démarrage (Développement Local)

### 1. Cloner le dépôt

```bash
git clone https://github.com/<votre-organisation>/shield-pfe.git
cd shield-pfe
```

### 2. Configurer la Base de Données PostgreSQL

```bash
# Démarrer PostgreSQL (Linux)
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Se connecter en tant que postgres
sudo -u postgres psql

# Dans psql, créer l'utilisateur et la base
CREATE USER shield WITH PASSWORD 'securepassword'; //mot de passe du shield par defaut : "securepassword"
CREATE DATABASE signature_communiques_officiels
    WITH ENCODING='UTF8'
    OWNER=shield;
GRANT ALL PRIVILEGES ON DATABASE signature_communiques_officiels TO shield;
\q
```

```bash
# Importer le schéma SQL (utiliser v2 qui inclut toutes les colonnes)
psql -U shield -d signature_communiques_officiels -f Database_v2.sql
```

> **Astuce** : si vous préférez restaurer depuis le backup pg_dump :
> ```bash
> pg_restore -U shield -d signature_communiques_officiels \
>   --no-owner --role=shield \
>   signature_communiques_officiels.backup
> ```

### 3. Configurer le Backend

```bash
cd backend

# Créer et activer l'environnement virtuel Python
python3 -m venv .venv
source .venv/bin/activate        # Linux/macOS
# .venv\Scripts\activate         # Windows

# Installer les dépendances
pip install -r requirements.txt

# Créer le fichier .env (copier depuis l'exemple)
cp configuration_du_fichier_env.txt .env
```

Éditer `.env` avec vos valeurs réelles :

```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=signature_communiques_officiels
DB_USER=shield
DB_PASSWORD=votre_mot_de_passe_ici

# JWT — CHANGEZ OBLIGATOIREMENT CETTE CLÉ !
JWT_SECRET_KEY=une_cle_tres_longue_et_aleatoire_minimum_32_chars
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# Bcrypt
BCRYPT_ROUNDS=12

# 2FA
OTP_EXPIRE_SECONDS=300
OTP_LENGTH=6

# Clé Fernet — GÉNÉREZ AVEC LA COMMANDE CI-DESSOUS
ENCRYPTION_KEY=votre_cle_fernet_generee_ici

# Email 2FA (optionnel en dev — simulation si vide)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
FROM_EMAIL=shield@votre-domaine.com

# Réinitialisation de mot de passe
FRONTEND_URL=http://localhost:5173
PASSWORD_RESET_EXPIRE_MINUTES=30
```

**Générer la clé Fernet :**

```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 4. Démarrer le Backend

```bash
# Depuis le dossier backend/, avec le venv activé
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

L'API est disponible sur :
- **Swagger UI** : http://localhost:8000/docs
- **ReDoc** : http://localhost:8000/redoc
- **Racine** : http://localhost:8000/

### 5. Configurer et Démarrer le Frontend

```bash
cd frontend

# Installer les dépendances Node.js
npm install

# Vérifier le fichier .env
cat .env
# VITE_API_URL=http://localhost:8000/api

# Démarrer le serveur de développement
npm run dev
```

Le frontend est disponible sur : **http://localhost:5173**

---

## 🌐 Endpoints API — Référence Complète

### Authentification

| Méthode | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | Connexion (email + mot de passe) | Non |
| POST | `/api/auth/verify-2fa` | Validation code 2FA (TOTP ou email) | Non |
| POST | `/api/auth/2fa/request-email` | Demander code 2FA par email | Non |
| POST | `/api/auth/2fa/enable` | Activer Google Authenticator | JWT |
| POST | `/api/auth/2fa/disable` | Désactiver 2FA | JWT |
| GET | `/api/auth/2fa/status` | Statut 2FA de l'utilisateur connecté | JWT |
| GET | `/api/auth/me` | Infos utilisateur connecté | JWT |
| POST | `/api/auth/2fa/backup-codes` | Générer codes de secours | JWT |
| POST | `/api/auth/forgot-password` | [À CRÉER] Demande de réinitialisation MDP | Non |
| POST | `/api/auth/reset-password` | [À CRÉER] Réinitialisation MDP via token email | Non |

### Inscription

| Méthode | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/register/agent` | Inscrire un agent officiel (à restreindre en prod) | Non |
| POST | `/api/register/admin` | Inscrire un administrateur (à restreindre en prod) | Non |
| POST | `/api/register/citoyen` | Inscrire un citoyen | Non |

### Clés RSA

| Méthode | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/keys/generate` | Générer paire RSA 2048 bits | JWT (agent) |
| POST | `/api/keys/renew` | Renouveler les clés | JWT (agent) |
| GET | `/api/keys/my-keys` | Lister mes clés | JWT (agent) |

### Documents (Workflow complet)

| Méthode | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/documents/upload` | Upload PDF/DOCX/image, extraction OCR, création brouillon | JWT (agent) |
| POST | `/api/documents/sign` | Signer le communiqué + générer QR code avec métadonnées | JWT (agent) |
| POST | `/api/documents/finalize` | Intégrer le QR code dans le PDF aux coordonnées choisies | JWT (agent) |
| POST | `/api/documents/archive` | Archiver (statut → PUBLIE, visible en recherche) | JWT (agent) |
| GET | `/api/documents/my` | Lister mes documents | JWT (agent) |
| GET | `/api/documents/{id}/download` | Télécharger le PDF signé | Public (archivé) |
| DELETE | `/api/documents/{id}` | Supprimer un document | JWT (agent) |
| PATCH | `/api/documents/{id}/unarchive` | Désarchiver un document | JWT (agent) |
| POST | `/api/documents/verify` | Vérifier l'authenticité d'un document (scan QR) | Public |

### Signatures

| Méthode | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/signatures/sign` | Signer un communiqué existant | JWT (agent) |
| POST | `/api/signatures/verify` | Vérifier une signature par ID | JWT |
| GET | `/api/signatures/validate/{id}` | Intégrité complète d'un document | JWT |
| GET | `/api/signatures/my-signatures` | Mes signatures (paginé) | JWT (agent) |
| GET | `/api/signatures/communique/{id}` | Signatures d'un communiqué | JWT |
| GET | `/api/signatures/pending` | Documents en attente de signature | JWT (agent) |
| GET | `/api/signatures/stats` | Statistiques de signatures | JWT (agent) |

### Recherche

| Méthode | Route | Description | Auth |
|---|---|---|---|
| GET | `/api/search/simple?q=...` | Recherche par mot-clé | Non |
| GET | `/api/search/advanced` | Recherche avancée avec filtres | Non |
| GET | `/api/search/suggestions?q=...` | Autocomplétion | Non |
| GET | `/api/search/popular` | Communiqués populaires | Non |
| GET | `/api/search/recent` | Communiqués récents | Non |

### OCR

| Méthode | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/ocr/extract` | Extraire texte (PDF/DOCX/PNG/JPG) bilingue fr+en | Non |

### Administration [À CRÉER]

| Méthode | Route | Description | Auth |
|---|---|---|---|
| GET | `/api/admin/users` | Lister tous les utilisateurs (avec filtre/recherche) | JWT (admin) |
| GET | `/api/admin/users/active-sessions` | Utilisateurs avec session active | JWT (admin) |
| POST | `/api/admin/users/agent` | Créer un compte AgentOfficiel (token désactivé + 2FA auto) | JWT (ADMIN_SYSTEME+) |
| POST | `/api/admin/users/admin` | Créer un compte Administrateur | JWT (SUPER_ADMIN) |
| PATCH | `/api/admin/users/{id}/toggle-access` | Activer/bloquer le token d'accès | JWT (ADMIN_SYSTEME+) |
| PATCH | `/api/admin/users/{id}/toggle-2fa` | Activer/désactiver le 2FA | JWT (ADMIN_SYSTEME+) |
| POST | `/api/admin/users/{id}/reset-password` | Réinitialiser le mot de passe | JWT (ADMIN_SYSTEME+) |
| GET | `/api/admin/logs` | Logs d'audit centralisés (tous les utilisateurs) | JWT (admin) |
| GET | `/api/admin/stats` | Statistiques globales de la plateforme | JWT (admin) |

---

## 📋 Fonctionnalités — État d'Avancement

### ✅ Fonctionnalités Terminées

- [x] Authentification JWT (login, logout, token refresh implicite)
- [x] Double authentification (2FA) : Google Authenticator (TOTP) + Email OTP
- [x] Inscription multi-rôles : Agent, Administrateur, Citoyen
- [x] Génération et renouvellement de paires de clés RSA 2048 bits
- [x] Workflow complet de signature : upload → OCR → sign → QR → finalize → archive
- [x] Signature numérique RSA-PSS SHA256 des communiqués
- [x] Intégration du QR code dans le PDF aux coordonnées définies par l'agent
- [x] Vérification et validation d'intégrité des signatures
- [x] Vérification publique de document via scan QR code (`POST /api/documents/verify`)
- [x] Extraction OCR (PDF, DOCX, PNG, JPG) — bilingue fr+en
- [x] Recherche plein-texte avec scoring de pertinence
- [x] Recherche avancée avec filtres (statut, date, auteur)
- [x] Autocomplétion et suggestions de recherche
- [x] Logs de sécurité et audit par utilisateur
- [x] Interface frontend complète avec mode sombre / clair
- [x] Page « Mes Documents » pour les agents
- [x] Page « Sign » : workflow pas-à-pas complet pour signer un document

### 🔄 Fonctionnalités à Développer (Phase 2)

- [ ] **Réinitialisation de mot de passe** : tous les utilisateurs peuvent demander un lien par email (`forgot-password` + `reset-password`)
- [ ] **Panneau d'administration** :
  - [ ] Tableau de bord avec statistiques globales (utilisateurs, signatures, documents)
  - [ ] Création de comptes AgentOfficiel par ADMIN_SYSTEME (token désactivé + 2FA auto, redirection vers table)
  - [ ] Création de comptes Administrateur par SUPER_ADMIN
  - [ ] Table centralisée de tous les utilisateurs avec recherche et filtres
  - [ ] Toggle d'autorisation du token d'accès par utilisateur (sauf SUPER_ADMIN)
  - [ ] Toggle d'activation du 2FA par utilisateur (sauf SUPER_ADMIN)
  - [ ] Visualisation des sessions actives
  - [ ] Logs d'audit centralisés consultables par tous les administrateurs
- [ ] **Contrôle d'accès renforcé** : bloquer l'accès si `token_autorise = false` au niveau du middleware
- [ ] **Restriction des endpoints `/register/agent` et `/register/admin`** : accessibles uniquement via le panneau admin en production

### ❌ Fonctionnalités Non Commencées

- [ ] **Tests automatisés** : pytest est installé mais aucun test n'est écrit
- [ ] **CI/CD** : le fichier `.github/workflows/static.yml` ne couvre que le frontend statique
- [ ] **Déploiement Docker** : aucun Dockerfile ou docker-compose présent
- [ ] **Codes de secours 2FA** : les codes sont générés en mémoire mais non persistés en base
- [ ] **Notifications email** : alertes lors de publications ou signatures importantes

---

## 📦 Dépendances Clés

### Backend (Python)

| Package | Version | Rôle |
|---|---|---|
| fastapi | 0.135.x | Framework API REST asynchrone |
| uvicorn | 0.42.x | Serveur ASGI |
| sqlalchemy | 2.0.x | ORM PostgreSQL |
| psycopg2-binary | 2.9.x | Driver PostgreSQL |
| pydantic / pydantic-settings | 2.x | Validation + config .env |
| python-jose | 3.x | JWT (création + décodage) |
| bcrypt | 5.x | Hachage des mots de passe |
| cryptography | 46.x | RSA-PSS, Fernet (AES-256) |
| pyotp | 2.9.x | TOTP (Google Authenticator) |
| qrcode | 8.x | Génération QR codes |
| pytesseract | 0.3.x | OCR via Tesseract |
| pdf2image | 1.17.x | Conversion PDF → image |
| python-docx | 1.2.x | Lecture DOCX |
| pillow | 10.x | Traitement d'images |
| reportlab | 4.4.x | Manipulation et génération PDF |
| PyPDF2 | 3.0.x | Fusion de pages PDF (overlay QR) |

### Frontend (Node.js)

| Package | Version | Rôle |
|---|---|---|
| react + react-dom | 18.x | Framework UI |
| react-router-dom | 6.x | Routing SPA |
| typescript | 5.9.x | Typage statique |
| vite | 8.x | Bundler ultra-rapide |
| tailwindcss | 3.x | Utility-first CSS |
| lucide-react | 1.7.x | Icônes SVG |

---

## 🔑 Variables d'Environnement

### Backend (`backend/.env`)

| Variable | Description | Obligatoire |
|---|---|---|
| `DB_HOST` | Hôte PostgreSQL | ✅ |
| `DB_PORT` | Port PostgreSQL (défaut : 5432) | ✅ |
| `DB_NAME` | Nom de la base | ✅ |
| `DB_USER` | Utilisateur PostgreSQL | ✅ |
| `DB_PASSWORD` | Mot de passe PostgreSQL | ✅ |
| `JWT_SECRET_KEY` | Clé secrète JWT (min. 32 chars) | ✅ |
| `JWT_ALGORITHM` | Algorithme JWT (défaut : HS256) | — |
| `JWT_EXPIRE_MINUTES` | Durée validité token (défaut : 60) | — |
| `BCRYPT_ROUNDS` | Rounds bcrypt (défaut : 12) | — |
| `ENCRYPTION_KEY` | Clé Fernet pour chiffrer les clés RSA | ✅ |
| `OTP_EXPIRE_SECONDS` | Durée validité OTP email (défaut : 300) | — |
| `SMTP_HOST` | Serveur SMTP pour 2FA email | — |
| `SMTP_PORT` | Port SMTP (défaut : 587) | — |
| `SMTP_USER` | Identifiant SMTP | — |
| `SMTP_PASSWORD` | Mot de passe SMTP | — |
| `FROM_EMAIL` | Adresse d'expédition | — |
| `FRONTEND_URL` | URL du frontend (pour liens email) | — |
| `PASSWORD_RESET_EXPIRE_MINUTES` | Durée du lien de reset MDP (défaut : 30) | — |

### Frontend (`frontend/.env`)

| Variable | Description | Défaut |
|---|---|---|
| `VITE_API_URL` | URL de base de l'API backend | `http://localhost:8000/api` |

---

## 🧪 Tester la Plateforme

### Test rapide via Swagger UI

1. Ouvrir http://localhost:8000/docs
2. Inscrire un agent : `POST /api/register/agent`
3. Se connecter : `POST /api/auth/login` → récupérer le `access_token`
4. Cliquer sur **Authorize** en haut, coller le token
5. Générer des clés RSA : `POST /api/keys/generate`
6. Uploader un document : `POST /api/documents/upload`
7. Signer : `POST /api/documents/sign`
8. Finaliser avec QR : `POST /api/documents/finalize`
9. Archiver : `POST /api/documents/archive`

### Test de vérification publique (citoyen)

```bash
# Vérifier un document en fournissant le fichier et les données QR scannées
curl -X POST http://localhost:8000/api/documents/verify \
  -F "file=@document_scanne.pdf" \
  -F 'qr_data={"v":"1","sig_id":"...","com_id":"...","agent_id":"...","key_fp":"...","algo":"RSA-PSS-SHA256","ts":"..."}'
```

### Test via curl

```bash
# 1. Inscrire un agent
curl -X POST http://localhost:8000/api/register/agent \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Dupont",
    "prenom": "Jean",
    "email": "jean.dupont@gouv.cm",
    "mot_de_passe": "MonMDP@2026",
    "confirmer_mot_de_passe": "MonMDP@2026",
    "id_institution": "INST-001",
    "fonction": "Directeur",
    "matricule": "MAT-001"
  }'

# 2. Se connecter
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "jean.dupont@gouv.cm", "mot_de_passe": "MonMDP@2026"}'

# 3. Générer des clés (remplacer TOKEN)
curl -X POST http://localhost:8000/api/keys/generate \
  -H "Authorization: Bearer TOKEN"

# 4. Recherche simple
curl "http://localhost:8000/api/search/simple?q=test"
```

---

## ⚠️ Notes de Sécurité pour la Production

1. **JWT_SECRET_KEY** : utiliser une chaîne aléatoire d'au moins 64 caractères
2. **CORS** : remplacer les origines localhost par les origines de production
3. **HTTPS** : toujours activer TLS en production (nginx + Let's Encrypt)
4. **BCrypt rounds** : 12 minimum, 14 recommandé en production
5. **echo=True** dans SQLAlchemy : désactiver en production (supprime les logs SQL)
6. **Backup ENCRYPTION_KEY** : perte de cette clé = perte irréversible de toutes les clés RSA
7. **Endpoints `/register/agent` et `/register/admin`** : à restreindre aux administrateurs en production
8. **Tokens désactivés** : le middleware doit rejeter les requêtes des utilisateurs dont `token_autorise = false`

---

## 🗺️ Feuille de Route — Phase 2

### Priorité haute

1. Réinitialisation de mot de passe (tous les utilisateurs)
2. Middleware de contrôle d'accès : vérifier `token_autorise` à chaque requête
3. Route admin : `app/routes/admin.py` + service associé
4. Page admin frontend : tableau de bord + table utilisateurs avec toggles

### Priorité moyenne

5. Restriction des routes d'inscription (agents/admins uniquement via panneau admin)
6. Persistance des codes de secours 2FA en base de données
7. Notifications email (publication, signature, création de compte)

### Priorité basse

8. Tests automatisés : pytest (unitaires + intégration)
9. Docker : Dockerfile + docker-compose (backend + frontend + postgres + tesseract)
10. CI/CD : pipeline GitHub Actions complet

---

## 👥 Modules par Fonctionnalité

| Module | Fichiers concernés |
|---|---|
| Auth + 2FA | `routes/login.py`, `services/auth_service.py`, `services/totp_service.py`, `services/email_service.py` |
| Cryptographie | `services/key_service.py`, `services/signature_service.py`, `services/qrcode_gen.py` |
| Documents | `routes/documents.py`, `services/ocr_service.py` |
| Recherche | `routes/search.py`, `services/search_service.py` |
| Administration | `routes/admin.py` [À CRÉER], service admin [À CRÉER] |
| Base de données | `models/models.py`, `Database.sql`, `Database_v2.sql` |
| Frontend | `src/pages/`, `src/services/api.ts`, `src/context/AuthContext.tsx` |

---

## 📄 Licence

Voir le fichier [LICENSE](./LICENSE).