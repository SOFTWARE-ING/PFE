# SHIELD Platform — Update Instructions

## Files in this package
- `Database_v2.sql` — New database (replaces old one)
- `documents.py` → `backend/app/routes/documents.py`
- `search_service_fixed.py` → `backend/app/services/search_service.py`

---

## Step 1 — Reset the database

```bash
sudo -u postgres psql
```
```sql
DROP DATABASE IF EXISTS signature_communiques_officiels;
CREATE DATABASE signature_communiques_officiels OWNER shield;
\q
```
```bash
psql -U shield -d signature_communiques_officiels -h localhost -f ~/Downloads/Database_v2.sql
```
Enter your shield password when prompted.

---

## Step 2 — Add 2 columns to models.py

Open `backend/app/models/models.py`, find the `Communique` class and add:

```python
contenu_normalise = Column(Text, nullable=True)
id_auteur = Column(String(36), ForeignKey('utilisateur.id_utilisateur'), nullable=True)
fichier_signe = Column(String(500), nullable=True)
est_archive = Column(Boolean, default=False)
```

Find the `Signature` class and add:
```python
metadata_qr = Column(Text, nullable=True)
```

---

## Step 3 — Copy new files

```bash
cp ~/Downloads/documents.py /path/to/backend/app/routes/documents.py
cp ~/Downloads/search_service_fixed.py /path/to/backend/app/services/search_service.py
```

---

## Step 4 — Register documents router in all_routers.py

Open `backend/all_routers.py` and add:
```python
from app.routes.documents import router as documents_router
router.include_router(documents_router)
```

---

## Step 5 — Install PyPDF2 if not installed

```bash
pip install PyPDF2 --break-system-packages
```
---

## Step 6 — Restart uvicorn

```bash
uvicorn app.main:app --reload --port 8000
```

---

## Test Users

### 1. Register Agent
```
POST /api/register/agent
{
  "nom": "Djemeli", 
  "prenom": "Josias",
  "email": "djemelitsapijosias@gmail.com",
  "mot_de_passe": "Agent@2026!",
  "confirmer_mot_de_passe": "Agent@2026!",
  "id_institution": "MINFOPRA-001",
  "fonction": "Chef de Service",
  "departement": "Direction Generale",
  "matricule": "MAT-2026-002"
}
```

### 2. Register Citoyen
```
POST /api/register/citoyen
{
  "nom": "Mr", 
  "prenom": "Jemel",
  "email": "jemeldev@gmail.com",
  "mot_de_passe": "Jemel@2026!",
  "confirmer_mot_de_passe": "Jemel@2026!"
}
```

### 3. Register Admin
```
POST /api/register/admin
{
  "nom": "Shield", "prenom": "Systeme",
  "email": "signaturenumerique.shield@gmail.com",
  "mot_de_passe": "Shield@2026!",
  "confirmer_mot_de_passe": "Shield@2026!",
  "niveau_habilitation": "SUPER_ADMIN"
}
```

---

## Complete Testing Flow (Agent)

1. Login as agent → get `access_token`
2. `POST /api/keys/generate` → generate RSA keys
3. `POST /api/documents/upload` → upload PDF file with `titre`
4. `POST /api/documents/sign` → sign with `communique_id` → get `qr_code` + `signature_id`
5. `POST /api/documents/finalize` → upload PDF + `communique_id` + `signature_id` + `qr_x`, `qr_y`, `qr_size`
6. `POST /api/documents/archive` → archive with `communique_id`
7. `GET /api/documents/my` → see all your documents

## Verification Flow (Citizen)

1. Scan QR code from printed document → get JSON string
2. `POST /api/documents/verify` → upload photo of document + paste QR JSON
3. Response: `verified: true/false` + agent info + content match

## Search Flow (Citizen)

After archiving, documents appear in:
- `GET /api/search/simple?q=bafoussam`
- `GET /api/search/simple?q=ministere`
