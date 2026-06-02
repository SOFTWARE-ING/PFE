# 🛡️ SHIELD — Système de Signature Numérique des Communiqués Officiels

> **Projet de Fin d'Études (PFE)** — Application web fullstack de gestion, signature numérique et publication de communiqués officiels, avec authentification forte (2FA TOTP + email), OCR multilingue, recherche plein-texte intelligente, panneau d'administration complet, et vérification publique automatique de documents signés.

---

## 📐 Architecture du Projet

```
PFE/
├── backend/                             # API REST — FastAPI / Python 3.10+
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py               # Variables d'environnement (Pydantic Settings)
│   │   │   ├── database.py             # Engine SQLAlchemy + session PostgreSQL
│   │   │   ├── auth.py                 # Hash / vérification bcrypt
│   │   │   └── jwt_utils.py            # JWT + contrôle token_autorise (v3)
│   │   ├── models/
│   │   │   └── models.py               # ORM SQLAlchemy v3 (toutes les tables)
│   │   ├── schemas/
│   │   │   └── schemas.py              # Schémas Pydantic v2
│   │   ├── routes/
│   │   │   ├── login.py                # Auth (login, 2FA TOTP, 2FA email, /me)
│   │   │   ├── register.py             # Inscription (agent, admin, citoyen)
│   │   │   ├── keys.py                 # Clés RSA (génération, renouvellement)
│   │   │   ├── signatures.py           # Signature / vérification / intégrité
│   │   │   ├── documents.py            # Workflow : upload → sign → finalize → archive
│   │   │   ├── search.py               # Recherche plein-texte + suggestions
│   │   │   ├── ocr.py                  # Extraction de texte (PDF, DOCX, image)
│   │   │   ├── admin.py                # Panneau administrateur complet
│   │   │   ├── password_reset.py       # Réinitialisation MDP par email
│   │   │   └── verify.py               # Vérification publique (3 niveaux, upload unique)
│   │   └── services/
│   │       ├── auth_service.py         # Authentification + 2FA complet
│   │       ├── key_service.py          # Génération/chiffrement clés RSA (Fernet)
│   │       ├── signature_service.py    # Signature RSA-PSS SHA256 + vérification
│   │       ├── search_service.py       # Algorithmes de scoring de pertinence
│   │       ├── ocr_service.py          # Tesseract (fr+en) + pdf2image + python-docx
│   │       ├── totp_service.py         # TOTP / Google Authenticator (pyotp)
│   │       ├── email_service.py        # SMTP avec double fallback SMTP_*/MAIL_*
│   │       ├── qrcode_gen.py           # Génération QR codes
│   │       ├── admin_service.py        # Gestion utilisateurs, logs, stats admin
│   │       ├── password_reset_service.py # Tokens reset MDP + envoi email
│   │       └── qr_scanner_service.py   # Détection auto QR + masquage zone OCR
│   ├── all_routers.py                  # Agrégateur de tous les routeurs
│   ├── requirements.txt                # Dépendances Python (production)
│   ├── requirements-dev.txt            # Dépendances dev (tests, linters)
│   └── script_bd.sql                   # Script SQL alternatif
│
├── frontend/                            # SPA — React 18 + TypeScript + Tailwind CSS
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       ├── context/
│       │   └── AuthContext.tsx          # Contexte global auth (token + user)
│       ├── routes/
│       │   └── AppRouter.tsx            # Routing React Router v6
│       ├── pages/
│       │   ├── auth/
│       │   │   ├── Login.tsx            # Connexion + liens forgot-password + verify
│       │   │   ├── OTP.tsx              # Saisie code 2FA (TOTP ou email)
│       │   │   ├── ForgotPassword.tsx   # Demande de réinitialisation MDP
│       │   │   └── ResetPassword.tsx    # Nouveau MDP via lien email
│       │   └── dashboard/
│       │       ├── Search.tsx           # Recherche de communiqués publiés
│       │       ├── Sign.tsx             # Workflow de signature pas-à-pas
│       │       ├── MyDocuments.tsx      # Mes documents signés
│       │       ├── Signatures.tsx       # Historique des signatures
│       │       ├── Keys.tsx             # Gestion des clés RSA
│       │       ├── OCR.tsx              # Upload + extraction de texte
│       │       ├── Profile.tsx          # Profil + 2FA settings
│       │       ├── Settings.tsx         # Paramètres de l'application
│       │       ├── VerifyDocument.tsx   # Vérification publique (upload unique, 3 niveaux)
│       │       └── Admin/
│       │           ├── AdminDashboard.tsx  # Tableau de bord statistiques
│       │           ├── AdminUsers.tsx      # Table utilisateurs + toggles + création
│       │           ├── AdminLogs.tsx       # Logs d'audit centralisés
│       │           └── AdminSessions.tsx   # Sessions actives
│       ├── components/
│       │   ├── layout/
│       │   │   ├── MainLayout.tsx       # Sidebar (section admin en violet)
│       │   │   └── AuthLayout.tsx
│       │   └── ui/                      # Button, Card, Input, Alert, ThemeToggle
│       ├── services/
│       │   └── api.ts                   # Couche HTTP complète v3
│       ├── types/
│       │   └── index.ts                 # Types TypeScript centralisés v3
│       └── hooks/
│           └── useDarkMode.ts
│
├── Database_v3.sql                      # Schéma PostgreSQL complet v3 (actuel)
├── Database_v2.sql                      # Schéma PostgreSQL v2 (référence)
├── Database.sql                         # Schéma PostgreSQL v1 (référence)
├── signature_communiques_officiels.backup  # Dump PostgreSQL (pg_dump)
└── docs/
    ├── Cahier_De_Charge.pdf
    └── Note_de_Proposition_de_Projet_de_Fin_d_Etudes.pdf
```

