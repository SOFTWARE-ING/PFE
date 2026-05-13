# 🐛 SHIELD — Analyse des Erreurs et Corrections

> Analyse complète du code source (backend FastAPI + frontend React + base de données).
> Chaque bug est documenté avec sa localisation, la cause, et le correctif complet.

---

## BACKEND — Bugs et Corrections

---

### BUG #1 — Import dupliqué dans `keys.py`

**Fichier** : `backend/app/routes/keys.py`  
**Ligne** : 10 et 14  
**Type** : Avertissement / code mort

**Problème :**
```python
from app.core.jwt_utils import get_current_user   # ligne 10
...
from app.core.jwt_utils import get_current_user   # ligne 14 — DOUBLON
```

**Correction :**
```python
# Supprimer simplement le deuxième import (ligne 14)
# Garder uniquement :
from app.core.jwt_utils import get_current_user
```

---

### BUG #2 — Import dupliqué dans `all_routers.py`

**Fichier** : `backend/all_routers.py`  
**Type** : Routes enregistrées deux fois → doublons dans les logs, comportement imprévisible

**Problème :**
```python
from app.routes import login, register, search, signatures
from app.routes.login import router as login_router
from app.routes.register import router as register_router

router.include_router(login.router)      # première fois
router.include_router(register.router)   # première fois
...
router.include_router(login_router)      # DOUBLON
router.include_router(register_router)   # DOUBLON
```
Les routeurs `login` et `register` sont inclus deux fois : une fois via `login.router` et une fois via `login_router` (qui pointe sur le même objet). FastAPI les enregistre bien deux fois, doublant toutes les routes `/auth/*` et `/register/*`.

**Correction — fichier `all_routers.py` complet :**
```python
from fastapi import APIRouter

from app.routes.ocr import router as ocr_router
from app.routes.login import router as login_router
from app.routes.register import router as register_router
from app.routes.search import router as search_router
from app.routes.signatures import router as signatures_router
from app.routes.keys import router as keys_router

router = APIRouter()

router.include_router(ocr_router)
router.include_router(login_router)
router.include_router(register_router)
router.include_router(search_router)
router.include_router(signatures_router)
router.include_router(keys_router)
```

---

### BUG #3 — `LoginResponse` manque le champ `requires_2fa`

**Fichier** : `backend/app/schemas/schemas.py`  
**Type** : Erreur de validation Pydantic à l'exécution

**Problème :**  
`LoginResponse` dans `schemas.py` définit `requires_otp` (ancien nom) mais le code dans `login.py` peuple `requires_2fa`. Pydantic v2 rejettera silencieusement le champ ou renverra une valeur par défaut incorrecte.

```python
# Dans schemas.py — LoginResponse actuel (INCORRECT)
class LoginResponse(_OrmBase):
    success: bool
    message: str
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    id_utilisateur: Optional[str] = None
    requires_otp: bool = False   # ← mauvais nom de champ !
```

```python
# Dans login.py — ce qui est utilisé
return LoginResponse(
    ...
    requires_2fa=requires_2fa   # ← ce champ n'existe pas dans LoginResponse !
)
```

**Correction dans `schemas.py` :**
```python
class LoginResponse(_OrmBase):
    success: bool
    message: str
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    id_utilisateur: Optional[str] = None
    requires_2fa: bool = False   # ← renommer requires_otp en requires_2fa
```

---

### BUG #4 — `OtpVerifyRequest` et `OtpVerifyResponse` définis deux fois

**Fichier** : `backend/app/schemas/schemas.py`  
**Type** : `TypeError` à l'import du module

**Problème :**  
`OtpVerifyRequest` et `OtpVerifyResponse` sont définis une première fois vers la ligne 280, puis redéfinis à la fin du fichier avec des champs différents. En Python, la deuxième définition écrase la première, mais les docstrings et les types diffèrent, rendant le code ambigu.

**Correction :**  
Supprimer la première définition (ancienne) et garder uniquement les versions récentes à la fin du fichier :

