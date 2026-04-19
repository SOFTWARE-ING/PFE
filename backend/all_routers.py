"""
all_routers.py — Regroupement central de tous les routers
========================================================
Ce fichier inclut tous les endpoints de l'application.
"""

from fastapi import APIRouter

from app.routes.ocr import router as ocr_router
from app.routes.login import router as login_router
from app.routes.register import router as register_router
from app.routes.keys import router as keys_router      

router = APIRouter()

router.include_router(ocr_router)
router.include_router(login_router)
router.include_router(register_router)
router.include_router(keys_router)       

print("✅ Tous les routers ont été chargés avec succès (y compris /keys)")
