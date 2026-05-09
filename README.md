# 🛡️ SHIELD — Système de Signature Numérique des Communiqués Officiels

> **Projet de Fin d'Études (PFE)** — Application web fullstack de gestion, signature numérique et publication de communiqués officiels, avec authentification forte (2FA TOTP + email), OCR multilingue, et recherche plein-texte intelligente.

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
│   │   │   ├── login.py            # Auth (login, 2FA TOTP, 2FA email)
│   │   │   ├── register.py         # Inscription (agent, admin, citoyen)
│   │   │   ├── keys.py             # Clés RSA (génération, renouvellement)
│   │   │   ├── signatures.py       # Signature / vérification / intégrité
│   │   │   ├── search.py           # Recherche plein-texte + suggestions
│   │   │   └── ocr.py              # Extraction de texte (PDF, DOCX, image)
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
│   ├── backend_.env.example        # Template .env à copier
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
│   │   │       ├── Signatures.tsx  # Gestion des signatures
│   │   │       ├── Keys.tsx        # Gestion des clés RSA
│   │   │       ├── OCR.tsx         # Upload + extraction de texte
│   │   │       ├── Profile.tsx     # Profil utilisateur + 2FA settings
│   │   │       └── Settings.tsx    # Paramètres de l'application
│   │   ├── components/
│   │   │   ├── layout/             # AuthLayout, MainLayout, ProtectedRoute
│   │   │   └── ui/                 # Button, Card, Input, Alert, ThemeToggle
│   │   ├── services/
│   │   │   └── api.ts              # Couche HTTP (fetch wrapper + endpoints)
│   │   ├── types/
│   │   │   └── index.ts            # Types TypeScript centralisés
│   │   └── hooks/
│   │       └── useDarkMode.ts      # Hook dark mode
│   ├── package.json                # Dépendances Node.js
│   ├── vite.config.ts              # Config Vite
│   ├── tailwind.config.js          # Config Tailwind CSS
│   └── .env                        # Variables d'environnement frontend
│
├── Database.sql                    # Schéma PostgreSQL complet + indexation
├── signature_communiques_officiels.backup  # Dump PostgreSQL (pg_dump)
└── docs/                           # Documents académiques du PFE
```

### Flux d'architecture

```
  Navigateur (React SPA)
        │  HTTP/REST JSON
        ▼
  FastAPI (Uvicorn)  ──►  PostgreSQL (schéma: signature_communiques_officiels)
        │
        ├──► Tesseract OCR (extraction texte)
        ├──► Fernet / RSA (chiffrement clés)
        ├──► pyotp / TOTP (2FA Google Auth)
        └──► SMTP (2FA par email)
```

---

## 🗄️ Modèle de Base de Données

Le schéma `signature_communiques_officiels` contient les tables suivantes :

| Table | Description |
|---|---|
| `utilisateur` | Table mère — tous les utilisateurs (héritage UML) |
| `agent_officiel` | Agents habilités à créer et signer des communiqués |
| `administrateur` | Admins système (SUPER_ADMIN / ADMIN_SECURITE / ADMIN_SYSTEME) |
| `citoyen` | Utilisateurs publics (consultation uniquement) |
| `communique` | Documents officiels (cycle : BROUILLON → PUBLIE → ARCHIVE) |
| `archive` | PDF générés et stockés après publication |
| `cle_cryptographique` | Paires RSA 2048 bits des agents (clé privée chiffrée AES-256) |
| `signature` | Signatures numériques RSA-PSS SHA256 des communiqués |
| `consultation_citoyen_communique` | Traçage des consultations (M:N) |
| `logs_securite` | Journal d'audit immuable de toutes les actions |
| `auth_otp` | Codes OTP email à usage unique (2FA) |
| `utilisateur_2fa` | Secrets TOTP Google Authenticator par utilisateur |
| `auth_email_code` | Codes 2FA envoyés par email |

---

## 🔧 Prérequis Système

Assurez-vous d'avoir installé les outils suivants avant de commencer :

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
CREATE USER magistral WITH PASSWORD 'votre_mot_de_passe_ici';
CREATE DATABASE signature_communiques_officiels
    WITH ENCODING='UTF8'
    OWNER=magistral;
GRANT ALL PRIVILEGES ON DATABASE signature_communiques_officiels TO magistral;
\q
```