### Flux d'architecture global

```
  Navigateur / App Mobile (React SPA)
        │  HTTP/REST JSON
        ▼
  FastAPI (Uvicorn) ──► PostgreSQL (signature_communiques_officiels)
        │
        ├──► Tesseract OCR        (extraction texte PDF/image)
        ├──► pyzbar               (détection + décodage QR automatique)
        ├──► Pillow               (masquage zone QR avant OCR)
        ├──► Fernet / RSA-PSS     (chiffrement clés + signature)
        ├──► pyotp / TOTP         (2FA Google Authenticator)
        ├──► SMTP                 (2FA email + reset MDP + notifications)
        └──► reportlab + PyPDF2   (génération et manipulation PDF)
```

---

## 🔐 Hiérarchie des Rôles et Permissions

```
SUPER_ADMIN
  ├── Crée les comptes ADMIN_SYSTEME et ADMIN_SECURITE
  ├── A tous les droits d'un ADMIN_SYSTEME
  ├── Protégé : ne peut pas être bloqué ni avoir son 2FA modifié par un autre admin
  └── Accès complet aux logs d'audit

ADMIN_SYSTEME
  ├── Crée les comptes AgentOfficiel (token désactivé + 2FA auto)
  ├── Toggle token_autorise (bloquer/autoriser accès) — sauf SUPER_ADMIN
  ├── Toggle 2FA (activer/désactiver) — sauf SUPER_ADMIN
  ├── Réinitialise les mots de passe
  └── Consulte tous les logs d'audit

ADMIN_SECURITE
  ├── Consulte les logs d'audit
  └── Vérifie les signatures et l'intégrité des documents

AgentOfficiel
  ├── Upload, signe, finalise et archive des communiqués
  ├── Gère ses propres clés RSA
  └── Consulte ses propres statistiques de signature

Citoyen (public — sans connexion)
  ├── Consulte les communiqués publiés
  ├── Effectue des recherches
  └── Vérifie l'authenticité d'un document (upload unique, détection QR auto)
```

### Règles de création de comptes

| Créateur | Peut créer |
|---|---|
| SUPER_ADMIN | SUPER_ADMIN, ADMIN_SYSTEME, ADMIN_SECURITE |
| ADMIN_SYSTEME | AgentOfficiel |
| Public | Citoyen (auto-inscription) |

