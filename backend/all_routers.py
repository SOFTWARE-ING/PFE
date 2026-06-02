"""
all_routers.py — Agrégateur de tous les routeurs SHIELD v3
"""
from fastapi import APIRouter

from app.routes.login          import router as login_router
from app.routes.register       import router as register_router
from app.routes.keys           import router as keys_router
from app.routes.signatures     import router as signatures_router
from app.routes.documents      import router as documents_router
from app.routes.search         import router as search_router
from app.routes.ocr            import router as ocr_router
from app.routes.admin          import router as admin_router          # NOUVEAU v3
from app.routes.password_reset import router as password_reset_router # NOUVEAU v3
from app.routes.verify import router as verify_router

router = APIRouter()

router.include_router(login_router)
router.include_router(register_router)
router.include_router(keys_router)
router.include_router(signatures_router)
router.include_router(documents_router)
router.include_router(search_router)
router.include_router(ocr_router)
router.include_router(admin_router)
router.include_router(password_reset_router)
router.include_router(verify_router)