```python
# SUPPRIMER les définitions originales lignes ~275-295 :
# class OtpVerifyRequest(_OrmBase):
#     id_utilisateur: str
#     code_otp: str = Field(...)
#
# class OtpVerifyResponse(_OrmBase):
#     success: bool
#     ...

# GARDER uniquement les versions en bas du fichier (plus récentes et cohérentes) :
class OtpVerifyRequest(_OrmBase):
    """Requête de vérification 2FA."""
    temp_token: str = Field(..., description="Token temporaire reçu au login")
    code_2fa: str = Field(..., min_length=6, max_length=6)

class OtpVerifyResponse(_OrmBase):
    """Réponse après vérification 2FA."""
    success: bool
    message: str
    access_token: Optional[str] = None
    token_type: Optional[str] = "bearer"
    expires_in: Optional[int] = None
```

---

### BUG #5 — `CleCryptographiqueResponse` manque `est_expiree` calculée

**Fichier** : `backend/app/schemas/schemas.py` + `backend/app/routes/keys.py`  
**Type** : Champ `est_expiree` toujours `None` en réponse API

**Problème :**  
`CleCryptographiqueResponse` expose `est_expiree` mais ce champ n'est jamais calculé : les objets SQLAlchemy `CleCryptographique` n'ont pas cet attribut, donc Pydantic le laisse à `None`.

**Correction — ajouter un validateur dans `schemas.py` :**
```python
from datetime import datetime, timezone

class CleCryptographiqueResponse(_OrmBase):
    id_cle: str
    id_agent_officiel: str
    cle_publique: str
    date_creation: datetime
    date_expiration: datetime
    est_expiree: Optional[bool] = None

    @model_validator(mode="after")
    def compute_est_expiree(self) -> "CleCryptographiqueResponse":
        if self.date_expiration:
            self.est_expiree = self.date_expiration < datetime.now(timezone.utc).replace(tzinfo=None)
        return self
```

---

### BUG #6 — Timezone mismatch dans `signature_service.py`

**Fichier** : `backend/app/services/signature_service.py`  
**Type** : `TypeError: can't compare offset-naive and offset-aware datetimes`

**Problème :**  
```python
# Dans sign_communique()
if cle.date_expiration.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
```
`cle.date_expiration` vient de PostgreSQL via SQLAlchemy sans timezone (`TIMESTAMP` sans `timezone=True`). `.replace(tzinfo=...)` est utilisé au lieu de `.astimezone(...)`, ce qui peut causer des comparaisons incorrectes.

**Correction :**
```python
from datetime import datetime

# Comparer les deux datetime en mode naïf (cohérent avec la BD)
if cle.date_expiration < datetime.utcnow():
    return SignatureResult(
        False,
        f"Clé expirée depuis le {cle.date_expiration.strftime('%d/%m/%Y')}. Renouvelez-la."
    )
```

Aussi dans `_get_active_key()` :
```python
def _get_active_key(self, agent_id: str) -> Optional[CleCryptographique]:
    now = datetime.utcnow()   # ← utiliser utcnow() cohérent avec la BD
    
    cle = (
        self.db.query(CleCryptographique)
        .filter(
            CleCryptographique.id_agent_officiel == agent_id,
            CleCryptographique.date_expiration > now
        )
        .order_by(CleCryptographique.date_creation.desc())
        .first()
    )
    return cle
```

---

### BUG #7 — `ENCRYPTION_KEY` chargée deux fois de manière incohérente

**Fichier** : `backend/app/core/config.py`  
**Type** : Risque de `None` au démarrage si `.env` manquant

**Problème :**
```python
# Ligne 17 — chargé directement avec os.getenv (peut être None !)
ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY")

# Ligne 60+ — chargé via Pydantic Settings (correct, valide obligatoire)
class Settings(BaseSettings):
    ENCRYPTION_KEY: str   # ← obligatoire ici
```
La variable module-level `ENCRYPTION_KEY` peut être `None` si le `.env` n'est pas encore chargé. Elle n'est plus utilisée directement mais sa présence crée une confusion.

**Correction :**
```python
# Supprimer la ligne module-level redondante :
# ENCRYPTION_KEY: str = os.getenv("ENCRYPTION_KEY")  ← SUPPRIMER

# Utiliser uniquement settings.ENCRYPTION_KEY partout dans le code
```

---

### BUG #8 — `init_db()` commentée dans `main.py`