> **Comportement automatique à la création d'un agent par un admin :**
> - `token_autorise = FALSE` — l'agent ne peut pas se connecter avant autorisation explicite
> - 2FA activé automatiquement avec `force_enabled = TRUE`
> - Mot de passe temporaire + secret TOTP envoyés par email à l'agent
> - L'admin est redirigé vers la table des utilisateurs après la création

---

## ⚙️ Fonctionnement Interne — Signature et Vérification

### Flux de signature (côté agent)

```
① Agent uploade le document (PDF/DOCX/image)
        ↓
② OCR → extraction du texte brut → stocké dans communique.contenu
   SHA256(texte_brut) → communique.hash_contenu
        ↓
③ Agent signe → signature_service.py :
   document_hash = SHA256(communique.contenu.encode('utf-8'))
   signature_RSA = RSA_PSS_Sign(document_hash, clé_privée_agent)
   → stocké dans signature.valeur_signature (base64)
        ↓
④ QR code généré avec les métadonnées :
   {
     "sig_id": "uuid",
     "com_id": "uuid",
     "agent_id": "uuid",
     "key_fp": "SHA256[:16] de la clé publique",
     "encrypted_hash": "signature RSA-PSS en base64",
     "algo": "RSA-PSS-SHA256",
     "ts": "horodatage"
   }
        ↓
⑤ QR intégré dans le PDF aux coordonnées choisies par l'agent
        ↓
⑥ Document archivé → visible en recherche publique
```

### Flux de vérification (côté citoyen — 3 niveaux)

```
Citoyen uploade le document imprimé/scanné
        ↓
ÉTAPE 0 — Détection automatique du QR (pyzbar)
  → Contenu JSON décodé
  → Coordonnées (x, y, w, h) du QR dans l'image
        ↓
NIVEAU 1 — Vérification cryptographique RSA-PSS
  Clé publique trouvée via key_fp
  RSA_PSS_verify(encrypted_hash, SHA256(contenu_original), clé_pub)
  ✅ Valide → continuer   |   ❌ Invalide → FALSIFIÉ (arrêt)
        ↓
NIVEAU 2 — Comparaison hash (OCR sans zone QR)
  OCR du document (zone QR masquée en blanc)
  SHA256(texte_extrait) == SHA256(contenu_original) ?
  ✅ Identique → AUTHENTIQUE COMPLET (100%)
  ⚠️ Différent → continuer niveau 3
        ↓
NIVEAU 3 — Diff textuel fin (si niveau 2 échoue)
  difflib char par char : texte_scan vs contenu_base
  → Similarité en %
  → Liste des anomalies : position exacte, type, contexte (25 chars)
  ≥ 98% → AUTHENTIQUE (scan dégradé)
  90-97% → SUSPECT
  < 90%  → ALTÉRÉ
```

---

## 🔧 Prérequis Système

| Outil | Version minimale | Vérification |
|---|---|---|
| Python | 3.10+ | `python3 --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| PostgreSQL | 14+ | `psql --version` |
| Tesseract OCR | 5+ | `tesseract --version` |
| Poppler | — | `pdfinfo --version` |
| libzbar0 | — | `dpkg -l libzbar0` |
| Git | — | `git --version` |

---

## 🚀 Installation Complète depuis Zéro

### 1. Cloner le dépôt

```bash
git clone https://github.com/<votre-organisation>/shield-pfe.git
cd shield-pfe
```

### 2. Installer les dépendances système

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install -y \
  postgresql postgresql-contrib \
  tesseract-ocr tesseract-ocr-fra tesseract-ocr-eng \
  poppler-utils \
  libzbar0 \
  python3-pip python3-venv \
  build-essential libpq-dev

# macOS (Homebrew)
brew install postgresql tesseract poppler zbar
brew install tesseract-lang

# Windows
# PostgreSQL : https://www.postgresql.org/download/windows/
# Tesseract  : https://github.com/UB-Mannheim/tesseract/wiki
# Poppler    : https://github.com/oschwartz10612/poppler-windows/releases
# ZBar       : https://sourceforge.net/projects/zbar/
# → Ajouter tous les bin/ au PATH système
```

