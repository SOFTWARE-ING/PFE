from fastapi import APIRouter
from app.routes.ocr import router as ocr_router
from app.routes import login, register, search

router = APIRouter()

router.include_router(ocr_router)
router.include_router(login.router)
router.include_router(register.router)
router.include_router(search.router)


