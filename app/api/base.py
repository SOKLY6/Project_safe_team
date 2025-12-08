from fastapi import APIRouter

from app.api.access_log import router as access_log_router
from app.api.auth import router as auth_router
from app.api.organizations import router as orgs_router
from app.api.qr_code import router as qr_code_router
from app.api.users import router as users_router

router: APIRouter = APIRouter()
router.include_router(users_router)
router.include_router(orgs_router)
router.include_router(qr_code_router)
router.include_router(access_log_router)
router.include_router(auth_router)
