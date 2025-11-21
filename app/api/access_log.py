from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.access_log import AccessLog
from app.models.organization import Organization
from app.models.user import User
from app.utils.database import get_db

router = APIRouter(prefix='/access-logs', tags=['Access Logs'])


@router.get('/')
async def get_access_logs(
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(AccessLog, User, Organization)
        .outerjoin(User, AccessLog.user_id == User.id)
        .outerjoin(Organization, AccessLog.organization_id == Organization.id)
        .order_by(AccessLog.timestamp.desc())
        .limit(limit)
        .offset(offset)
    )

    result = await db.execute(query)
    rows = result.all()

    return [
        {
            'id': log.id,
            'timestamp': log.timestamp.isoformat(),
            'user_id': log.user_id,
            'user_name': user.name if user else None,
            'organization_id': log.organization_id,
            'organization_name': org.name if org else None,
            'qr_code_id': log.qr_code_id,
            'scanner_id': log.scanner_id,
            'access_granted': log.access_granted,
            'reason': log.reason,
        }
        for log, user, org in rows
    ]