### 3. Configurer PostgreSQL

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo -u postgres psql
```

```sql
CREATE USER shield WITH PASSWORD 'securepassword';
CREATE DATABASE signature_communiques_officiels
    WITH ENCODING='UTF8' OWNER=shield;
GRANT ALL PRIVILEGES ON DATABASE signature_communiques_officiels TO shield;
\q
```

```bash
# Importer le schéma v3 (le plus récent)
psql -U shield -d signature_communiques_officiels -f Database_v3.sql

# OU restaurer depuis le backup existant
pg_restore -U shield -d signature_communiques_officiels \
  --no-owner --role=shield \
  signature_communiques_officiels.backup
```

> ⚠️ Le fichier signature_communiques_officiels.backup pour importer n'est plus du tout ajour donc viellez ne pas
> limporter actuellement(pour le moments)

### 4. Configurer le backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate       # Linux/macOS
# .venv\Scripts\activate        # Windows

pip install -r requirements.txt
cp configuration_du_fichier_env.txt .env
```

Éditez `.env` :

```env
# ── Base de données ──────────────────────────────────────────
DB_HOST=localhost
DB_PORT=5432
DB_NAME=signature_communiques_officiels
DB_USER=shield
DB_PASSWORD=securepassword

# ── JWT — CHANGEZ CETTE CLÉ EN PRODUCTION ───────────────────
JWT_SECRET_KEY=votre_cle_aleatoire_minimum_64_caracteres
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=60

# ── Sécurité ─────────────────────────────────────────────────
BCRYPT_ROUNDS=12
# Générer : python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=votre_cle_fernet_generee

# ── 2FA ──────────────────────────────────────────────────────
OTP_EXPIRE_SECONDS=300
OTP_LENGTH=6

# ── Email SMTP (laisser vide pour mode dev console) ──────────
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre@gmail.com
SMTP_PASSWORD=votre_mot_de_passe_application
FROM_EMAIL=shield@votre-domaine.com

# ── Frontend ─────────────────────────────────────────────────
FRONTEND_URL=http://localhost:5173
PASSWORD_RESET_EXPIRE_MINUTES=30
```

> **Mode développement email :** si `SMTP_USER` est vide, les codes OTP et liens de reset
> s'affichent directement dans le terminal backend avec `🔑 CODE OTP : 847291`.
> Pas besoin de configurer un serveur SMTP pour tester.

### 5. Démarrer le backend

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Interfaces disponibles :
- **Swagger UI** → http://localhost:8000/docs
- **ReDoc** → http://localhost:8000/redoc

### 6. Configurer et démarrer le frontend

```bash
cd frontend
npm install
```

Vérifiez `frontend/.env` :
```env
VITE_API_URL=http://localhost:8000/api
```

```bash
npm run dev
```

Application disponible sur : **http://localhost:5173**

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
| POST | `/api/auth/forgot-password` | Demande de réinitialisation MDP | Non |
| POST | `/api/auth/reset-password` | Nouveau MDP via token email | Non |

### Inscription

| Méthode | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/register/agent` | Inscrire un agent (à restreindre en prod) | Non |
| POST | `/api/register/admin` | Inscrire un admin (à restreindre en prod) | Non |
| POST | `/api/register/citoyen` | Inscrire un citoyen | Non |

### Clés RSA

| Méthode | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/keys/generate` | Générer paire RSA 2048 bits | JWT (agent) |
| POST | `/api/keys/renew` | Renouveler les clés | JWT (agent) |
| GET | `/api/keys/my-keys` | Lister mes clés | JWT (agent) |

### Documents

| Méthode | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/documents/upload` | Upload + OCR + création brouillon | JWT (agent) |
| POST | `/api/documents/sign` | Signer + générer QR code | JWT (agent) |
| POST | `/api/documents/finalize` | Intégrer QR dans le PDF | JWT (agent) |
| POST | `/api/documents/archive` | Archiver → PUBLIE | JWT (agent) |
| GET | `/api/documents/my` | Lister mes documents | JWT (agent) |
| GET | `/api/documents/{id}/download` | Télécharger le PDF signé | Public |
| DELETE | `/api/documents/{id}` | Supprimer un document | JWT (agent) |
| PATCH | `/api/documents/{id}/unarchive` | Désarchiver | JWT (agent) |

### Vérification publique

| Méthode | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/verify/document` | **Upload unique — QR détecté auto — 3 niveaux** | **Non** |