**Fichier** : `backend/app/main.py`  
**Type** : La création automatique des tables est désactivée

**Problème :**
```python
@app.on_event("startup")
def startup():
    print("🚀 Démarrage de l'API...")
    # init_db()   ← commentée !
    print("✅ API prête !")
```
En l'état, l'API démarre sans vérifier / créer les tables. Si la DB est vide, toutes les requêtes échouent.

**Note :** Laisser `init_db()` commentée est intentionnel si vous utilisez le fichier `Database.sql` pour créer le schéma. Mais si vous voulez que l'ORM crée les tables automatiquement, décommenter :

```python
@app.on_event("startup")
def startup():
    print("🚀 Démarrage de l'API...")
    init_db()   # ← décommenter si vous n'utilisez pas Database.sql
    print("✅ API prête !")
```

**Alternative recommandée :** garder `Database.sql` comme source de vérité et laisser `init_db()` commentée.

---

### BUG #9 — `allow_origins=["*"]` + `allow_credentials=True` interdit par les navigateurs

**Fichier** : `backend/app/main.py`  
**Type** : Erreur CORS en production

**Problème :**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # ← wildcard
    allow_credentials=True,     # ← incompatible avec le wildcard !
    ...
)
```
Les navigateurs refusent `credentials: true` quand `Allow-Origin: *`. Cela cause des erreurs CORS lors des appels API depuis le frontend.

**Correction pour le développement :**
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### BUG #10 — `subject` de l'email contient du HTML

**Fichier** : `backend/app/services/email_service.py`  
**Ligne** : 30

**Problème :**
```python
subject = "<b>🛡️ SHIELD — Code de Vérification Sécurisé</b>"
```
L'objet d'un email ne supporte pas le HTML. Les balises `<b>` s'afficheront en clair dans la boîte mail.

**Correction :**
```python
subject = "🛡️ SHIELD — Code de Vérification Sécurisé"
```

---

### BUG #11 — Rôles incohérents : `_get_user_role()` retourne des chaînes en format mixte

**Fichier** : `backend/app/services/auth_service.py`  
**Type** : Incohérence causant des erreurs d'autorisation

**Problème :**
```python
def _get_user_role(self, user_id: str) -> Optional[str]:
    if agent:
        return "Agent Officiel"              # ← espaces, majuscule
    if admin:
        return "Administrateur"
    if citoyen:
        return "citoyen(ou organisation)"   # ← format bizarre
```

Dans `keys.py` et `signatures.py`, le rôle est normalisé ainsi :
```python
role = current_user.get("role", "").lower().replace(" ", "_")
if role != "agent_officiel":   # ← attend "agent_officiel"
```

"Agent Officiel" → `.lower().replace(" ", "_")` → `"agent_officiel"` ✅  
Mais "citoyen(ou organisation)" → `"citoyen(ou_organisation)"` ≠ `"citoyen"` ❌

**Correction dans `auth_service.py` :**
```python
def _get_user_role(self, user_id: str) -> Optional[str]:
    agent = self.db.query(AgentOfficiel).filter(
        AgentOfficiel.id_utilisateur == user_id
    ).first()
    if agent:
        return "agent_officiel"   # ← snake_case uniforme

    admin = self.db.query(Administrateur).filter(
        Administrateur.id_utilisateur == user_id
    ).first()
    if admin:
        return "administrateur"

    citoyen = self.db.query(Citoyen).filter(
        Citoyen.id_utilisateur == user_id
    ).first()
    if citoyen:
        return "citoyen"

    return None
```

Puis dans `keys.py` et `signatures.py`, simplifier la normalisation :
```python
# Avant
role = current_user.get("role", "").lower().replace(" ", "_")
if role != "agent_officiel":

