# PFE
Signature numerique, Authentification , QRcode, Scan...
# 🚀 Backend API - FastAPI

## 📌 Description

API backend du projet PFE développée avec FastAPI.

---

## ⚙️ Installation

### 1. Cloner le projet

```bash
git clone git@github.com:SOFTWARE-ING/PFE.git
cd backend
```

### 2. Créer un environnement virtuel

```bash
python -m venv venv
source venv/bin/activate
```

### 3. Installer les dépendances

```bash
pip install -r requirements.txt
```

---

## ▶️ Lancer le serveur

```bash
uvicorn app.main:app --reload
ou faire:
cd app
uvicorn main:app --reload
```

---

## 📚 Documentation API

* Swagger : http://127.0.0.1:8000/docs
* ReDoc : http://127.0.0.1:8000/redoc

---

## 📦 Dépendances

* fastapi → framework API
* uvicorn → serveur
* sqlalchemy → ORM
* psycopg2-binary → PostgreSQL
* python-dotenv → variables d'environnement