### Signatures

| Méthode | Route | Description | Auth |
|---|---|---|---|
| POST | `/api/signatures/sign` | Signer un communiqué | JWT (agent) |
| POST | `/api/signatures/verify` | Vérifier une signature par ID | JWT |
| GET | `/api/signatures/validate/{id}` | Intégrité complète | JWT |
| GET | `/api/signatures/my-signatures` | Mes signatures (paginé) | JWT (agent) |
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
| POST | `/api/ocr/extract` | Extraire texte (PDF/DOCX/PNG/JPG) | Non |

### Administration

| Méthode | Route | Description | Auth |
|---|---|---|---|
| GET | `/api/admin/users` | Lister tous les utilisateurs | JWT (admin) |
| GET | `/api/admin/users/active-sessions` | Sessions actives | JWT (admin) |
| POST | `/api/admin/users/agent` | Créer un AgentOfficiel | JWT (ADMIN_SYSTEME+) |
| POST | `/api/admin/users/admin` | Créer un Administrateur | JWT (SUPER_ADMIN) |
| PATCH | `/api/admin/users/{id}/toggle-access` | Bloquer/autoriser le token | JWT (ADMIN_SYSTEME+) |
| PATCH | `/api/admin/users/{id}/toggle-2fa` | Activer/désactiver le 2FA | JWT (ADMIN_SYSTEME+) |
| POST | `/api/admin/users/{id}/reset-password` | Reset MDP | JWT (ADMIN_SYSTEME+) |
| GET | `/api/admin/logs` | Logs d'audit centralisés | JWT (admin) |
| GET | `/api/admin/stats` | Statistiques globales | JWT (admin) |

---

## 🧪 Guide de test complet

### Test rapide via Swagger UI

1. Ouvrir http://localhost:8000/docs
2. `POST /api/register/agent` → créer un agent
3. `POST /api/auth/login` → récupérer le `access_token`
4. Cliquer **Authorize** → coller le token
5. `POST /api/keys/generate` → générer les clés RSA
6. `POST /api/documents/upload` → uploader un PDF
7. `POST /api/documents/sign` → signer → récupérer le QR
8. `POST /api/documents/finalize` → intégrer le QR dans le PDF
9. `POST /api/documents/archive` → archiver
10. `POST /api/verify/document` → uploader le document signé → vérification auto

### Test de vérification publique (citoyen)

```bash
# Upload unique — le backend détecte le QR automatiquement
curl -X POST http://localhost:8000/api/verify/document \
  -F "file=@document_signe.pdf"
```

Réponse JSON attendue :
```json
{
  "document_info": {
    "titre": "Communiqué N°01/2026",
    "signe_par": "Jean Dupont",
    "institution": "MINCOM",
    "qr_detecte": true
  },
  "niveau1": { "valide": true, "detail": "✅ Signature cryptographique authentique." },
  "niveau2": { "valide": true, "similarite_hash": 100.0 },
  "niveau3": { "execute": false },
  "verdict": {
    "code": "AUTHENTIQUE_COMPLET",
    "label": "✅ Document authentique et intègre",
    "confiance": 100
  }
}
```

### Test du workflow complet via curl

```bash
# 1. Créer un agent
curl -X POST http://localhost:8000/api/register/agent \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Dupont", "prenom": "Jean",
    "email": "jean.dupont@gouv.cm",
    "mot_de_passe": "MonMDP@2026",
    "confirmer_mot_de_passe": "MonMDP@2026",
    "id_institution": "MINCOM",
    "fonction": "Directeur", "matricule": "MAT-001"
  }'

# 2. Se connecter
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "jean.dupont@gouv.cm", "mot_de_passe": "MonMDP@2026"}'

# 3. Générer les clés RSA (remplacer TOKEN)
curl -X POST http://localhost:8000/api/keys/generate \
  -H "Authorization: Bearer TOKEN"

# 4. Uploader un document
curl -X POST http://localhost:8000/api/documents/upload \
  -H "Authorization: Bearer TOKEN" \
  -F "file=@mon_document.pdf" \
  -F "titre=Communiqué N°01/2026"

# 5. Recherche publique
curl "http://localhost:8000/api/search/simple?q=communique"
```

