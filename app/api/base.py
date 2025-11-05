from fastapi import APIRouter

from app.api.health import router as health_router
from app.api.organizations import router as orgs_router
from app.api.qr_code import router as qr_code_router
from app.api.users import router as users_router

router: APIRouter = APIRouter()
router.include_router(users_router)
router.include_router(orgs_router)
router.include_router(qr_code_router)
router.include_router(health_router)
