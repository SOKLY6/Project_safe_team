from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.access_log import AccessLog
from app.models.qr_code import QRCode
from app.models.user import User
from app.schemas.qr_code import (
    QRCodeActiveResponse,
    QRCodeCreate,
    QRCodeResponse,
)
from app.services.qr_service import (
    create_qr_code,
    get_active_qr_code,
)


router = APIRouter(prefix='/qr', tags=['QR Verification'])


@router.post('/generate/{user_id}', response_model=QRCodeResponse)
async def generate_qr(
    user_id: int,
    organization_id: int = Query(...),
    db: AsyncSession = Depends(get_db),
):
    qr_code = await create_qr_code(user_id, organization_id, db)
    if not qr_code:
        raise HTTPException(status_code=404, detail='User not found')
    return qr_code


@router.get('/active/{user_id}', response_model=QRCodeResponse)
async def get_active(user_id: int, db: AsyncSession = Depends(get_db)):
    qr_code = await get_active_qr_code(user_id, db)
    if not qr_code:
        raise HTTPException(
            status_code=404, detail='No active QR code found'
        )
    return qr_code


@router.put('/update/{qr_id}', response_model=QRCodeResponse)
async def update_qr(
    qr_id: int, qr_data: QRCodeCreate, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(QRCode).filter(QRCode.id == qr_id))
    qr_code = result.scalar_one_or_none()

    if not qr_code:
        raise HTTPException(status_code=404, detail='QR code not found')

    user_result = await db.execute(
        select(User).filter(User.id == qr_data.user_id)
    )
    user = user_result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail='User not found')

    qr_code.user_id = qr_data.user_id
    qr_code.organization_id = qr_data.organization_id

    await db.commit()
    await db.refresh(qr_code)

    return qr_code


@router.get('/verify/{token}')
async def verify_qr(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(QRCode).filter(QRCode.code == token))
    qr_token = result.scalar_one_or_none()

    if not qr_token:
        return {'status': 'denied', 'reason': 'Token not found'}

    if qr_token.used:
        log_entry = AccessLog(
            user_id=qr_token.user_id,
            organization_id=qr_token.organization_id,
            qr_code_id=qr_token.id,
            access_granted=False,
            reason='Token already used',
        )
        db.add(log_entry)
        await db.commit()
        return {'status': 'denied', 'reason': 'Token already used'}

    if qr_token.expires_at < datetime.now().replace(tzinfo=None):
        log_entry = AccessLog(
            user_id=qr_token.user_id,
            organization_id=qr_token.organization_id,
            qr_code_id=qr_token.id,
            access_granted=False,
            reason='Token expired',
        )
        db.add(log_entry)
        await db.commit()
        return {'status': 'denied', 'reason': 'Token expired'}

    user_result = await db.execute(
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
        db.add(log_entry)
        await db.commit()
        return {'status': 'denied', 'reason': 'User not found'}

    qr_token.used = True

    log_entry = AccessLog(
        user_id=user.id,
        organization_id=qr_token.organization_id,
        qr_code_id=qr_token.id,
        access_granted=True,
    )
    db.add(log_entry)
    await db.commit()

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
            QRCode.used.is_(False),
            QRCode.expires_at > datetime.now().replace(tzinfo=None),
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


@router.delete('/delete/{qr_id}')
async def delete_qr(qr_id: int, db: AsyncSession = Depends(get_db)):
    qr_code = (
        await db.execute(select(QRCode).where(QRCode.id == qr_id))
    ).scalar_one_or_none()
    if not qr_code:
        raise HTTPException(status_code=404, detail='QR code not found')

    await db.execute(delete(AccessLog).where(AccessLog.qr_code_id == qr_id))
    await db.delete(qr_code)
    await db.commit()
    return {'status': 'success', 'message': 'QR code deleted'}
