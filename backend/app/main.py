from fastapi import FastAPI
from all_routers import router as all_routers
from app.core.database import init_db
from fastapi.middleware.cors import CORSMiddleware

# Crée l'application FastAPI
app = FastAPI(
    title="Système de Signature de Communiqués",
    description="API pour la gestion et signature des communiqués officiels",
    version="1.0.0"
)

# Initialise la base de données au démarrage
@app.on_event("startup")
def startup():
    """
    Exécuté quand l'API démarre.
    Crée les tables si elles n'existent pas.
    """
    print("🚀 Démarrage de l'API...")
    init_db()
    print("✅ API prête !")


# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(all_routers, prefix="/api")

@app.get("/")
async def root():
    return {
        "message": "Magistral fastAPI/python3.10.16",
        "endpoints": {
            "ocr_extract": "/ocr/extract (POST)",
            "docs": "/docs (GET)"
        }
    }