```bash
# Importer le schéma SQL
psql -U magistral -d signature_communiques_officiels -f Database.sql
```

> **Astuce** : si vous préférez restaurer depuis le backup pg_dump :
> ```bash
> pg_restore -U magistral -d signature_communiques_officiels \
>   --no-owner --role=magistral \
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

# Créer le fichier .env
cp backend_.env.example .env
```

Éditer `.env` avec vos valeurs réelles :

```env
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=signature_communiques_officiels
DB_USER=magistral
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

# Vérifier le fichier .env (déjà présent)
cat .env
# VITE_API_URL=http://localhost:8000/api

# Démarrer le serveur de développement
npm run dev
```

Le frontend est disponible sur : **http://localhost:5173**

---

## 🧪 Tester la Plateforme

### Test rapide via Swagger UI

1. Ouvrir http://localhost:8000/docs
2. Créer un agent officiel :
   - `POST /api/register/agent` avec les champs requis
3. Se connecter :
   - `POST /api/auth/login` → récupérer le `access_token`
4. Cliquer sur **Authorize** en haut, coller le token
5. Générer des clés RSA : `POST /api/keys/generate`

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

# 3. Générer des clés (remplacer TOKEN par le token reçu)
curl -X POST http://localhost:8000/api/keys/generate \
  -H "Authorization: Bearer TOKEN"

# 4. Recherche simple
curl "http://localhost:8000/api/search/simple?q=test"
```

### Test du Frontend (navigateur)

1. Ouvrir http://localhost:5173
2. Vous êtes redirigé sur `/login`
3. Connectez-vous avec un compte créé via Swagger
4. Le dashboard s'ouvre avec accès à : **Recherche**, **Signatures**, **Clés RSA**, **OCR**, **Profil**

---

## 🌐 Endpoints API Principaux

| Méthode | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/login` | Connexion (email + mot de passe) | Non |
| POST | `/api/auth/verify-2fa` | Validation code 2FA | Non |
| POST | `/api/auth/2fa/request-email` | Demander code 2FA par email | Non |
| POST | `/api/auth/2fa/enable` | Activer Google Authenticator | JWT |
| POST | `/api/auth/2fa/disable` | Désactiver 2FA | JWT |
| GET | `/api/auth/me` | Infos utilisateur connecté | JWT |
| POST | `/api/register/agent` | Inscrire un agent officiel | Non |
| POST | `/api/register/admin` | Inscrire un administrateur | Non |
| POST | `/api/register/citoyen` | Inscrire un citoyen | Non |
| POST | `/api/keys/generate` | Générer paire RSA 2048 | JWT (agent) |
| POST | `/api/keys/renew` | Renouveler les clés | JWT (agent) |
| GET | `/api/keys/my-keys` | Lister mes clés | JWT (agent) |
| POST | `/api/signatures/sign` | Signer un communiqué | JWT (agent) |
| POST | `/api/signatures/verify` | Vérifier une signature | JWT |
| GET | `/api/signatures/validate/{id}` | Intégrité complète d'un document | JWT |
| GET | `/api/signatures/my-signatures` | Mes signatures | JWT (agent) |
| GET | `/api/signatures/stats` | Statistiques de signatures | JWT (agent) |
| POST | `/api/ocr/extract` | Extraire texte (PDF/DOCX/image) | Non |
| GET | `/api/search/simple?q=...` | Recherche par mot-clé | Non |
| GET | `/api/search/advanced` | Recherche avancée avec filtres | Non |
| GET | `/api/search/suggestions?q=...` | Autocomplétion | Non |
| GET | `/api/search/popular` | Communiqués populaires | Non |
| GET | `/api/search/recent` | Communiqués récents | Non |

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
| `SMTP_HOST` | Serveur SMTP pour 2FA email | — |
| `SMTP_PORT` | Port SMTP (défaut : 587) | — |
| `SMTP_USER` | Identifiant SMTP | — |
| `SMTP_PASSWORD` | Mot de passe SMTP | — |

