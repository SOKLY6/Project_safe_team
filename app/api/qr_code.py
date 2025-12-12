from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.access_log import AccessLog
from app.models.qr_code import QRCode
from app.models.user import User
from app.schemas.qr_code import (
    QRCodeActiveResponse,
    QRCodeCreateRequest,
    QRCodeResponse,
    QRCodeVerify,
)
from app.services.qr_service import (
    create_qr_code,
    get_active_qr_code,
)
from app.services.scanner_service import verify_qr_code_fast
from app.services.verification_service import verify_qr_code
from app.utils.database import get_db

router = APIRouter(prefix='/qr', tags=['QR Codes'])


@router.post('/generate', response_model=QRCodeResponse)
async def generate_qr(
    request: QRCodeCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> QRCodeResponse:
    qr_code = await create_qr_code(
        request.user_id, request.organization_id, db
    )
    if not qr_code:
        raise HTTPException(status_code=404, detail='User not found')
    return qr_code


@router.get('/user/{user_id}', response_model=list[QRCodeResponse])
async def get_user_qr_codes(
    user_id: int, db: AsyncSession = Depends(get_db)
) -> list[QRCodeResponse]:
    result = await db.execute(
        select(QRCode)
        .filter(QRCode.user_id == user_id)
        .order_by(QRCode.created_at.desc())
    )
    qr_codes = result.scalars().all()
    return list(qr_codes)


@router.get('/active/{user_id}', response_model=QRCodeResponse)
async def get_active(
    user_id: int, db: AsyncSession = Depends(get_db)
) -> QRCodeResponse:
    qr_code = await get_active_qr_code(user_id, db)
    if not qr_code:
        raise HTTPException(status_code=404, detail='No active QR code found')
    return qr_code


@router.put('/update/{qr_id}', response_model=QRCodeResponse)
async def update_qr(
    qr_id: int,
    qr_data: QRCodeCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> QRCodeResponse:
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

    new_expires = (datetime.now(timezone.utc) + timedelta(minutes=1)).replace(
        tzinfo=None
    )

    await db.execute(
        update(QRCode)
        .where(QRCode.id == qr_id)
        .values(
            user_id=qr_data.user_id,
            organization_id=qr_data.organization_id,
            expires_at=new_expires,
            used=False,
        )
    )
    await db.commit()

    result = await db.execute(select(QRCode).filter(QRCode.id == qr_id))
    updated_qr = result.scalar_one()
    return updated_qr


@router.post('/verify')
async def verify_qr_endpoint(
    request: QRCodeVerify, db: AsyncSession = Depends(get_db)
) -> dict[str, str | dict[str, object] | None]:
    result: dict[str, str | dict[str, object] | None] = await verify_qr_code(
        request.qr_data, request.scanner_id, db
    )
    return result


@router.get('/active', response_model=list[QRCodeActiveResponse])
async def get_active_qr_codes(
    organization_id: int | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> list[QRCodeActiveResponse]:
    query = (
        select(QRCode, User)
        .join(User, QRCode.user_id == User.id)
        .filter(
            QRCode.used.is_(False),
            QRCode.expires_at > datetime.utcnow(),
        )
    )
    if organization_id:
        query = query.filter(QRCode.organization_id == organization_id)

    result = await db.execute(query)
    rows = result.all()

    return [
        QRCodeActiveResponse(
            id=int(qr.id) if qr.id else 0,
            code=str(qr.code) if qr.code else '',
            user_name=str(user.name) if user.name else '',
            organization_id=int(qr.organization_id)
            if qr.organization_id
            else 0,
            created_at=qr.created_at if qr.created_at else datetime.now(),
            expires_at=qr.expires_at if qr.expires_at else datetime.now(),
        )
        for qr, user in rows
    ]


@router.delete('/delete/{qr_id}')
async def delete_qr(
    qr_id: int, db: AsyncSession = Depends(get_db)
) -> dict[str, str]:
    qr_code = (
        await db.execute(select(QRCode).where(QRCode.id == qr_id))
    ).scalar_one_or_none()
    if not qr_code:
        raise HTTPException(status_code=404, detail='QR code not found')

    await db.execute(delete(AccessLog).where(AccessLog.qr_code_id == qr_id))
    await db.delete(qr_code)
    await db.commit()
    return {'status': 'success', 'message': 'QR code deleted'}


@router.post('/scanner/verify')
async def verify_qr_scanner(
    request: QRCodeVerify, db: AsyncSession = Depends(get_db)
) -> dict[str, str | dict[str, object] | None]:
    result: dict[
        str, str | dict[str, object] | None
    ] = await verify_qr_code_fast(request.qr_data, request.scanner_id, db)
    return result


legacy_router = APIRouter(prefix='/qr', tags=['QR Verification (Legacy)'])


@legacy_router.post('/verify')
async def verify_qr_endpoint_legacy(
    request: QRCodeVerify, db: AsyncSession = Depends(get_db)
) -> dict[str, str | dict[str, object] | None]:
    result: dict[str, str | dict[str, object] | None] = await verify_qr_code(
        request.qr_data, request.scanner_id, db
    )
    return result


@legacy_router.post('/scanner/verify')
async def verify_qr_scanner_legacy(
    request: QRCodeVerify, db: AsyncSession = Depends(get_db)
) -> dict[str, str | dict[str, object] | None]:
    result: dict[
        str, str | dict[str, object] | None
    ] = await verify_qr_code_fast(request.qr_data, request.scanner_id, db)
    return result
