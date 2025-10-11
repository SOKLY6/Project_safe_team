from fastapi import APIRouter
from organization import routes_orgs
from user import routes_users

router = APIRouter()

router.include_router(routes_users.router)
router.include_router(routes_orgs.router)