### Tester l'envoi d'email en développement

Avec `SMTP_USER` vide dans `.env`, regardez le terminal backend :
```
============================================================
📧  EMAIL (mode dev) — À : agent@gouv.cm
    Sujet : SHIELD — Code de Vérification
    🔑  CODE OTP : 847291
============================================================
```

---

## 📋 Fonctionnalités — État d'Avancement

### ✅ Fonctionnalités Terminées

- [x] Authentification JWT avec contrôle `token_autorise` à chaque requête
- [x] Double authentification (2FA) : Google Authenticator (TOTP) + Email OTP
- [x] Réinitialisation du mot de passe par email (tous les rôles)
- [x] Inscription multi-rôles : Agent, Administrateur, Citoyen
- [x] Génération et renouvellement de paires de clés RSA 2048 bits
- [x] Workflow complet de signature : upload → OCR → sign → QR → finalize → archive
- [x] Signature numérique RSA-PSS SHA256 des communiqués
- [x] Intégration du QR code dans le PDF aux coordonnées définies par l'agent
- [x] Vérification publique automatique : upload unique, QR détecté par pyzbar, OCR sans zone QR
- [x] Vérification en 3 niveaux : crypto RSA-PSS → hash OCR → diff textuel fin avec localisation
- [x] Extraction OCR bilingue fr+en (PDF, DOCX, PNG, JPG)
- [x] Recherche plein-texte avec scoring de pertinence + autocomplétion
- [x] Panneau d'administration complet :
  - [x] Tableau de bord avec statistiques globales
  - [x] Création de comptes AgentOfficiel (token désactivé + 2FA auto)
  - [x] Création de comptes Administrateur (SUPER_ADMIN uniquement)
  - [x] Table utilisateurs avec recherche, filtres, pagination
  - [x] Toggle token_autorise par utilisateur (sauf SUPER_ADMIN)
  - [x] Toggle 2FA par utilisateur (sauf SUPER_ADMIN)
  - [x] Reset MDP depuis le panneau admin
  - [x] Visualisation des sessions actives
  - [x] Logs d'audit centralisés consultables par tous les admins
- [x] Emails automatiques : OTP, reset MDP, création de compte, reset 2FA
- [x] Interface frontend complète avec mode sombre / clair
- [x] Sidebar avec section Administration en violet (visible aux admins uniquement)

### 🔄 Fonctionnalités à Développer (Phase 3)

- [ ] **Application mobile** (React Native ou Flutter)
  - Scanner le QR code avec l'appareil photo du téléphone
  - Vérifier un document en déplacement
  - Recevoir les notifications push (signature, publication)
- [ ] **Restriction des routes d'inscription** en production (agents/admins via panneau admin uniquement)
- [ ] **Middleware token_autorise** : vérification systématique à chaque requête protégée
- [ ] **Persistance des codes de secours 2FA** en base de données
- [ ] **Notifications email** : alertes lors de publications ou signatures importantes

### ❌ Fonctionnalités Non Commencées

