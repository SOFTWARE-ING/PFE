from fastapi import APIRouter

from app.routes.ocr import router as ocr_router
from app.routes import login, register, search
from app.routes.login import router as login_router
from app.routes.register import router as register_router
from app.routes.keys import router as keys_router      


router = APIRouter()

router.include_router(ocr_router)
router.include_router(login.router)
router.include_router(register.router)
router.include_router(search.router)
router.include_router(login_router)
router.include_router(register_router)
router.include_router(keys_router)
