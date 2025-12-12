from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.access_log import AccessLog
from app.models.qr_code import QRCode
from app.models.user import User
from app.services.cache_service import get_cache, set_cache


async def verify_qr_code_fast(
    qr_data: str, scanner_id: str, db: AsyncSession
) -> dict[str, str | dict[str, object] | None]:
    cache_key = f'qr:{qr_data}'
    cached = get_cache(cache_key)
    if cached:
        return cached

    qr_token = (
        await db.execute(select(QRCode).where(QRCode.code == qr_data))
    ).scalar_one_or_none()

    if not qr_token:
        result: dict[str, str | dict[str, object] | None] = {
            'status': 'denied',
            'message': 'Token not found',
            'user_info': None,
        }
        set_cache(cache_key, result, ttl_seconds=5)
        return result

    if bool(qr_token.used):
        result = {
            'status': 'denied',
            'message': 'Token already used',
            'user_info': None,
        }
        set_cache(cache_key, result, ttl_seconds=5)
        return result

    if qr_token.expires_at and qr_token.expires_at < datetime.now().replace(
        tzinfo=None
    ):
        result = {
            'status': 'expired',
            'message': 'Token expired',
            'user_info': None,
        }
        set_cache(cache_key, result, ttl_seconds=5)
        return result

    user = (
        await db.execute(select(User).where(User.id == qr_token.user_id))
    ).scalar_one_or_none()

    if not user:
        result = {
            'status': 'denied',
            'message': 'User not found',
            'user_info': None,
        }
        set_cache(cache_key, result, ttl_seconds=5)
        return result

    await db.execute(
        update(QRCode).where(QRCode.id == qr_token.id).values(used=True)
    )

    log_entry = AccessLog(
        user_id=int(user.id) if user.id else None,
        organization_id=int(qr_token.organization_id)
        if qr_token.organization_id
        else None,
        qr_code_id=int(qr_token.id) if qr_token.id else None,
        scanner_id=scanner_id,
        access_granted=True,
        reason='Access granted',
    )
    db.add(log_entry)
    await db.commit()

    result = {
        'status': 'granted',
        'message': 'Access granted',
        'user_info': {
            'id': user.id,
            'name': user.name,
            'telegram_id': user.telegram_id,
        },
    }
    set_cache(cache_key, result, ttl_seconds=5)
    return result