# Après (plus simple car le rôle est déjà normalisé)
role = current_user.get("role", "")
if role != "agent_officiel":
```

---

### BUG #12 — `CommuniqueResponse` utilise `model_validate` sur un objet ORM sans `nb_signatures`/`nb_consultations`

**Fichier** : `backend/app/routes/search.py`  
**Type** : `ValidationError` Pydantic si les champs optionnels ne sont pas calculés

**Problème :**
```python
results.append(SearchResult(
    communique=CommuniqueResponse.model_validate(doc),  # doc est un ORM Communique
    score=score
))
```
`CommuniqueResponse` a des champs `nb_signatures` et `nb_consultations` marqués `Optional[int]` mais le modèle ORM `Communique` n'a pas ces propriétés → ils seront `None`, ce qui est acceptable, mais peut confondre le frontend.

**Note :** Ce n'est pas une erreur bloquante car les champs sont `Optional`. Aucune correction obligatoire, mais il est recommandé de les calculer via `len(doc.signatures)` et `len(doc.consultations)` si les relations sont chargées.

---

### BUG #13 — Table `auth_email_code` non créée dans `Database.sql`

**Fichier** : `Database.sql`  
**Type** : `ProgrammingError` à l'exécution si 2FA email est utilisé

**Problème :**  
La table `auth_email_code` est définie dans `models.py` et utilisée par `auth_service.py`, mais elle est **absente** du fichier `Database.sql`. Si vous avez créé la BD via le SQL, cette table n'existe pas.

**Correction — ajouter à `Database.sql` :**
```sql
-- Table pour les codes 2FA envoyés par email
CREATE TABLE signature_communiques_officiels.auth_email_code (
    id_code VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    id_utilisateur VARCHAR(36) NOT NULL,
    code VARCHAR(6) NOT NULL,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_expiration TIMESTAMP NOT NULL,
    est_utilise BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_email_code_utilisateur 
        FOREIGN KEY (id_utilisateur)
        REFERENCES signature_communiques_officiels.utilisateur(id_utilisateur)
        ON DELETE CASCADE
);

CREATE INDEX idx_email_code_user ON signature_communiques_officiels.auth_email_code(id_utilisateur);
CREATE INDEX idx_email_code_expiration ON signature_communiques_officiels.auth_email_code(date_expiration);
```

---

### BUG #14 — Table `utilisateur_2fa` non créée dans `Database.sql`

**Fichier** : `Database.sql`  
**Type** : `ProgrammingError` si 2FA Google Authenticator est utilisé

**Même problème que le BUG #13.** Ajouter à `Database.sql` :

```sql
-- Table pour les secrets TOTP (Google Authenticator)
CREATE TABLE signature_communiques_officiels.utilisateur_2fa (
    id_utilisateur VARCHAR(36) PRIMARY KEY,
    totp_secret VARCHAR(32) NOT NULL,
    date_activation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    est_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_2fa_utilisateur 
        FOREIGN KEY (id_utilisateur)
        REFERENCES signature_communiques_officiels.utilisateur(id_utilisateur)
        ON DELETE CASCADE
);

CREATE INDEX idx_2fa_utilisateur ON signature_communiques_officiels.utilisateur_2fa(id_utilisateur);
CREATE INDEX idx_2fa_active ON signature_communiques_officiels.utilisateur_2fa(est_active);
```

---

### BUG #15 — `search_path` non configuré dans SQLAlchemy

**Fichier** : `backend/app/core/database.py`  
**Type** : `UndefinedTableError` — SQLAlchemy cherche dans le schéma `public` par défaut

**Problème :**  
Les tables sont dans le schéma `signature_communiques_officiels`, mais SQLAlchemy ne configure pas le `search_path`. Lors de certaines requêtes, PostgreSQL peut ne pas trouver les tables si le `search_path` de l'utilisateur `magistral` est `public` par défaut.

**Correction dans `database.py` :**
```python
from sqlalchemy import event

