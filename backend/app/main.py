from fastapi import FastAPI
from all_routers import router as all_routers
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="API Magistral",
    description="Backend FastAPI du projet PFE",
    version="1.0.0"
)


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
        "message": "API OCR Service",
        "endpoints": {
            "ocr_extract": "/ocr/extract (POST)",
            "docs": "/docs (GET)"
        }
    }