- [ ] **Tests automatisés** : pytest (unitaires + intégration)
- [ ] **CI/CD** : pipeline GitHub Actions complet
- [ ] **Déploiement Docker** : Dockerfile + docker-compose (backend + frontend + postgres + tesseract + zbar)
- [ ] **Application mobile** SHIELD (iOS + Android)

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
| python-jose | 3.x | JWT |
| bcrypt | 5.x | Hachage des mots de passe |
| cryptography | 46.x | RSA-PSS, Fernet (AES-256) |
| pyotp | 2.9.x | TOTP (Google Authenticator) |
| qrcode | 8.x | Génération QR codes |
| pyzbar | 0.1.9+ | Détection + décodage QR automatique |
| pytesseract | 0.3.x | OCR via Tesseract |
| pdf2image | 1.17.x | Conversion PDF → image |
| python-docx | 1.2.x | Lecture DOCX |
| pillow | 10.x | Traitement images + masquage zone QR |
| reportlab | 4.4.x | Génération et manipulation PDF |
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
| `JWT_SECRET_KEY` | Clé secrète JWT (min. 64 chars en prod) | ✅ |
| `JWT_ALGORITHM` | Algorithme JWT (défaut : HS256) | — |
| `JWT_EXPIRE_MINUTES` | Durée validité token (défaut : 60) | — |
| `BCRYPT_ROUNDS` | Rounds bcrypt (défaut : 12) | — |
| `ENCRYPTION_KEY` | Clé Fernet pour chiffrer les clés RSA | ✅ |
| `OTP_EXPIRE_SECONDS` | Durée validité OTP email (défaut : 300) | — |
| `SMTP_HOST` | Serveur SMTP | — |
| `SMTP_PORT` | Port SMTP (défaut : 587) | — |
| `SMTP_USER` | Identifiant SMTP (vide = mode dev console) | — |
| `SMTP_PASSWORD` | Mot de passe SMTP | — |
| `FROM_EMAIL` | Adresse d'expédition | — |
| `FRONTEND_URL` | URL frontend (pour liens email) | — |
| `PASSWORD_RESET_EXPIRE_MINUTES` | Durée lien reset MDP (défaut : 30) | — |

### Frontend (`frontend/.env`)

| Variable | Description | Défaut |
|---|---|---|
| `VITE_API_URL` | URL de base de l'API backend | `http://localhost:8000/api` |

---

## ⚠️ Notes de Sécurité pour la Production

1. **JWT_SECRET_KEY** : chaîne aléatoire d'au moins 64 caractères
2. **ENCRYPTION_KEY** : sauvegarder impérativement — perte = perte irréversible de toutes les clés RSA
3. **CORS** : remplacer les origines `localhost` par les domaines de production
4. **HTTPS** : activer TLS en production (nginx + Let's Encrypt)
5. **BCrypt rounds** : 12 minimum, 14 recommandé en production
6. **echo=True** dans SQLAlchemy : désactiver en production
7. **Endpoints `/register/agent` et `/register/admin`** : restreindre aux admins en production
8. **token_autorise** : le middleware doit rejeter toute requête des utilisateurs bloqués

---

## 👥 Modules par Fonctionnalité

| Module | Fichiers concernés |
|---|---|
| Auth + 2FA | `routes/login.py`, `services/auth_service.py`, `services/totp_service.py`, `services/email_service.py` |
| Reset MDP | `routes/password_reset.py`, `services/password_reset_service.py` |
| Cryptographie | `services/key_service.py`, `services/signature_service.py`, `services/qrcode_gen.py` |
| Documents | `routes/documents.py`, `services/ocr_service.py` |
| Vérification | `routes/verify.py`, `services/qr_scanner_service.py` |
| Recherche | `routes/search.py`, `services/search_service.py` |
| Administration | `routes/admin.py`, `services/admin_service.py` |
| Base de données | `models/models.py`, `Database_v3.sql` |
| Frontend | `src/pages/`, `src/services/api.ts`, `src/context/AuthContext.tsx` |

---

## 🗺️ Feuille de Route — Phase 3

### Priorité haute
1. Middleware token_autorise systématique sur toutes les routes protégées
2. Restriction des endpoints `/register/agent` et `/register/admin` en production
3. Application mobile (React Native) — scanner QR + vérification en déplacement

### Priorité moyenne
4. Persistance des codes de secours 2FA en base
5. Notifications email automatiques (publication, signature)
6. Docker : Dockerfile + docker-compose complet

### Priorité basse
7. Tests automatisés pytest (unitaires + intégration)
8. CI/CD pipeline GitHub Actions
9. Application mobile iOS + Android (Flutter)

---

## 📄 Licence

Voir le fichier [LICENSE](./LICENSE).