### Frontend (`frontend/.env`)

| Variable | Description | Défaut |
|---|---|---|
| `VITE_API_URL` | URL de base de l'API backend | `http://localhost:8000/api` |

---

## 🗂️ Ce qui est Implémenté vs Ce qui Reste

### ✅ Fonctionnalités Terminées

- [x] Authentification JWT (login, logout, token refresh implicite)
- [x] Double authentification (2FA) : Google Authenticator (TOTP) + Email
- [x] Inscription multi-rôles : Agent, Administrateur, Citoyen
- [x] Génération et renouvellement de paires de clés RSA 2048 bits
- [x] Signature numérique RSA-PSS SHA256 des communiqués
- [x] Vérification et validation d'intégrité des signatures
- [x] Extraction OCR (PDF, DOCX, PNG, JPG) — bilingue fr+en
- [x] Recherche plein-texte avec scoring de pertinence (v1/v2/v3)
- [x] Recherche avancée avec filtres (statut, date, auteur)
- [x] Autocomplétion et suggestions de recherche
- [x] Logs de sécurité et audit complet
- [x] Interface frontend avec mode sombre / clair

### 🔄 Fonctionnalités Partiellement Implémentées

- [ ] **CRUD des communiqués** : il n'existe pas encore d'endpoint de création / modification / archivage des communiqués (seule la signature existe)
- [ ] **Gestion des institutions** : le champ `id_institution` est une chaîne libre, sans table de référence
- [ ] **Codes de secours 2FA** : les codes sont générés mais non stockés en base
- [ ] **Tableau de bord admin** : routes admin non créées (CRUD utilisateurs, statistiques globales)
- [ ] **Génération PDF des communiqués signés** : `reportlab` est installé mais non utilisé
- [ ] **QR code sur les communiqués** : le champ `qr_code` existe mais n'est pas auto-rempli à la publication

### ❌ Fonctionnalités Restantes

- [ ] **Panneau d'administration** : gestion des utilisateurs, journaux d'audit, statistiques
- [ ] **Module "Communiqués"** : création, édition, publication, archivage
- [ ] **Gestion du cycle de vie** : workflow BROUILLON → PUBLIE → ARCHIVE avec contrôles de rôle
- [ ] **Stockage de fichiers** : upload et archivage des PDF signés (ex. AWS S3, MinIO ou dossier local)
- [ ] **Notifications** : alertes email lors de publications ou signatures importantes
- [ ] **Tests automatisés** : pytest est installé mais aucun test n'est écrit
- [ ] **CI/CD** : le fichier `.github/workflows/static.yml` ne couvre que le frontend statique
- [ ] **Déploiement Docker** : aucun Dockerfile ou docker-compose présent

---

## ⚠️ Notes de Sécurité pour la Production

1. **JWT_SECRET_KEY** : utiliser une chaîne aléatoire d'au moins 64 caractères
2. **CORS** : remplacer `allow_origins=["*"]` par les origines autorisées
3. **HTTPS** : toujours activer TLS en production (nginx + Let's Encrypt)
4. **BCrypt rounds** : 12 minimum, 14 recommandé en production
5. **echo=True** dans SQLAlchemy : désactiver en production (supprime les logs SQL)
6. **Backup régulier** de la clé `ENCRYPTION_KEY` (perte = perte de toutes les clés RSA)

---

## 👥 Équipe & Contribution

| Rôle | Module(s) |
|---|---|
| Backend Core | Auth, JWT, Database, Config |
| Cryptographie | Clés RSA, Service de signature |
| OCR | Service Tesseract, pdf2image, python-docx |
| 2FA | TOTP, email OTP |
| Frontend | React SPA complète |
| Base de données | Schéma PostgreSQL, indexation |

---

## 📄 Licence

Voir le fichier [LICENSE](./LICENSE).
