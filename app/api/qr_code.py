from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session, get_db
from app.models.access_log import AccessLog
from app.models.qr_code import QRCode
from app.models.user import User
from app.schemas.qr_code import QRCodeActiveResponse

router = APIRouter(prefix='/qr', tags=['QR Verification'])


@router.get('/verify/{token}')
async def verify_qr(token: str):
    async with async_session() as session:
        result = await session.execute(
            select(QRCode).filter(QRCode.code == token)
        )
        qr_token = result.scalar_one_or_none()

        if not qr_token:
            return {'status': 'denied', 'reason': 'Token not found'}

        if qr_token.used:
            return {'status': 'denied', 'reason': 'Token already used'}

        if qr_token.expires_at < datetime.now(timezone.utc):
            return {'status': 'denied', 'reason': 'Token expired'}

        user_result = await session.execute(
            select(User).filter(User.id == qr_token.user_id)
        )
        user = user_result.scalar_one_or_none()

        if not user:
            log_entry = AccessLog(
                user_id=qr_token.user_id,
                organization_id=qr_token.organization_id,
                qr_code_id=qr_token.id,
                access_granted=False,
                reason='User not found',
            )
            session.add(log_entry)
            await session.commit()
            return {'status': 'denied', 'reason': 'User not found'}

        qr_token.used = True

        log_entry = AccessLog(
            user_id=user.id,
            organization_id=qr_token.organization_id,
            qr_code_id=qr_token.id,
            access_granted=True,
        )
        session.add(log_entry)
        await session.commit()

        return {
            'status': 'allowed',
            'name': user.name,
            'organization_id': user.organization_id,
            'telegram_id': user.telegram_id,
        }


@router.get('/active', response_model=list[QRCodeActiveResponse])
async def get_active_qr_codes(
    organization_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(QRCode, User)
        .join(User, QRCode.user_id == User.id)
        .filter(
            QRCode.used is False,
            QRCode.expires_at > datetime.now(timezone.utc),
        )
    )

    if organization_id:
        query = query.filter(QRCode.organization_id == organization_id)

    result = await db.execute(query)
    rows = result.all()

    return [
        QRCodeActiveResponse(
            id=qr.id,
            code=qr.code,
            user_name=user.name,
            organization_id=qr.organization_id,
            created_at=qr.created_at,
            expires_at=qr.expires_at,
        )
        for qr, user in rows
    ]
