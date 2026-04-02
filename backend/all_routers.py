from fastapi import APIRouter
from app.routes.ocr import router as ocr_router

router = APIRouter()

router.include_router(ocr_router)