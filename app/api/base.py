from fastapi import APIRouter

from app.api.organizations import router as orgs_router
from app.api.users import router as users_router

router: APIRouter = APIRouter()
router.include_router(users_router)
router.include_router(orgs_router)