engine = create_engine(
    DatabaseConfig.get_url(),
    echo=False,       # False en production !
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

# Configurer le search_path à chaque nouvelle connexion
@event.listens_for(engine, "connect")
def set_search_path(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("SET search_path TO signature_communiques_officiels, public")
    cursor.close()
```

**Ou** configurer directement sur le rôle PostgreSQL :
```sql
ALTER ROLE magistral SET search_path TO signature_communiques_officiels, public;
```

---

## FRONTEND — Bugs et Corrections

---

### BUG #16 — `CryptographicKey` type manque `algorithme` dans la réponse API

**Fichier** : `frontend/src/types/index.ts`  
**Type** : Champ `algorithme` sera toujours `undefined`

**Problème :**
```typescript
export interface CryptographicKey {
  id_cle: string;
  id_agent_officiel: string;
  algorithme: string;          // ← ce champ n'existe PAS dans CleCryptographiqueResponse
  cle_publique: string;
  date_creation: string;
  date_expiration?: string;
  est_active: boolean;         // ← ce champ n'existe PAS dans CleCryptographiqueResponse
}
```

L'API backend retourne (`CleCryptographiqueResponse`) : `id_cle`, `id_agent_officiel`, `cle_publique`, `date_creation`, `date_expiration`, `est_expiree`. Pas `algorithme`, pas `est_active`.

**Correction dans `types/index.ts` :**
```typescript
export interface CryptographicKey {
  id_cle: string;
  id_agent_officiel: string;
  cle_publique: string;
  date_creation: string;
  date_expiration: string;
  est_expiree?: boolean;
}
```

---

### BUG #17 — `OCRResponse` utilise `filname` (faute de frappe)

**Fichier** : `frontend/src/types/index.ts` + `backend/app/routes/ocr.py`  
**Type** : Incohérence de nommage (mais fonctionnel des deux côtés car les deux ont la même faute)

**Problème :**
```typescript
// frontend/src/types/index.ts
export interface OCRResponse {
  filname: string;        // ← "filname" au lieu de "filename"
  ...
}
```

```python
# backend/app/routes/ocr.py
return {
    "filname": file.filename,   # ← même faute dans le backend
    ...
}
```

Les deux ayant la même faute, ça fonctionne. Mais pour la maintenabilité, corriger les deux :

**Backend** (`ocr.py`) :
```python
return {
    "filename": file.filename,    # ← corriger
    "extracted_text": extracted_text,
    "message": "Contenu extrait avec succès pour indexation et recherche."
}
```

**Frontend** (`types/index.ts`) :
```typescript
export interface OCRResponse {
  filename: string;        // ← corriger
  extracted_text: string;
  message: string;
}
```

Et partout où `response.filname` est utilisé dans les pages dashboard, remplacer par `response.filename`.

---

### BUG #18 — `SearchResponse` type incompatible avec `/search/popular` et `/search/recent`

**Fichier** : `frontend/src/services/api.ts`  
**Type** : TypeScript accepte mais les données reçues ne correspondent pas

**Problème :**
```typescript
popular: (limit = 10) =>
    apiFetch<SearchResponse>(`/search/popular?limit=${limit}`),
```

Mais `/search/popular` retourne :
```json
{
  "success": true,
  "total": 5,
  "results": [{"id": "...", "titre": "...", "statut": "...", ...}]
}
```
Ce n'est **pas** une `SearchResponse` (qui a `query`, `page`, `limit`, `results: SearchResult[]`).

**Correction dans `api.ts` :**
```typescript
// Définir un type correct pour les endpoints popular/recent
export interface PopularResult {
  id: string;
  titre: string;
  statut: string;
  date_publication: string;
  nb_consultations?: number;
}

export interface SimpleListResponse {
  success: boolean;
  total: number;
  results: PopularResult[];
}

// Dans api.ts
popular: (limit = 10) =>
    apiFetch<SimpleListResponse>(`/search/popular?limit=${limit}`),

recent: (limit = 10) =>
    apiFetch<SimpleListResponse>(`/search/recent?limit=${limit}`),
```

---

### BUG #19 — Pas de route `/` ou `/dashboard` par défaut après login

**Fichier** : `frontend/src/routes/AppRouter.tsx`  
**Type** : UX — redirection correcte mais pas de route `/dashboard` explicite pour l'index

**Problème :**  
L'utilisateur connecté est redirigé vers `/dashboard` qui affiche `SearchPage`. C'est correct. Mais si un agent navigue directement vers `/dashboard/keys` sans être connecté, `ProtectedRoute` le redirige vers `/login` avec `state.from = "/dashboard/keys"`. Après connexion, il est bien renvoyé vers `/dashboard/keys`. ✅ Pas de bug bloquant ici.

---

### BUG #20 — `vite.config.ts` sans proxy → erreurs CORS en développement possible

**Fichier** : `frontend/vite.config.ts`  
**Type** : Erreurs CORS potentielles si le backend n'a pas les bons CORS configurés

**Problème :**
```typescript
export default defineConfig({
  plugins: [react()],
  // ← pas de proxy configuré
})
```

**Correction recommandée (optionnelle mais propre) :**
```typescript
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
```

Avec ce proxy, le frontend envoie les requêtes sur `localhost:5173/api/...` qui sont redirigées vers le backend, éliminant tout problème CORS en développement. Il faut alors changer le `.env` frontend :

```env
VITE_API_URL=/api
```

---

## BASE DE DONNÉES — Observations

---

### DB #1 — `communique.id_communique` sans `DEFAULT gen_random_uuid()`

**Fichier** : `Database.sql`  
**Problème :**
```sql
CREATE TABLE communique (
    id_communique VARCHAR(36) PRIMARY KEY,   -- ← pas de DEFAULT !
    ...
)
```
Contrairement à `utilisateur` et `cle_cryptographique` qui ont `DEFAULT gen_random_uuid()::text`, la table `communique` n'en a pas. Si vous insérez un communiqué sans fournir `id_communique`, PostgreSQL lèvera une erreur.

**Correction :**
```sql
CREATE TABLE signature_communiques_officiels.communique (
    id_communique VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ...
)
```

**Note :** Le modèle SQLAlchemy génère l'UUID côté Python (`default=_new_uuid`), donc ce n'est pas bloquant si vous passez toujours par l'ORM. Mais pour les insertions SQL directes, c'est nécessaire.

---

### DB #2 — `auth_otp.id_otp` sans `DEFAULT gen_random_uuid()`

**Fichier** : `Database.sql`  
**Même problème** que DB #1 pour la table `auth_otp` :
```sql
CREATE TABLE auth_otp (
    id_otp VARCHAR(36) PRIMARY KEY,   -- ← pas de DEFAULT
    ...
)
```

**Correction :**
```sql
id_otp VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text,
```

---

### DB #3 — Index sur `communique(statut)` partiel utilise une syntaxe incorrecte dans `models.py`

**Fichier** : `backend/app/models/models.py`  
**Problème :**
```python
Index(
    "idx_communique_publie",
    "statut", "date_publication",
    postgresql_where=Column("statut") == "PUBLIE",  # ← incorrect : Column() ici n'est pas lié à la table
),
```
La clause `postgresql_where` dans un `Index` déclaratif doit utiliser `text()` ou une expression de colonne correctement référencée.

**Correction :**
```python
from sqlalchemy import text

Index(
    "idx_communique_publie",
    "statut", "date_publication",
    postgresql_where=text("statut = 'PUBLIE'"),
),
```



---

## Résumé des Priorités

| # | Sévérité | Fichier | Impact |
|---|---|---|---|
| 2 | 🔴 Critique | `all_routers.py` | Routes doublées → comportement imprévisible |
| 3 | 🔴 Critique | `schemas.py` | `requires_2fa` absent → 2FA ne fonctionne pas côté client |
| 11 | 🔴 Critique | `auth_service.py` | Rôles incohérents → autorisation brisée pour citoyens |
| 13 | 🔴 Critique | `Database.sql` | Table `auth_email_code` manquante → crash 2FA email |
| 14 | 🔴 Critique | `Database.sql` | Table `utilisateur_2fa` manquante → crash 2FA TOTP |
| 15 | 🟠 Important | `database.py` | `search_path` → tables introuvables sur certaines configs |
| 6 | 🟠 Important | `signature_service.py` | Timezone mismatch → erreur de comparaison datetime |
| 9 | 🟠 Important | `main.py` | CORS wildcard + credentials → erreurs navigateur |
| 16 | 🟡 Moyen | `types/index.ts` | Champs TypeScript incorrects → undefined en runtime |
| 18 | 🟡 Moyen | `api.ts` | Type SearchResponse incorrect pour popular/recent |
| 1 | 🟢 Mineur | `keys.py` | Import en double (avertissement) |
| 4 | 🟢 Mineur | `schemas.py` | Classe dupliquée (la dernière écrase) |
| 10 | 🟢 Mineur | `email_service.py` | HTML dans le sujet email |
| 17 | 🟢 Mineur | `ocr.py` + `types` | Faute de frappe `filname` (fonctionnel mais incorrect) |
